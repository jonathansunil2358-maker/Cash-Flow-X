/**
 * End-to-end check against a running Worker with DEV_AUTH=true (local `wrangler dev`):
 *   npm run smoke -w @cfx/api
 * Plays real games with the engine, syncs them in chunks, and exercises holding companies,
 * investments, leaderboards and tamper detection.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  applyActionInPlace, bracketFor, journalPuzzle, spotTheMistake, challengeField, ownerStakeOf, replay, compactForServer, dailyChallenge, isoWeek, newGame, prestigeCheck, RULES_VERSION, stateChecksum, tickInPlace, utcDay, valuationOf, weeklyChallenge, type Action, type GameState, type IndustryId,
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
  const init = {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', origin, ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };
  // A blocking `wrangler d1 execute` in the middle of the script can outlast the server's keep-alive: retry once on a dropped socket.
  const res = await fetch(`${base}${path}`, init).catch(() => fetch(`${base}${path}`, init));
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
  if (g.status === 'playing' && g.pendingEvent) applyActionInPlace(g, { type: 'resolveEvent', choiceId: g.pendingEvent.choices[0].id });
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

// Alice prestiges: her company carries on, Bob keeps his shares, Alice earns Legacy points on the server.
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
  check('investors keep their shares: the company carries on after prestige', hb.json.investments.holdings[0]?.status === 'accepted' && rp.json.status === 'playing', hb.json.investments);
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

// Daily challenge: the server picks the company, one attempt a day, scored when finished.
const today = dailyChallenge(utcDay());
const eve = await signUp('Eve');
const wrong = await call('/runs', { token: eve.token, body: { seed: 'NOT-TODAY', industryId: today.industryId, difficulty: 'medium', equipmentFinance: 'buy', companyName: 'x', icon: 'rocket', boosts: [], rulesVersion: RULES_VERSION, daily: true } });
check('daily: a made-up company is refused', wrong.status === 409, wrong);
const startDaily = async (token: string) => call<{ runId: string; seed: string; industryId: IndustryId; scenarioId: string; prestigeLevel: number; perks: Record<string, number> }>('/runs', {
  token, body: { seed: today.seed, industryId: today.industryId, difficulty: 'hard', equipmentFinance: 'lease', companyName: 'Cheater Ltd', icon: 'rocket', boosts: [{ id: 'rush', monthsRemaining: 24 }], rulesVersion: RULES_VERSION, daily: true },
});
const dr1 = await startDaily(eve.token);
check('daily: starts with the shared company and level rules', dr1.status === 201 && dr1.json.seed === today.seed && dr1.json.industryId === today.industryId && dr1.json.prestigeLevel === 0 && Object.keys(dr1.json.perks).length === 0, dr1);
check('daily: only one attempt a day', (await startDaily(eve.token)).status === 409);
const eveGame = newGame({ companyName: today.companyName, industryId: today.industryId, seed: today.seed, scenarioId: 'daily' });
const eveP: Player = { name: 'Eve', token: eve.token, runId: dr1.json.runId, game: eveGame, synced: 0 };
const mid = await play(eveP, 12);
const board1 = await call<{ me: { finished: boolean; status: string } | null; entries: unknown[]; challenge: { seed: string } }>('/daily', { token: eve.token });
check('daily: an unfinished run is not on the board yet', mid.status === 200 && board1.json.me?.finished === false && !(board1.json.entries as { me: boolean }[]).some((e) => e.me), board1.json);
const fin = await play(eveP, 24);
const board2 = await call<{ me: { finished: boolean; score: number; rank: number | null }; entries: { me: boolean; score: number }[] }>('/daily', { token: eve.token });
check('daily: the finished run is scored from the verified accounts', fin.status === 200 && eveP.game.status !== 'playing' && board2.json.me?.finished === true && board2.json.me.rank !== null
  && board2.json.entries.some((e) => e.me), { fin, board: board2.json, month: eveP.game.month, status: eveP.game.status });
check('daily: a past day cannot be queried in the future', (await call('/daily?day=2999-01-01', { token: eve.token })).status === 400);
check('daily: bad days are refused', (await call('/daily?day=nope', { token: eve.token })).status === 400);

// Extra challenges: standard companies keep the chosen modifiers (cleaned); Hard ignores them.
const mia = await signUp('Mia');
const modRun = await call<{ modifiers: string[] }>('/runs', { token: mia.token, body: { seed: `MODS-${tag}`, industryId: 'software', difficulty: 'easy', equipmentFinance: 'buy', companyName: 'Mod Ltd', icon: 'rocket', boosts: [], rulesVersion: RULES_VERSION, modifiers: ['slow-market', 'bogus', 'inflation'] } });
check('modifiers: known ones are kept, unknown ones dropped', modRun.status === 201 && JSON.stringify(modRun.json.modifiers) === JSON.stringify(['slow-market', 'inflation']), modRun);
const hardRun = await call<{ modifiers: string[] }>('/runs', { token: mia.token, body: { seed: `MODS2-${tag}`, industryId: 'software', difficulty: 'hard', equipmentFinance: 'buy', companyName: 'Hard Ltd', icon: 'rocket', boosts: [], rulesVersion: RULES_VERSION, modifiers: ['slow-market'] } });
check('modifiers: Hard ignores them (the server reports what the company really has)', hardRun.status === 201 && JSON.stringify(hardRun.json.modifiers) === '[]', hardRun);
const cultRun = await call<{ modifiers: string[] }>('/runs', { token: mia.token, body: { seed: `CULT-${tag}`, industryId: 'software', difficulty: 'easy', equipmentFinance: 'buy', companyName: 'Culture Ltd', icon: 'rocket', boosts: [], rulesVersion: RULES_VERSION, modifiers: ['culture-bold', 'culture-frugal', 'inflation'] } });
check('culture: only one is kept, after the extra challenges', cultRun.status === 201 && JSON.stringify(cultRun.json.modifiers) === JSON.stringify(['inflation', 'culture-frugal']), cultRun);

// Replays: the winner's decisions are kept, and re-running them reproduces the board score exactly.
const rp = await call<{ name: string; score: number; months: number; game: { seed: string; industryId: IndustryId; companyName: string; scenarioId: string }; actions: { month: number; action: Action }[] }>(`/replays/daily/${today.day}?rank=1`, { token: eve.token });
check('replay: the top daily run has its decisions saved', rp.status === 200 && rp.json.actions.length > 0 && rp.json.game.scenarioId === 'daily', rp);
if (rp.status === 200) {
  const rr = replay({ seed: rp.json.game.seed, industryId: rp.json.game.industryId, scenarioId: 'daily', companyName: rp.json.game.companyName, difficulty: 'medium', equipmentFinance: 'buy', actions: rp.json.actions, months: rp.json.months });
  check('replay: re-running the saved decisions reproduces the board score', ownerStakeOf(rr) === rp.json.score || rr.status === 'insolvent', { got: ownerStakeOf(rr), want: rp.json.score });
}
check('replay: a rank nobody holds is 404', (await call(`/replays/daily/${today.day}?rank=10`, { token: eve.token })).status === 404);
check('replay: bad kinds and ranks are refused', (await call('/replays/nope/x', { token: eve.token })).status === 400 && (await call(`/replays/daily/${today.day}?rank=0`, { token: eve.token })).status === 400);

// Duels: a challenge for two players, the third is turned away.
const dz = await signUp('Duelist');
const dy = await signUp('Opponent');
const dx = await signUp('Spectator');
const duel = await call<{ code: string; maxPlayers: number; challenge: { seed: string; industryId: IndustryId } }>('/challenges', { token: dz.token, body: { duel: true } });
check('duel: a duel code allows two players', duel.status === 201 && duel.json.maxPlayers === 2, duel);
const dField = challengeField(duel.json.code);
const startDuel = (token: string) => call('/runs', { token, body: { seed: dField.seed, industryId: dField.industryId, difficulty: 'medium', equipmentFinance: 'buy', companyName: 'x', icon: 'rocket', boosts: [], rulesVersion: RULES_VERSION, challenge: duel.json.code } });
check('duel: the first player joins', (await startDuel(dz.token)).status === 201);
check('duel: the second player joins', (await startDuel(dy.token)).status === 201);
const third = await startDuel(dx.token);
check('duel: a third player is turned away', third.status === 409 && /full/.test(String((third.json as { error?: string }).error)), third);
check('duel: the board still shows who is in it', (await call<{ maxPlayers: number }>(`/challenges/${duel.json.code}`, { token: dx.token })).json.maxPlayers === 2);

// Community goal, tournament and rival of the week.
const comm = await call<{ week: string; months: number; target: number; reached: boolean; contributed: boolean; claimed: boolean }>('/community', { token: eve.token });
check('community: verified months add up and the viewer is counted', comm.status === 200 && comm.json.months > 0 && comm.json.contributed === true && comm.json.target > 0, comm);
if (!comm.json.reached) check('community: no reward before the goal is reached', (await call('/rewards/community', { token: eve.token, body: {} })).status === 409);
check('community: someone who has not played is not counted', (await call<{ contributed: boolean }>('/community', { token: dx.token })).json.contributed === false);
const tour = await call<{ week: string; entrants: unknown[]; bracket: unknown }>('/tournament', { token: eve.token });
check('tournament: the bracket for last week can be fetched', tour.status === 200 && Array.isArray(tour.json.entrants), tour);
void bracketFor;
const riv = await call<{ week: string; you: number; rival: { name: string } | null }>('/rival', { token: eve.token });
check('rival: a rival of the week is picked from the neighbours (or none if alone)', riv.status === 200 && (riv.json.rival === null || typeof riv.json.rival.name === 'string'), riv);

// The weekly puzzle league: answers are checked by the server, once per kind per day, today only.
{
  const today = utcDay();
  const lg = await signUp('League');
  const lg2 = await signUp('League2');
  const right = spotTheMistake(today).answer;
  const wrong = spotTheMistake(today).options.find((o) => o.id !== right)!.id;
  const a1 = await call<{ correct: boolean }>('/league/answer', { token: lg.token, body: { kind: 'spot', day: today, answer: right } });
  check('league: a right answer is recognised by the server', a1.status === 200 && a1.json.correct === true, a1);
  check('league: only one answer a day per puzzle', (await call('/league/answer', { token: lg.token, body: { kind: 'spot', day: today, answer: right } })).status === 409);
  check('league: yesterday\'s puzzle cannot be answered', (await call('/league/answer', { token: lg.token, body: { kind: 'detective', day: '2020-01-01', answer: 'debt' } })).status === 400);
  check('league: unknown puzzles are refused', (await call('/league/answer', { token: lg.token, body: { kind: 'nope', day: today, answer: 'x' } })).status === 400);
  const a2 = await call<{ correct: boolean }>('/league/answer', { token: lg2.token, body: { kind: 'spot', day: today, answer: wrong } });
  check('league: a wrong answer scores nothing', a2.status === 200 && a2.json.correct === false, a2);
  const jr = journalPuzzle(today).answer;
  check('league: the accountant\'s desk is checked by the server too', (await call<{ correct: boolean }>('/league/answer', { token: lg.token, body: { kind: 'journal', day: today, answer: jr } })).json.correct === true);
  const board = await call<{ rows: { name: string; points: number; me: boolean }[]; mine: { points: number } }>('/league', { token: lg.token });
  check('league: the board lists scorers, not wrong answers, and marks you', board.status === 200 && board.json.mine.points === 2 && board.json.rows.some((r) => r.me && r.points === 2) && board.json.rows.every((r) => r.points > 0), board);
}

// Co-op links, suggestions, card gifts and the holding-company rivalry.
{
  const own = await signUp('CoopOwner');
  const pal = await signUp('CoopPal');
  const stranger = await signUp('CoopStranger');
  const adv = await call<{ code: string; role: string }>('/coop/create', { token: own.token, body: { role: 'advise' } });
  check('co-op: an owner can make an advice link', adv.status === 200 && adv.json.code.length >= 6, adv);
  check('co-op: a bad role is refused', (await call('/coop/create', { token: own.token, body: { role: 'god' } })).status === 400);
  check('co-op: you cannot join your own link', (await call('/coop/join', { token: own.token, body: { code: adv.json.code } })).status === 409);
  check('co-op: a wrong code is refused', (await call('/coop/join', { token: pal.token, body: { code: 'ZZZZZZZ' } })).status === 404);
  check('co-op: a friend joins with the code', (await call('/coop/join', { token: pal.token, body: { code: adv.json.code.toLowerCase() } })).status === 200);
  check('co-op: a stranger cannot look at the company', (await call(`/coop/${adv.json.code}/view`, { token: stranger.token })).status === 403);
  const view = await call<{ isOwner: boolean; snapshot: { owner: string } }>(`/coop/${adv.json.code}/view`, { token: pal.token });
  check('co-op: a member sees a live snapshot', view.status === 200 && view.json.isOwner === false && view.json.snapshot.owner.startsWith('CoopOwner'), view);
  const okS = await call<{ id: string }>(`/coop/${adv.json.code}/suggest`, { token: pal.token, body: { action: { type: 'setPrice', price: 4200 }, note: 'Try a bit higher <b>now</b>' } });
  check('co-op: a member can suggest a price change', okS.status === 200, okS);
  check('co-op: dangerous suggestions are refused', (await call(`/coop/${adv.json.code}/suggest`, { token: pal.token, body: { action: { type: 'dividend', amount: 100 } } })).status === 422);
  check('co-op: a non-member cannot suggest', (await call(`/coop/${adv.json.code}/suggest`, { token: stranger.token, body: { action: { type: 'setPrice', price: 100 } } })).status === 403);
  const ownerView = await call<{ suggestions: { id: string; note: string; status: string }[] }>(`/coop/${adv.json.code}/view`, { token: own.token });
  check('co-op: the owner sees the suggestion, cleaned of markup', ownerView.json.suggestions.length === 1 && !/[<>]/.test(ownerView.json.suggestions[0].note) && ownerView.json.suggestions[0].status === 'open', ownerView);
  check('co-op: only the owner can resolve it', (await call(`/coop/suggestion/${okS.json.id}/resolve`, { token: pal.token, body: { status: 'done' } })).status === 404);
  check('co-op: the owner resolves it', (await call(`/coop/suggestion/${okS.json.id}/resolve`, { token: own.token, body: { status: 'done' } })).status === 200);
  const watch = await call<{ code: string }>('/coop/create', { token: own.token, body: { role: 'watch' } });
  await call('/coop/join', { token: pal.token, body: { code: watch.json.code } });
  check('co-op: a watch-only link takes no suggestions', (await call(`/coop/${watch.json.code}/suggest`, { token: pal.token, body: { action: { type: 'setPrice', price: 100 } } })).status === 403);
  await call('/coop/create', { token: own.token, body: { role: 'watch' } });
  check('co-op: at most three links', (await call('/coop/create', { token: own.token, body: { role: 'watch' } })).status === 429);
  const mine = await call<{ mine: unknown[]; joined: unknown[] }>('/coop/mine', { token: pal.token });
  check('co-op: a friend lists what they joined', mine.json.joined.length === 2, mine);
  check('co-op: the owner can remove a link, and it stops working', (await call(`/coop/${adv.json.code}/revoke`, { token: own.token, body: {} })).status === 200 && (await call(`/coop/${adv.json.code}/view`, { token: pal.token })).status === 404);

  const gift = await call<{ code: string }>('/cards/gift', { token: own.token, body: { card: 'mentor0' } });
  check('cards: a gift code is made for a real card', gift.status === 200 && gift.json.code.length >= 6, gift);
  check('cards: unknown cards are refused', (await call('/cards/gift', { token: own.token, body: { card: 'dragon' } })).status === 400);
  check('cards: you cannot claim your own gift', (await call('/cards/claim', { token: own.token, body: { code: gift.json.code } })).status === 409);
  const got = await call<{ card: string }>('/cards/claim', { token: pal.token, body: { code: gift.json.code } });
  check('cards: a friend claims it', got.status === 200 && got.json.card === 'mentor0', got);
  check('cards: a gift can only be claimed once', (await call('/cards/claim', { token: stranger.token, body: { code: gift.json.code } })).status === 404);
  const gr = await call<{ mine: unknown }>('/guild/rival', { token: stranger.token });
  check('guild rival: someone with no holding company gets nothing', gr.status === 200 && gr.json.mine === null, gr);
}

// The plan marketplace.
const pubA = await signUp('PlanA');
const pubB = await signUp('PlanB');
const okPlan = await call<{ id: string }>('/plans', { token: pubA.token, body: { plan: { name: 'Premium push', price: 10, marketing: 150, hires: 1 } } });
check('plans: a valid plan is published', okPlan.status === 201 && !!okPlan.json.id, okPlan);
for (const bad of [{ name: '', price: 0, marketing: 100, hires: 0 }, { name: 'x', price: 99, marketing: 100, hires: 0 }, { name: 'x', price: 0, marketing: 100, hires: 99 }, 'nope', null]) {
  check(`plans: invalid plan refused (${JSON.stringify(bad).slice(0, 40)})`, (await call('/plans', { token: pubA.token, body: { plan: bad } })).status === 400);
}
const listA = await call<{ plans: { id: string; name: string; likes: number; liked: boolean; mine: boolean }[] }>('/plans?sort=new', { token: pubB.token });
check('plans: others can see it, with its author', listA.status === 200 && listA.json.plans.some((p) => p.id === okPlan.json.id && p.name === 'Premium push' && !p.mine), listA);
const lk = await call<{ liked: boolean; likes: number }>(`/plans/${okPlan.json.id}/like`, { token: pubB.token, body: {} });
check('plans: a like counts once, and un-likes on the second tap', lk.json.liked === true && lk.json.likes === 1 && (await call<{ likes: number }>(`/plans/${okPlan.json.id}/like`, { token: pubB.token, body: {} })).json.likes === 0);
check('plans: you cannot like your own', (await call(`/plans/${okPlan.json.id}/like`, { token: pubA.token, body: {} })).status === 409);
check('plans: only the author can remove it', (await call(`/plans/${okPlan.json.id}/delete`, { token: pubB.token, body: {} })).status === 404 && (await call(`/plans/${okPlan.json.id}/delete`, { token: pubA.token, body: {} })).status === 200);
check('plans: sign-in is required', (await call('/plans')).status === 401);

// Weekly event: same rules as the daily, with a twist, and a podium reward the week after.
const week = weeklyChallenge(isoWeek());
const hal = await signUp('Hal');
const startWeekly = (token: string, seed = week.seed) => call<{ runId: string; scenarioId: string; prestigeLevel: number; perks: Record<string, number> }>('/runs', {
  token, body: { seed, industryId: week.industryId, difficulty: 'hard', equipmentFinance: 'lease', companyName: 'Cheater Ltd', icon: 'rocket', boosts: [{ id: 'rush', monthsRemaining: 24 }], rulesVersion: RULES_VERSION, weekly: true },
});
check('weekly: a made-up company is refused', (await startWeekly(hal.token, 'NOT-THIS-WEEK')).status === 409);
const wr = await startWeekly(hal.token);
check('weekly: starts with the shared company and level rules', wr.status === 201 && wr.json.scenarioId === 'weekly' && wr.json.prestigeLevel === 0 && Object.keys(wr.json.perks).length === 0, wr);
check('weekly: only one attempt a week', (await startWeekly(hal.token)).status === 409);
const halP: Player = { name: 'Hal', token: hal.token, runId: wr.json.runId, game: newGame({ companyName: week.companyName, industryId: week.industryId, seed: week.seed, scenarioId: 'weekly' }), synced: 0 };
check('weekly: the twist is part of the verified company', halP.game.twist === week.twist.id && halP.game.economy.active.some((a) => a.type === 'weekly-twist'));
check('weekly: playing it is verified by replay', (await play(halP, 24)).status === 200 && halP.game.status !== 'playing');
const wb = await call<{ week: string; challenge: { twist: { id: string } }; me: { finished: boolean; rank: number | null } | null; entries: { me: boolean }[]; reward: unknown }>('/weekly', { token: hal.token });
check('weekly: the finished run is on the board with the twist shown', wb.json.week === week.week && wb.json.challenge.twist.id === week.twist.id && wb.json.me?.finished === true && wb.json.me.rank !== null && wb.json.entries.some((e) => e.me), wb.json);
check('weekly: nothing to claim before the week is over', (await call('/rewards/weekly', { token: hal.token, body: {} })).status === 409);
check('weekly: a future week is refused', (await call('/weekly?week=2999-W01', { token: hal.token })).status === 400);
check('weekly: nonsense weeks are refused', (await call('/weekly?week=nope', { token: hal.token })).status === 400);

// Friend challenges: a private code, one attempt each, the board is for people with the code.
const ivy = await signUp('Ivy');
const jo = await signUp('Jo');
const made = await call<{ code: string; challenge: { seed: string; industryId: IndustryId } }>('/challenges', { token: ivy.token, body: {} });
check('challenge: a code is made by the server', made.status === 201 && /^[A-HJ-NP-Z2-9]{6}$/.test(made.json.code), made);
const field = challengeField(made.json.code);
check('challenge: the code decides the company', made.json.challenge.seed === field.seed && made.json.challenge.industryId === field.industryId);
const startCh = (token: string, code: string, seed = field.seed) => call<{ runId: string; scenarioId: string; perks: Record<string, number> }>('/runs', {
  token, body: { seed, industryId: field.industryId, difficulty: 'hard', equipmentFinance: 'lease', companyName: 'x', icon: 'rocket', boosts: [{ id: 'rush', monthsRemaining: 24 }], rulesVersion: RULES_VERSION, challenge: code },
});
check('challenge: an unknown code is refused', (await startCh(ivy.token, 'AAAAAA')).status === 404);
check('challenge: a malformed code is refused', (await startCh(ivy.token, 'nope')).status === 400);
check('challenge: a made-up company is refused', (await startCh(ivy.token, made.json.code, 'FAKE')).status === 409);
const ir = await startCh(ivy.token, made.json.code);
check('challenge: starts on level rules', ir.status === 201 && ir.json.scenarioId === 'challenge' && Object.keys(ir.json.perks).length === 0, ir);
check('challenge: only one attempt each', (await startCh(ivy.token, made.json.code)).status === 409);
const iP: Player = { name: 'Ivy', token: ivy.token, runId: ir.json.runId, game: newGame({ companyName: 'x', industryId: field.industryId, seed: field.seed, scenarioId: 'challenge' }), synced: 0 };
check('challenge: a friend can join with the code', (await startCh(jo.token, made.json.code.toLowerCase())).status === 201);
check('challenge: playing it is verified by replay', (await play(iP, 24)).status === 200 && iP.game.status !== 'playing');
const cb = await call<{ creator: string; entries: { me: boolean }[]; me: { finished: boolean } | null }>(`/challenges/${made.json.code}`, { token: jo.token });
check('challenge: anyone with the code sees the board', cb.status === 200 && cb.json.entries.length === 1 && !cb.json.entries[0].me && cb.json.me?.finished === false, cb);
check('challenge: unknown boards are 404', (await call('/challenges/AAAAAA', { token: jo.token })).status === 404);
check('challenge: no sign-in, no board', (await call(`/challenges/${made.json.code}`)).status === 401);

// Founder titles are cosmetic, but only values from the fixed list are accepted.
check('title: a real title is accepted', (await call('/me', { token: ivy.token, method: 'PUT', body: { title: 'listed' } })).status === 200);
const meI = await call<{ user: { title: string | null } }>('/me', { token: ivy.token });
check('title: it is returned on the profile', meI.json.user.title === 'listed', meI.json.user);
const cb2 = await call<{ entries: { title: string | null }[] }>(`/challenges/${made.json.code}`, { token: jo.token });
check('title: it shows beside the name on boards', cb2.json.entries[0].title === 'listed', cb2.json);
check('title: an invented one is refused', (await call('/me', { token: ivy.token, method: 'PUT', body: { title: 'Supreme Overlord' } })).status === 400);
check('title: it can be cleared', (await call('/me', { token: ivy.token, method: 'PUT', body: { title: null } })).status === 200 && (await call<{ user: { title: string | null } }>('/me', { token: ivy.token })).json.user.title === null);

// Carrying over a company that was started on the old version of the game.
/** What the previous version stored for a company: the current state without the newer fields. */
function asOldCheckpoint(g: GameState) {
  const o = JSON.parse(JSON.stringify(compactForServer(g)));
  o.version = 3;
  for (const k of ['pay', 'trainingSpend', 'morale', 'promo', 'promoDipMonths', 'promoCooldown', 'projects', 'projectsDone']) delete o[k];
  for (const c of o.competitors) { delete c.cutMonths; delete c.normalPrice; delete c.lastLaunchYear; }
  delete o.ledger.balances.research;
  for (const h of o.history) delete h.closing.research;
  return o;
}
/** What the version before this one stored (state version 4): without sites, insurance, contracts and listing. */
function asV4Checkpoint(g: GameState) {
  const o = JSON.parse(JSON.stringify(compactForServer(g)));
  o.version = 4;
  for (const k of ['sites', 'pendingSites', 'insurance', 'contracts', 'contractOffers', 'listed', 'listedMonth', 'sentiment', 'priceHistory', 'guidance', 'twist']) delete o[k];
  delete o.ledger.balances.insurance;
  for (const h of o.history) delete h.closing.insurance;
  return o;
}
function storeOldCheckpoint(runId: string, g: GameState, shape: (g: GameState) => unknown = asOldCheckpoint) {
  const hex = Array.from(gzipSync(Buffer.from(JSON.stringify(shape(g))))).map((b) => b.toString(16).padStart(2, '0')).join('');
  const file = join(tmpdir(), `cfx-legacy-${runId}.sql`);
  writeFileSync(file, `UPDATE game_runs SET checkpoint = x'${hex}' WHERE id = '${runId}';`);
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'cash-flow-x', '--local', '--file', file], { stdio: 'ignore' });
}
const carry = (p: Player, state: unknown = compactForServer(p.game), actions = p.game.actionLog.length) =>
  call<{ actionsVerified?: number; month?: number; error?: string; code?: string }>(`/runs/${p.runId}/carryover`, { token: p.token, body: { state, actions } });
const tamper = (g: GameState, edit: (o: any) => void) => { const o = JSON.parse(JSON.stringify(compactForServer(g))); edit(o); return o; };

const fay = await signUp('Fay');
const legacy = await startRun('Fay', fay.token, 'software');
await play(legacy, 8);
const newRun = await carry(legacy);
check('carry-over: a run on the current version cannot use it', newRun.status === 409, newRun);
storeOldCheckpoint(legacy.runId, legacy.game);
// The player carries on for a few months under "old rules" that the server never saw.
for (let i = 0; i < 4; i++) { answer(legacy.game); applyPolicy(legacy.game); answer(legacy.game); tickInPlace(legacy.game); }
answer(legacy.game);
const needs = await sync(legacy);
check('carry-over: an old stored company asks to be carried over before syncing', needs.status === 409 && (needs.json as { code?: string }).code === 'CARRYOVER_REQUIRED', needs);
check('carry-over: an un-upgraded state is refused', (await carry(legacy, { ...compactForServer(legacy.game), version: 3 })).status === 422);
check('carry-over: a different company is refused', (await carry(legacy, tamper(legacy.game, (o) => { o.seedLabel = 'SOMETHING-ELSE'; }))).status === 422);
check('carry-over: unbalanced books are refused', (await carry(legacy, tamper(legacy.game, (o) => { o.ledger.balances.cash += 1000; }))).status === 422);
check('carry-over: growth real play could not produce is refused', (await carry(legacy, tamper(legacy.game, (o) => { o.ledger.balances.cash += 90_000_000_00; o.ledger.balances.shareCapital -= 90_000_000_00; }))).status === 422);
check('carry-over: unknown shareholders are refused', (await carry(legacy, tamper(legacy.game, (o) => { o.outsideHolders.push({ id: 'made-up', shares: 1, status: 'accepted' }); }))).status === 422);
check('carry-over: a month far in the future is refused', (await carry(legacy, tamper(legacy.game, (o) => { o.month += 80; }))).status === 422);
const ok = await carry(legacy);
check('carry-over: the real company is accepted', ok.status === 200 && ok.json.actionsVerified === legacy.game.actionLog.length && ok.json.month === legacy.game.month, ok);
legacy.synced = ok.json.actionsVerified ?? 0;
check('carry-over: it can only happen once', (await carry(legacy)).status === 409);
const after = await play(legacy, 14);
check('carry-over: play after it is verified by replay as normal', after.status === 200 && legacy.synced === legacy.game.actionLog.length, after);
const meF = await call<{ activeRun: { month: number } }>('/me', { token: fay.token });
check('carry-over: the server tracks the new position', meF.json.activeRun?.month === legacy.game.month, meF.json.activeRun);

// A company sold under the old prestige rules is reopened and carries on, a rank higher.
const hope = await signUp('Hope');
const sold = await startRun('Hope', hope.token, 'software');
await play(sold, 14);
const asSold = (g: GameState) => { const o = asV4Checkpoint(g); o.status = 'prestiged'; o.prestigeAward = 7; o.prestigeLevel = (o.prestigeLevel ?? 0); return o; };
storeOldCheckpoint(sold.runId, sold.game, asSold);
execFileSync('npx', ['wrangler', 'd1', 'execute', 'cash-flow-x', '--local', '--command', `UPDATE game_runs SET status = 'prestiged' WHERE id = '${sold.runId}'`], { stdio: 'ignore' });
sold.game.prestigeAward = 7;
sold.game.prestigeLevel += 1;
const wrongRank = await carry(sold, tamper(sold.game, (o) => { o.prestigeLevel += 1; }));
check('reopen: a rank that does not match the sale is refused', wrongRank.status === 422, wrongRank);
const reopened = await carry(sold);
check('reopen: the sold company carries on', reopened.status === 200 && reopened.json.month === sold.game.month, reopened);
sold.synced = reopened.json.actionsVerified ?? 0;
check('reopen: it can only happen once', (await carry(sold)).status === 409);
check('reopen: play afterwards is verified by replay', (await play(sold, 14)).status === 200 && sold.synced === sold.game.actionLog.length);

// The same, for a company stored by the version just before this one (state version 4).
const gus = await signUp('Gus');
const v4 = await startRun('Gus', gus.token, 'ecommerce');
await play(v4, 8);
storeOldCheckpoint(v4.runId, v4.game, asV4Checkpoint);
for (let i = 0; i < 3; i++) { answer(v4.game); applyPolicy(v4.game); answer(v4.game); tickInPlace(v4.game); }
answer(v4.game);
const need4 = await sync(v4);
check('carry-over v4: an older stored company asks to be carried over', need4.status === 409 && (need4.json as { code?: string }).code === 'CARRYOVER_REQUIRED', need4);
const ok4 = await carry(v4);
check('carry-over v4: the real company is accepted', ok4.status === 200 && ok4.json.month === v4.game.month, ok4);
v4.synced = ok4.json.actionsVerified ?? 0;
check('carry-over v4: play afterwards is verified', (await play(v4, 14)).status === 200 && v4.synced === v4.game.actionLog.length);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exitCode = failures ? 1 : 0;
