/**
 * End-to-end check against a running Worker with DEV_AUTH=true (local `wrangler dev`):
 *   npm run smoke -w @cfx/api
 * Plays real games with the engine, syncs them in chunks, and exercises holding companies,
 * investments, leaderboards and tamper detection.
 */
import {
  applyActionInPlace, newGame, prestigeCheck, RULES_VERSION, stateChecksum, tickInPlace, valuationOf, type Action, type GameState, type IndustryId,
} from '@cfx/engine';
import { applyPolicy } from '../../../packages/engine/scripts/policy';

const base = (process.argv[2] ?? 'http://localhost:8787').replace(/\/$/, '');
const origin = 'http://localhost:5173';
const tag = Date.now().toString(36);
let failures = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`, ok ? '' : JSON.stringify(detail)?.slice(0, 400));
  if (!ok) failures++;
}

async function call<T = Record<string, unknown>>(path: string, opts: { token?: string; body?: unknown; method?: string } = {}) {
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', origin, ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as T };
}

interface Player {
  name: string;
  token: string;
  runId: string;
  game: GameState;
  synced: number;
}

async function signUp(name: string): Promise<{ token: string }> {
  const r = await call<{ token: string }>('/auth/dev', { body: { name: `${name}-${tag}` } });
  return r.json;
}

async function startRun(name: string, token: string, industryId: IndustryId): Promise<Player> {
  const r = await call<{ runId: string; seed: string; industryId: IndustryId; difficulty: 'easy'; equipmentFinance: 'buy'; perks: Record<string, number>; boosts: []; prestigeLevel: number; companyName: string; icon: string }>(
    '/runs', { token, body: { seed: `SMOKE-${name}-${tag}`, industryId, difficulty: 'easy', equipmentFinance: 'lease', companyName: `${name} Ltd`, icon: 'rocket', boosts: [], rulesVersion: RULES_VERSION } },
  );
  const s = r.json;
  const game = newGame({ ...s, equipmentFinance: s.equipmentFinance });
  return { name, token, runId: s.runId, game, synced: 0 };
}

const answer = (g: GameState) => {
  if (g.pendingEvent) applyActionInPlace(g, { type: 'resolveEvent', choiceId: g.pendingEvent.choices[0].id });
};

async function sync(p: Player, overrideChecksum?: string) {
  const actions = p.game.actionLog.slice(p.synced) as { month: number; action: Action }[];
  const r = await call<{ actionsVerified: number; status: string; error?: string; resendFrom?: number }>(`/runs/${p.runId}/sync`, {
    token: p.token, body: { fromAction: p.synced, actions, month: p.game.month, checksum: overrideChecksum ?? stateChecksum(p.game) },
  });
  if (r.status === 200) p.synced = r.json.actionsVerified;
  return r;
}

async function play(p: Player, months: number) {
  for (let i = 0; i < months && p.game.status === 'playing'; i++) {
    answer(p.game);
    applyPolicy(p.game);
    answer(p.game);
    tickInPlace(p.game);
    if (p.game.month % 12 === 0) {
      answer(p.game);
      const r = await sync(p);
      if (r.status !== 200) return r;
    }
  }
  answer(p.game);
  return sync(p);
}

const health = await call<{ ok: boolean; devAuth: boolean }>('/health');
check('health endpoint (dev auth on)', health.status === 200 && health.json.devAuth, health);
check('protected routes need sign-in', (await call('/me')).status === 401);

const alice = await signUp('Alice');
const bob = await signUp('Bob');
const carol = await signUp('Carol');
check('dev sign-in issues sessions', !!alice.token && !!bob.token && !!carol.token);

const stale = await call('/runs', { token: alice.token, body: { seed: 'X', industryId: 'software', difficulty: 'easy', equipmentFinance: 'buy', rulesVersion: 1 } });
check('outdated clients are told to update', stale.status === 409, stale);

// Alice grows a software company for six years, syncing yearly, then prestiges.
const a = await startRun('Alice', alice.token, 'software');
const ra = await play(a, 72);
check('six years sync in yearly chunks', ra.status === 200 && a.synced === a.game.actionLog.length, ra);
const meA = await call<{ user: { legacyPoints: number; personalCash: number }; activeRun: { month: number } }>('/me', { token: alice.token });
check('server tracks the verified month', meA.json.activeRun?.month === a.game.month, meA.json.activeRun);

// Out-of-sync batches are rejected with the server's position.
const dup = await call<{ resendFrom: number }>(`/runs/${a.runId}/sync`, { token: alice.token, body: { fromAction: 0, actions: [], month: a.game.month, checksum: stateChecksum(a.game) } });
check('stale batch → 409 with resend position', dup.status === 409 && dup.json.resendFrom === a.synced, dup);

// Holding company: Alice founds, Bob joins.
const g = await call<{ id: string }>('/guilds', { token: alice.token, body: { name: `Smoke Holdings ${tag}`, icon: 'crown' } });
check('create holding company', g.status === 201, g);
check('join holding company', (await call(`/guilds/${g.json.id}/join`, { token: bob.token, body: {} })).status === 200);

// Bob builds personal cash: play, pay a dividend, sync.
const b = await startRun('Bob', bob.token, 'software');
await play(b, 60);
const div = 20_000_00;
applyActionInPlace(b.game, { type: 'payDividend', amount: div });
const rb = await sync(b);
const meB = await call<{ user: { personalCash: number } }>('/me', { token: bob.token });
check('owner dividends become personal cash', rb.status === 200 && meB.json.user.personalCash === b.game.ownerDividends, { rb, cash: meB.json.user.personalCash });

// Bob offers to invest in Alice's company; Alice accepts in her game and syncs.
const aliceId = (await call<{ user: { id: string } }>('/me', { token: alice.token })).json.user.id;
const bobId = (await call<{ user: { id: string } }>('/me', { token: bob.token })).json.user.id;
const outsider = await call('/investments', { token: carol.token, body: { investeeId: aliceId, amount: 10_000_00 } });
check('non-members cannot invest', outsider.status === 403, outsider);
const offer2 = await call<{ id: string; amount: number; preMoney: number }>('/investments', { token: bob.token, body: { investeeId: aliceId, amount: 10_000_00 } });
check('member can offer an investment', offer2.status === 201, offer2);
const escrow = await call<{ user: { personalCash: number } }>('/me', { token: bob.token });
check('offer money is held from personal cash', escrow.json.user.personalCash === b.game.ownerDividends - 10_000_00, escrow.json.user);
applyActionInPlace(a.game, { type: 'acceptInvestment', investmentId: offer2.json.id, investorId: bobId, investorName: 'Bob', amount: offer2.json.amount, preMoney: offer2.json.preMoney });
const acc = await sync(a);
const holdings = await call<{ investments: { holdings: { status: string; value: number }[] } }>('/me', { token: bob.token });
check('investment accepted and valued', acc.status === 200 && holdings.json.investments.holdings[0]?.status === 'accepted' && holdings.json.investments.holdings[0].value > 0, { acc, h: holdings.json.investments });

// Holding company perks: Alice claims her real level; a higher claim is refused.
const detail = await call<{ level: number; members: unknown[] }>(`/guilds/${g.json.id}`, { token: alice.token });
check('holding company lists both members', detail.json.members.length === 2, detail);

// Alice prestiges: Bob is bought out, Alice earns Legacy points on the server.
for (let i = 0; i < 24 && !prestigeCheck(a.game).eligible; i++) { answer(a.game); applyPolicy(a.game); answer(a.game); tickInPlace(a.game); }
answer(a.game);
if (prestigeCheck(a.game).eligible) {
  const pts = prestigeCheck(a.game).points;
  applyActionInPlace(a.game, { type: 'prestige' });
  // Sync in ≤36-month steps is handled by play(); here the gap is small.
  const rp = await sync(a);
  const after = await call<{ user: { legacyPoints: number; prestigeCount: number } }>('/me', { token: alice.token });
  check('prestige is verified and awards Legacy points', rp.status === 200 && after.json.user.prestigeCount === 1 && after.json.user.legacyPoints === pts, { rp, u: after.json.user });
  const hb = await call<{ investments: { holdings: { status: string; buyout: number }[] } }>('/me', { token: bob.token });
  check('investor bought out at valuation on prestige', hb.json.investments.holdings[0]?.status === 'bought-out' && hb.json.investments.holdings[0].buyout > 0, hb.json.investments);
  const perk = await call('/me/perks', { token: alice.token, body: { perkId: 'fin_loans' } });
  check('perk bought with server Legacy points', perk.status === 200, perk);
} else {
  check('Alice reached prestige', false, valuationOf(a.game).equityValue);
}

// Leaderboards.
for (const board of ['networth', 'prestige', 'guilds']) {
  const lb = await call<{ entries: { name: string; value: number }[] }>(`/leaderboards/${board}?period=season`, { token: bob.token });
  check(`${board} leaderboard lists entries`, lb.status === 200 && lb.json.entries.length > 0, lb);
}

// Tamper detection: Carol claims a different result.
const c = await startRun('Carol', carol.token, 'clothing');
for (let i = 0; i < 6; i++) { answer(c.game); applyPolicy(c.game); answer(c.game); tickInPlace(c.game); }
answer(c.game);
const bad = await sync(c, 'deadbeef');
check('mismatched checksum flags the run', bad.status === 422, bad);
const lbAll = await call<{ entries: { name: string }[] }>('/leaderboards/networth?period=all', { token: carol.token });
const carolRow = lbAll.json.entries.find((e) => e.name.startsWith('Carol'));
check('flagged run no longer counts', !carolRow || (carolRow as { value?: number }).value === 0, carolRow);

// Fake holding company level.
const d = await signUp('Dan');
const dr = await startRun('Dan', d.token, 'software');
applyActionInPlace(dr.game, { type: 'setGuildLevel', level: 5 });
const fake = await sync(dr);
check('claiming a holding company level you do not have is refused', fake.status === 422, fake);

// Leaving a holding company.
check('member can leave', (await call('/guild/leave', { token: bob.token, body: {} })).status === 200);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exitCode = failures ? 1 : 0;
