import { cardDef, DECOR, DIFFICULTY_IDS, HATS, INDUSTRY_IDS } from '@cfx/engine';
import type { UserRow } from './auth';
import { HttpError, newId, nowIso, type Env } from './util';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = (n = 6): string => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
const cleanCode = (v: unknown): string => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
const cleanText = (v: unknown, n: number): string => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const today = (): string => nowIso().slice(0, 10);

// ---------------------------------------------------------------------------------------------
// Visit a friend's island
// ---------------------------------------------------------------------------------------------
export const GREETINGS = ['Lovely island!', 'Great company!', 'Good luck with the next year!', 'Teach me your secrets!', 'See you in the table!', 'Keep going!'];

export async function visitIsland(env: Env, viewer: UserRow, targetId: string) {
  const u = await env.DB.prepare('SELECT id, name, icon, title, prestige_count, visibility FROM users WHERE id = ?').bind(targetId).first<{ id: string; name: string; icon: string; title: string | null; prestige_count: number; visibility: string }>();
  if (!u) throw new HttpError(404, 'No player has that island code.');
  if (u.visibility === 'hidden' && u.id !== viewer.id) throw new HttpError(403, 'This player keeps their island private.');
  const run = await env.DB.prepare(
    'SELECT company_name, industry_id, difficulty, month, status, equity_value, owner_stake FROM game_runs WHERE user_id = ? AND is_active = 1',
  ).bind(u.id).first<{ company_name: string | null; industry_id: string | null; difficulty: string | null; month: number | null; status: string | null; equity_value: number | null; owner_stake: number | null }>();
  const likes = (await env.DB.prepare('SELECT COUNT(*) AS n FROM island_likes WHERE target_id = ?').bind(u.id).first<{ n: number }>())?.n ?? 0;
  const liked = !!(await env.DB.prepare('SELECT 1 FROM island_likes WHERE target_id = ? AND from_id = ? AND day = ?').bind(u.id, viewer.id, today()).first());
  const greet = await env.DB.prepare(
    `SELECT g.text_idx, usr.name FROM island_greetings g JOIN users usr ON usr.id = g.from_id WHERE g.target_id = ? ORDER BY g.created_at DESC LIMIT 5`,
  ).bind(u.id).all<{ text_idx: number; name: string }>();
  const full = u.visibility === 'full' || u.id === viewer.id;
  return {
    id: u.id, name: u.name, icon: u.icon, title: u.title, prestige: u.prestige_count, likes, liked, self: u.id === viewer.id,
    company: run ? { name: run.company_name, sector: run.industry_id, difficulty: run.difficulty, month: run.month ?? 0, status: run.status, equityValue: full ? run.equity_value ?? 0 : null } : null,
    greetings: greet.results.map((g) => ({ from: g.name, text: GREETINGS[g.text_idx] ?? '' })),
  };
}
export async function likeIsland(env: Env, viewer: UserRow, targetId: string) {
  if (targetId === viewer.id) throw new HttpError(409, 'You cannot like your own island.');
  if (!(await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(targetId).first())) throw new HttpError(404, 'No player has that island code.');
  const res = await env.DB.prepare('INSERT OR IGNORE INTO island_likes (target_id, from_id, day) VALUES (?, ?, ?)').bind(targetId, viewer.id, today()).run();
  if (!res.meta.changes) throw new HttpError(409, 'You already liked this island today.');
  return { ok: true };
}
export async function greetIsland(env: Env, viewer: UserRow, targetId: string, idx: unknown) {
  if (targetId === viewer.id) throw new HttpError(409, 'Greet someone else.');
  if (!Number.isInteger(idx) || (idx as number) < 0 || (idx as number) >= GREETINGS.length) throw new HttpError(400, 'Pick a greeting from the list.');
  if (!(await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(targetId).first())) throw new HttpError(404, 'No player has that island code.');
  const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM island_greetings WHERE target_id = ? AND from_id = ? AND day = ?').bind(targetId, viewer.id, today()).first<{ n: number }>())?.n ?? 0;
  if (n >= 3) throw new HttpError(429, 'Three greetings a day to the same island is plenty.');
  await env.DB.prepare('INSERT INTO island_greetings (id, target_id, from_id, text_idx, day, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(newId(), targetId, viewer.id, idx, today(), nowIso()).run();
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Guild landmark: members fund it from their personal cash
// ---------------------------------------------------------------------------------------------
export const LANDMARKS = [
  { name: 'Clock tower', cost: 10_000_000 },
  { name: 'Fountain plaza', cost: 50_000_000 },
  { name: 'Grand statue', cost: 200_000_000 },
  { name: 'Skyline spire', cost: 1_000_000_000 },
];
const levelFor = (funded: number): number => LANDMARKS.filter((l) => funded >= l.cost).length;
export async function landmarkView(env: Env, user: UserRow) {
  if (!user.guild_id) return { guild: false as const };
  const row = await env.DB.prepare('SELECT funded FROM guild_landmarks WHERE guild_id = ?').bind(user.guild_id).first<{ funded: number }>();
  const funded = row?.funded ?? 0;
  const level = levelFor(funded);
  const next = LANDMARKS[level] ?? null;
  return { guild: true as const, funded, level, name: level ? LANDMARKS[level - 1].name : null, next, personalCash: user.personal_cash, levels: LANDMARKS };
}
export async function fundLandmark(env: Env, user: UserRow, amount: unknown) {
  if (!user.guild_id) throw new HttpError(409, 'Join a holding company first.');
  if (!Number.isSafeInteger(amount) || (amount as number) < 100_00) throw new HttpError(400, 'The smallest gift is £100.');
  const a = amount as number;
  if (user.personal_cash < a) throw new HttpError(409, 'Not enough personal cash. Pay yourself dividends to build it up.');
  const [debit] = await env.DB.batch([
    env.DB.prepare('UPDATE users SET personal_cash = personal_cash - ? WHERE id = ? AND personal_cash >= ?').bind(a, user.id, a),
  ]);
  if (!debit.meta.changes) throw new HttpError(409, 'Not enough personal cash.');
  await env.DB.prepare('INSERT INTO guild_landmarks (guild_id, funded) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET funded = funded + excluded.funded').bind(user.guild_id, a).run();
  return landmarkView(env, { ...user, personal_cash: user.personal_cash - a });
}

// ---------------------------------------------------------------------------------------------
// The cosmetics market (trust-based: gems live on the player's device)
// ---------------------------------------------------------------------------------------------
const itemOk = (kind: string, item: string): boolean => (kind === 'hat' ? HATS.some((h) => h.id === item) : kind === 'decor' ? DECOR.some((d) => d.id === item) : kind === 'card' ? !!cardDef(item) : false);
export const MAX_OPEN_LISTINGS = 5;
export async function listItem(env: Env, user: UserRow, body: { kind?: unknown; item?: unknown; price?: unknown }) {
  const kind = String(body.kind ?? ''); const item = String(body.item ?? '');
  if (!itemOk(kind, item)) throw new HttpError(400, 'You can sell hats, island decorations and spare cards.');
  if (!Number.isInteger(body.price) || (body.price as number) < 10 || (body.price as number) > 2000) throw new HttpError(400, 'Price between 10 and 2,000 gems.');
  const open = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM market_listings WHERE seller_id = ? AND status = 'open'`).bind(user.id).first<{ n: number }>())?.n ?? 0;
  if (open >= MAX_OPEN_LISTINGS) throw new HttpError(429, `You can have ${MAX_OPEN_LISTINGS} listings open at a time.`);
  const id = newId();
  await env.DB.prepare('INSERT INTO market_listings (id, seller_id, kind, item, price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, user.id, kind, item, body.price, 'open', nowIso()).run();
  return { id };
}
export async function marketView(env: Env, user: UserRow) {
  const open = await env.DB.prepare(
    `SELECT l.id, l.kind, l.item, l.price, u.name AS seller FROM market_listings l JOIN users u ON u.id = l.seller_id WHERE l.status = 'open' AND l.seller_id != ? ORDER BY l.created_at DESC LIMIT 30`,
  ).bind(user.id).all<{ id: string; kind: string; item: string; price: number; seller: string }>();
  const mine = await env.DB.prepare(`SELECT id, kind, item, price, status, collected FROM market_listings WHERE seller_id = ? AND status IN ('open', 'sold') ORDER BY created_at DESC LIMIT 20`).bind(user.id).all<{ id: string; kind: string; item: string; price: number; status: string; collected: number }>();
  return { open: open.results, mine: mine.results };
}
export async function buyListing(env: Env, user: UserRow, id: string) {
  const l = await env.DB.prepare(`SELECT seller_id, kind, item, price FROM market_listings WHERE id = ? AND status = 'open'`).bind(id).first<{ seller_id: string; kind: string; item: string; price: number }>();
  if (!l) throw new HttpError(404, 'That listing is gone.');
  if (l.seller_id === user.id) throw new HttpError(409, 'That is your own listing.');
  const res = await env.DB.prepare(`UPDATE market_listings SET status = 'sold', buyer_id = ? WHERE id = ? AND status = 'open'`).bind(user.id, id).run();
  if (!res.meta.changes) throw new HttpError(409, 'Someone just bought it.');
  return { kind: l.kind, item: l.item, price: l.price };
}
export async function cancelListing(env: Env, user: UserRow, id: string) {
  const res = await env.DB.prepare(`UPDATE market_listings SET status = 'cancelled' WHERE id = ? AND seller_id = ? AND status = 'open'`).bind(id, user.id).run();
  if (!res.meta.changes) throw new HttpError(404, 'No open listing like that.');
  return { ok: true };
}
/** The seller collects the gems for items that sold. */
export async function collectSales(env: Env, user: UserRow) {
  const sold = await env.DB.prepare(`SELECT id, price FROM market_listings WHERE seller_id = ? AND status = 'sold' AND collected = 0`).bind(user.id).all<{ id: string; price: number }>();
  let gems = 0;
  for (const l of sold.results) {
    const r = await env.DB.prepare('UPDATE market_listings SET collected = 1 WHERE id = ? AND collected = 0').bind(l.id).run();
    if (r.meta.changes) gems += Math.floor(l.price * 0.95);
  }
  return { gems };
}

// ---------------------------------------------------------------------------------------------
// Mentor and mentee
// ---------------------------------------------------------------------------------------------
export const MENTEE_GOAL = 10_000_000; // a £100k company
export const MENTOR_GEMS = 30;
export const MENTEE_GEMS = 20;
export async function createMentorCode(env: Env, user: UserRow) {
  if (user.prestige_count < 1 && user.legacy_earned < 1) throw new HttpError(403, 'Mentors are players who have prestiged or finished a company.');
  const open = await env.DB.prepare('SELECT code FROM mentor_links WHERE mentor_id = ? AND mentee_id IS NULL').bind(user.id).first<{ code: string }>();
  if (open) return { code: open.code };
  const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM mentor_links WHERE mentor_id = ?').bind(user.id).first<{ n: number }>())?.n ?? 0;
  if (count >= 3) throw new HttpError(429, 'You can mentor three people.');
  const code = makeCode(7);
  await env.DB.prepare('INSERT INTO mentor_links (code, mentor_id, created_at) VALUES (?, ?, ?)').bind(code, user.id, nowIso()).run();
  return { code };
}
export async function joinMentor(env: Env, user: UserRow, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const l = await env.DB.prepare('SELECT mentor_id, mentee_id FROM mentor_links WHERE code = ?').bind(code).first<{ mentor_id: string; mentee_id: string | null }>();
  if (!l || l.mentee_id) throw new HttpError(404, 'That mentor code is not valid any more.');
  if (l.mentor_id === user.id) throw new HttpError(409, 'That is your own code.');
  if (await env.DB.prepare('SELECT 1 FROM mentor_links WHERE mentee_id = ?').bind(user.id).first()) throw new HttpError(409, 'You already have a mentor.');
  const r = await env.DB.prepare('UPDATE mentor_links SET mentee_id = ? WHERE code = ? AND mentee_id IS NULL').bind(user.id, code).run();
  if (!r.meta.changes) throw new HttpError(409, 'Someone else just joined.');
  return { ok: true };
}
const bestEquity = async (env: Env, userId: string): Promise<number> =>
  (await env.DB.prepare('SELECT MAX(equity_value) AS v FROM game_runs WHERE user_id = ?').bind(userId).first<{ v: number | null }>())?.v ?? 0;
export async function mentorView(env: Env, user: UserRow) {
  const asMentor = await env.DB.prepare('SELECT code, mentee_id, mentor_claimed FROM mentor_links WHERE mentor_id = ? ORDER BY created_at DESC').bind(user.id).all<{ code: string; mentee_id: string | null; mentor_claimed: number }>();
  const asMentee = await env.DB.prepare('SELECT code, mentor_id, mentee_claimed FROM mentor_links WHERE mentee_id = ?').bind(user.id).first<{ code: string; mentor_id: string; mentee_claimed: number }>();
  const mentees = [];
  for (const m of asMentor.results) {
    if (!m.mentee_id) { mentees.push({ code: m.code, waiting: true as const }); continue; }
    const name = (await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(m.mentee_id).first<{ name: string }>())?.name ?? '?';
    const eq = await bestEquity(env, m.mentee_id);
    mentees.push({ code: m.code, waiting: false as const, name, progress: Math.min(1, eq / MENTEE_GOAL), claimable: eq >= MENTEE_GOAL && !m.mentor_claimed, claimed: !!m.mentor_claimed });
  }
  let mentor = null;
  if (asMentee) {
    const name = (await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(asMentee.mentor_id).first<{ name: string }>())?.name ?? '?';
    const eq = await bestEquity(env, user.id);
    mentor = { code: asMentee.code, name, progress: Math.min(1, eq / MENTEE_GOAL), claimable: eq >= MENTEE_GOAL && !asMentee.mentee_claimed, claimed: !!asMentee.mentee_claimed };
  }
  return { mentees, mentor, goal: MENTEE_GOAL, gems: { mentor: MENTOR_GEMS, mentee: MENTEE_GEMS } };
}
export async function claimMentor(env: Env, user: UserRow, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const l = await env.DB.prepare('SELECT mentor_id, mentee_id, mentor_claimed, mentee_claimed FROM mentor_links WHERE code = ?').bind(code).first<{ mentor_id: string; mentee_id: string | null; mentor_claimed: number; mentee_claimed: number }>();
  if (!l || !l.mentee_id) throw new HttpError(404, 'No such mentoring.');
  const isMentor = l.mentor_id === user.id; const isMentee = l.mentee_id === user.id;
  if (!isMentor && !isMentee) throw new HttpError(403, 'That is not your mentoring.');
  if (await bestEquity(env, l.mentee_id) < MENTEE_GOAL) throw new HttpError(409, 'The mentee has not built a £100k company yet.');
  const col = isMentor ? 'mentor_claimed' : 'mentee_claimed';
  const r = await env.DB.prepare(`UPDATE mentor_links SET ${col} = 1 WHERE code = ? AND ${col} = 0`).bind(code).run();
  if (!r.meta.changes) throw new HttpError(409, 'You already claimed this reward.');
  return { gems: isMentor ? MENTOR_GEMS : MENTEE_GEMS };
}

// ---------------------------------------------------------------------------------------------
// Scenario maker
// ---------------------------------------------------------------------------------------------
export const OBJECTIVES = { worth: { min: 5_000_000, max: 5_000_000_000 }, customers: { min: 100, max: 100_000 }, streak: { min: 3, max: 24 } } as const;
export async function createScenario(env: Env, user: UserRow, b: { name?: unknown; sector?: unknown; difficulty?: unknown; seed?: unknown; objective?: { kind?: unknown; value?: unknown } }) {
  const name = cleanText(b.name, 30);
  if (name.length < 3) throw new HttpError(400, 'Give the scenario a name of at least three letters.');
  if (!INDUSTRY_IDS.includes(b.sector as never)) throw new HttpError(400, 'Choose a sector.');
  if (!DIFFICULTY_IDS.includes(b.difficulty as never)) throw new HttpError(400, 'Choose a difficulty.');
  const kind = String(b.objective?.kind ?? '') as keyof typeof OBJECTIVES;
  const range = OBJECTIVES[kind];
  const value = b.objective?.value;
  if (!range || !Number.isSafeInteger(value) || (value as number) < range.min || (value as number) > range.max) throw new HttpError(400, 'That goal is out of range.');
  const mine = (await env.DB.prepare('SELECT COUNT(*) AS n FROM scenarios WHERE owner_id = ?').bind(user.id).first<{ n: number }>())?.n ?? 0;
  if (mine >= 5) throw new HttpError(429, 'You can keep five scenarios. Play them, then make more later.');
  const code = makeCode(6);
  const seed = cleanText(b.seed, 20) || `SCN-${code}`;
  await env.DB.prepare('INSERT INTO scenarios (code, owner_id, name, sector, difficulty, seed, objective_kind, objective_value, plays, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)')
    .bind(code, user.id, name, b.sector, b.difficulty, seed, kind, value, nowIso()).run();
  return { code };
}
export async function getScenario(env: Env, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const r = await env.DB.prepare('SELECT s.code, s.name, s.sector, s.difficulty, s.seed, s.objective_kind, s.objective_value, s.plays, u.name AS owner FROM scenarios s JOIN users u ON u.id = s.owner_id WHERE s.code = ?')
    .bind(code).first<{ code: string; name: string; sector: string; difficulty: string; seed: string; objective_kind: string; objective_value: number; plays: number; owner: string }>();
  if (!r) throw new HttpError(404, 'No scenario has that code.');
  return { code: r.code, name: r.name, sector: r.sector, difficulty: r.difficulty, seed: r.seed, objective: { kind: r.objective_kind, value: r.objective_value }, plays: r.plays, owner: r.owner };
}
export async function playedScenario(env: Env, user: UserRow, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO scenario_plays (code, user_id) VALUES (?, ?)').bind(code, user.id).run();
  if (ins.meta.changes) await env.DB.prepare('UPDATE scenarios SET plays = plays + 1 WHERE code = ?').bind(code).run();
  return getScenario(env, code);
}
export async function myScenarios(env: Env, user: UserRow) {
  const r = await env.DB.prepare('SELECT code, name, plays FROM scenarios WHERE owner_id = ? ORDER BY created_at DESC').bind(user.id).all<{ code: string; name: string; plays: number }>();
  return { scenarios: r.results };
}
