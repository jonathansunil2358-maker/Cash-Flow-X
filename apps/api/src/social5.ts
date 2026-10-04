import type { UserRow } from './auth';
import { HttpError, nowIso, weekOf, type Env } from './util';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = (n = 6): string => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
const cleanCode = (v: unknown): string => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
const today = (): string => nowIso().slice(0, 10);
const previousWeekOf = (): string => weekOf(new Date(Date.now() - 7 * 86_400_000));

// ---------------------------------------------------------------------------------------------
// Joint ventures: two players build something together for a week
// ---------------------------------------------------------------------------------------------
export const VENTURE_GOAL = 12;
export const VENTURE_GEMS = 40;
interface VentureRow { code: string; week: string; owner_id: string; partner_id: string | null; owner_pts: number; partner_pts: number; owner_claimed: number; partner_claimed: number }

/** A company's size sets what a day's work adds: 1, 3 or 5 points. */
export const pointsFor = (equityValue: number): number => (equityValue >= 100_000_000 ? 5 : equityValue >= 10_000_000 ? 3 : 1);

async function nameOf(env: Env, id: string | null): Promise<string | null> {
  if (!id) return null;
  return (await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(id).first<{ name: string }>())?.name ?? null;
}
async function shape(env: Env, v: VentureRow, user: UserRow) {
  const mine = v.owner_id === user.id;
  const total = v.owner_pts + v.partner_pts;
  const done = total >= VENTURE_GOAL;
  const myPts = mine ? v.owner_pts : v.partner_pts;
  // Gems are shared by contribution, never less than a quarter of the pot.
  const share = total > 0 ? Math.min(0.75, Math.max(0.25, myPts / total)) : 0.5;
  const contributed = !!(await env.DB.prepare('SELECT 1 FROM venture_days WHERE code = ? AND user_id = ? AND day = ?').bind(v.code, user.id, today()).first());
  return {
    code: v.code, week: v.week, partner: await nameOf(env, mine ? v.partner_id : v.owner_id), waiting: !v.partner_id,
    points: total, goal: VENTURE_GOAL, mine: myPts, theirs: total - myPts, done, contributedToday: contributed,
    reward: done ? { gems: Math.round(VENTURE_GEMS * 2 * share), claimed: !!(mine ? v.owner_claimed : v.partner_claimed) } : null,
  };
}
async function currentFor(env: Env, user: UserRow): Promise<VentureRow | null> {
  return env.DB.prepare('SELECT * FROM joint_ventures WHERE week = ? AND (owner_id = ? OR partner_id = ?) LIMIT 1').bind(weekOf(), user.id, user.id).first<VentureRow>();
}
export async function ventureView(env: Env, user: UserRow) {
  const v = await currentFor(env, user);
  return { week: weekOf(), venture: v ? await shape(env, v, user) : null, goal: VENTURE_GOAL };
}
export async function createVenture(env: Env, user: UserRow) {
  if (await currentFor(env, user)) throw new HttpError(409, 'You already have a joint venture this week.');
  const code = makeCode(6);
  await env.DB.prepare('INSERT INTO joint_ventures (code, week, owner_id, created_at) VALUES (?, ?, ?, ?)').bind(code, weekOf(), user.id, nowIso()).run();
  return { code };
}
export async function joinVenture(env: Env, user: UserRow, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const v = await env.DB.prepare('SELECT * FROM joint_ventures WHERE code = ?').bind(code).first<VentureRow>();
  if (!v || v.week !== weekOf() || v.partner_id) throw new HttpError(404, 'That venture code is not valid any more.');
  if (v.owner_id === user.id) throw new HttpError(409, 'That is your own venture.');
  if (await currentFor(env, user)) throw new HttpError(409, 'You already have a joint venture this week.');
  const r = await env.DB.prepare('UPDATE joint_ventures SET partner_id = ? WHERE code = ? AND partner_id IS NULL').bind(user.id, code).run();
  if (!r.meta.changes) throw new HttpError(409, 'Someone else just joined.');
  return { ok: true };
}
export async function contributeVenture(env: Env, user: UserRow) {
  const v = await currentFor(env, user);
  if (!v || !v.partner_id) throw new HttpError(409, 'You need a partner in a venture first.');
  if (v.owner_pts + v.partner_pts >= VENTURE_GOAL) throw new HttpError(409, 'The venture has already reached its goal.');
  const run = await env.DB.prepare(`SELECT equity_value FROM game_runs WHERE user_id = ? AND is_active = 1 AND status = 'playing'`).bind(user.id).first<{ equity_value: number | null }>();
  if (!run) throw new HttpError(409, 'Run a company to put work into the venture.');
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO venture_days (code, user_id, day) VALUES (?, ?, ?)').bind(v.code, user.id, today()).run();
  if (!ins.meta.changes) throw new HttpError(409, 'You already worked on it today.');
  const pts = pointsFor(run.equity_value ?? 0);
  const col = v.owner_id === user.id ? 'owner_pts' : 'partner_pts';
  await env.DB.prepare(`UPDATE joint_ventures SET ${col} = ${col} + ? WHERE code = ?`).bind(pts, v.code).run();
  return ventureView(env, user);
}
export async function claimVenture(env: Env, user: UserRow) {
  const v = await currentFor(env, user);
  if (!v) throw new HttpError(404, 'No venture this week.');
  const s = await shape(env, v, user);
  if (!s.done || !s.reward) throw new HttpError(409, 'The venture has not reached its goal yet.');
  const col = v.owner_id === user.id ? 'owner_claimed' : 'partner_claimed';
  const r = await env.DB.prepare(`UPDATE joint_ventures SET ${col} = 1 WHERE code = ? AND ${col} = 0`).bind(v.code).run();
  if (!r.meta.changes) throw new HttpError(409, 'You already claimed this reward.');
  return { gems: s.reward.gems };
}

// ---------------------------------------------------------------------------------------------
// Guild trade wars: each week every guild is paired with another and the bigger profit wins
// ---------------------------------------------------------------------------------------------
export const WAR_GEMS = 15;
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
interface GuildLite { id: string; name: string; icon: string; profit: number }
async function guildsForWeek(env: Env, week: string): Promise<GuildLite[]> {
  const rows = await env.DB.prepare(
    `SELECT g.id, g.name, g.icon, COALESCE(w.profit, 0) AS profit FROM guilds g LEFT JOIN guild_weekly w ON w.guild_id = g.id AND w.week = ?
     WHERE EXISTS (SELECT 1 FROM users u WHERE u.guild_id = g.id)`,
  ).bind(week).all<GuildLite>();
  return rows.results;
}
/** Sorted by a hash of the week, then paired 1-2, 3-4... An odd guild out gets a bye (no opponent). */
export function pairings(week: string, ids: string[]): Map<string, string | null> {
  const order = [...ids].sort((a, b) => hash(`${week}:${a}`) - hash(`${week}:${b}`) || a.localeCompare(b));
  const out = new Map<string, string | null>();
  for (let i = 0; i < order.length; i += 2) {
    const a = order[i]; const b = order[i + 1] ?? null;
    out.set(a, b); if (b) out.set(b, a);
  }
  return out;
}
async function warFor(env: Env, guildId: string, week: string) {
  const list = await guildsForWeek(env, week);
  const pair = pairings(week, list.map((g) => g.id));
  const mine = list.find((g) => g.id === guildId);
  if (!mine) return null;
  const oppId = pair.get(guildId) ?? null;
  const opp = oppId ? list.find((g) => g.id === oppId) ?? null : null;
  return { week, mine, opp, leading: opp ? mine.profit > opp.profit : null, won: opp ? mine.profit > opp.profit : false };
}
export async function warView(env: Env, user: UserRow) {
  if (!user.guild_id) return { guild: false as const };
  const week = weekOf(); const prev = previousWeekOf();
  const now = await warFor(env, user.guild_id, week);
  const last = await warFor(env, user.guild_id, prev);
  const claimed = !!(await env.DB.prepare(`SELECT 1 FROM reward_claims WHERE user_id = ? AND kind = 'war' AND period = ?`).bind(user.id, prev).first());
  const shapeG = (g: GuildLite | null) => (g ? { name: g.name, icon: g.icon, profit: g.profit } : null);
  return {
    guild: true as const,
    now: now ? { week, mine: shapeG(now.mine), opponent: shapeG(now.opp), leading: now.leading } : null,
    last: last && last.opp && last.mine.profit !== last.opp.profit ? { week: prev, mine: shapeG(last.mine), opponent: shapeG(last.opp), won: last.won, reward: last.won ? { gems: WAR_GEMS, claimed } : null } : null,
  };
}
export async function claimWar(env: Env, user: UserRow) {
  if (!user.guild_id) throw new HttpError(409, 'Join a holding company first.');
  const prev = previousWeekOf();
  const last = await warFor(env, user.guild_id, prev);
  if (!last?.opp || !last.won) throw new HttpError(409, 'Your guild did not win last week.');
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO reward_claims (user_id, kind, period, gems, created_at) VALUES (?, 'war', ?, ?, ?)`).bind(user.id, prev, WAR_GEMS, nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'Already claimed.');
  return { gems: WAR_GEMS, week: prev };
}
