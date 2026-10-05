import type { UserRow } from './auth';
import { HttpError, newId, nowIso, weekOf, type Env } from './util';

const previousWeekOf = (): string => weekOf(new Date(Date.now() - 7 * 86_400_000));

// ---------------------------------------------------------------------------------------------
// Friendly bets: a one-week growth race. Nothing is lost: the winner collects the stake as a prize.
// ---------------------------------------------------------------------------------------------
export const STAKES = [5, 10, 20];
interface BetRow { id: string; challenger_id: string; opponent_id: string; stake: number; status: string; week: string | null; challenger_start: number | null; opponent_start: number | null; winner_id: string | null; winner_claimed: number }
const nameOf = async (env: Env, id: string): Promise<string> => (await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(id).first<{ name: string }>())?.name ?? '?';
const equityOf = async (env: Env, id: string): Promise<number | null> =>
  (await env.DB.prepare(`SELECT equity_value FROM game_runs WHERE user_id = ? AND is_active = 1 AND status = 'playing'`).bind(id).first<{ equity_value: number | null }>())?.equity_value ?? null;

export async function offerBet(env: Env, user: UserRow, opponentId: unknown, stake: unknown) {
  const opp = String(opponentId ?? '').slice(0, 64);
  if (!opp || opp === user.id) throw new HttpError(409, 'Challenge someone else.');
  if (!STAKES.includes(stake as number)) throw new HttpError(400, 'Pick a stake of 5, 10 or 20 gems.');
  if (!(await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(opp).first())) throw new HttpError(404, 'No player has that island code.');
  const open = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM bets WHERE challenger_id = ? AND status IN ('offered', 'active')`).bind(user.id).first<{ n: number }>())?.n ?? 0;
  if (open >= 3) throw new HttpError(429, 'At most three bets at a time.');
  if (await env.DB.prepare(`SELECT 1 FROM bets WHERE ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?)) AND status IN ('offered', 'active')`).bind(user.id, opp, opp, user.id).first()) throw new HttpError(409, 'You already have a bet on with them.');
  const id = newId();
  await env.DB.prepare('INSERT INTO bets (id, challenger_id, opponent_id, stake, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, user.id, opp, stake, nowIso()).run();
  return { id };
}
export async function acceptBet(env: Env, user: UserRow, id: string) {
  const b = await env.DB.prepare(`SELECT * FROM bets WHERE id = ? AND opponent_id = ? AND status = 'offered'`).bind(id, user.id).first<BetRow>();
  if (!b) throw new HttpError(404, 'No such challenge.');
  const mine = await equityOf(env, user.id); const theirs = await equityOf(env, b.challenger_id);
  if (mine === null) throw new HttpError(409, 'Run a company to take the bet.');
  if (theirs === null) throw new HttpError(409, 'Your challenger has no company running right now.');
  const r = await env.DB.prepare(`UPDATE bets SET status = 'active', week = ?, challenger_start = ?, opponent_start = ? WHERE id = ? AND status = 'offered'`).bind(weekOf(), theirs, mine, id).run();
  if (!r.meta.changes) throw new HttpError(409, 'Someone else just answered.');
  return { ok: true };
}
export async function declineBet(env: Env, user: UserRow, id: string) {
  const r = await env.DB.prepare(`UPDATE bets SET status = 'declined' WHERE id = ? AND (opponent_id = ? OR challenger_id = ?) AND status = 'offered'`).bind(id, user.id, user.id).run();
  if (!r.meta.changes) throw new HttpError(404, 'No such challenge.');
  return { ok: true };
}
/** Settle any active bet whose week is over: the bigger growth wins; a missing company voids it. */
async function settle(env: Env, b: BetRow): Promise<void> {
  if (b.status !== 'active' || !b.week || b.week === weekOf()) return;
  const a = await equityOf(env, b.challenger_id); const o = await equityOf(env, b.opponent_id);
  if (a === null || o === null || !b.challenger_start || !b.opponent_start) { await env.DB.prepare(`UPDATE bets SET status = 'void' WHERE id = ? AND status = 'active'`).bind(b.id).run(); return; }
  const ga = a / b.challenger_start; const go = o / b.opponent_start;
  const winner = ga === go ? null : ga > go ? b.challenger_id : b.opponent_id;
  await env.DB.prepare(`UPDATE bets SET status = ?, winner_id = ? WHERE id = ? AND status = 'active'`).bind(winner ? 'settled' : 'void', winner, b.id).run();
}
export async function betsView(env: Env, user: UserRow) {
  const rows = await env.DB.prepare(
    `SELECT * FROM bets WHERE (challenger_id = ? OR opponent_id = ?) AND status IN ('offered', 'active', 'settled') ORDER BY created_at DESC LIMIT 20`,
  ).bind(user.id, user.id).all<BetRow>();
  const out = [];
  for (const raw of rows.results) {
    await settle(env, raw);
    const b = (await env.DB.prepare('SELECT * FROM bets WHERE id = ?').bind(raw.id).first<BetRow>()) ?? raw;
    if (b.status === 'void') continue;
    const mine = b.challenger_id === user.id;
    const partner = await nameOf(env, mine ? b.opponent_id : b.challenger_id);
    const myEq = await equityOf(env, user.id); const theirEq = await equityOf(env, mine ? b.opponent_id : b.challenger_id);
    const myStart = mine ? b.challenger_start : b.opponent_start; const theirStart = mine ? b.opponent_start : b.challenger_start;
    const pct = (now: number | null, start: number | null): number | null => (now !== null && start ? Math.round((now / start - 1) * 1000) / 10 : null);
    out.push({
      id: b.id, role: mine ? ('challenger' as const) : ('opponent' as const), partner, stake: b.stake, status: b.status, week: b.week,
      myGrowth: b.status === 'active' ? pct(myEq, myStart) : null, theirGrowth: b.status === 'active' ? pct(theirEq, theirStart) : null,
      won: b.status === 'settled' ? b.winner_id === user.id : null, claimable: b.status === 'settled' && b.winner_id === user.id && !b.winner_claimed,
    });
  }
  return { bets: out, stakes: STAKES };
}
export async function claimBet(env: Env, user: UserRow, id: string) {
  const b = await env.DB.prepare('SELECT * FROM bets WHERE id = ?').bind(id).first<BetRow>();
  if (!b || (b.challenger_id !== user.id && b.opponent_id !== user.id)) throw new HttpError(404, 'No such bet.');
  await settle(env, b);
  const c = await env.DB.prepare(`SELECT * FROM bets WHERE id = ?`).bind(id).first<BetRow>();
  if (!c || c.status !== 'settled' || c.winner_id !== user.id) throw new HttpError(409, 'There is no prize to claim.');
  const r = await env.DB.prepare('UPDATE bets SET winner_claimed = 1 WHERE id = ? AND winner_claimed = 0').bind(id).run();
  if (!r.meta.changes) throw new HttpError(409, 'Already claimed.');
  return { gems: c.stake };
}

// ---------------------------------------------------------------------------------------------
// Guild supply chain: four slots a week, each filled by a different member
// ---------------------------------------------------------------------------------------------
export const SLOTS = ['Materials', 'Packaging', 'Shipping', 'Marketing'];
export const SUPPLY_GEMS = 8;
export async function supplyView(env: Env, user: UserRow) {
  if (!user.guild_id) return { guild: false as const };
  const week = weekOf();
  const rows = await env.DB.prepare('SELECT slot, user_id FROM guild_supply WHERE guild_id = ? AND week = ?').bind(user.guild_id, week).all<{ slot: number; user_id: string }>();
  const slots = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const r = rows.results.find((x) => x.slot === i);
    slots.push({ slot: i, name: SLOTS[i], filledBy: r ? await nameOf(env, r.user_id) : null, mine: r?.user_id === user.id });
  }
  const full = slots.every((s) => s.filledBy);
  const mineFilled = slots.some((s) => s.mine);
  const prev = previousWeekOf();
  const prevRows = await env.DB.prepare('SELECT slot, user_id FROM guild_supply WHERE guild_id = ? AND week = ?').bind(user.guild_id, prev).all<{ slot: number; user_id: string }>();
  const prevFull = prevRows.results.length === SLOTS.length;
  const prevMine = prevRows.results.some((r) => r.user_id === user.id);
  const claimed = !!(await env.DB.prepare(`SELECT 1 FROM reward_claims WHERE user_id = ? AND kind = 'gsupply' AND period = ?`).bind(user.id, prev).first());
  return { guild: true as const, week, slots, full, mineFilled, last: prevFull && prevMine ? { week: prev, gems: SUPPLY_GEMS, claimed } : null };
}
export async function fillSlot(env: Env, user: UserRow, slot: unknown) {
  if (!user.guild_id) throw new HttpError(409, 'Join a holding company first.');
  if (!Number.isInteger(slot) || (slot as number) < 0 || (slot as number) >= SLOTS.length) throw new HttpError(400, 'Choose one of the four slots.');
  const run = await env.DB.prepare(`SELECT 1 FROM game_runs WHERE user_id = ? AND is_active = 1 AND status = 'playing'`).bind(user.id).first();
  if (!run) throw new HttpError(409, 'Run a company to supply your guild.');
  const week = weekOf();
  if (await env.DB.prepare('SELECT 1 FROM guild_supply WHERE guild_id = ? AND week = ? AND user_id = ?').bind(user.guild_id, week, user.id).first()) throw new HttpError(409, 'You already fill a slot this week.');
  const r = await env.DB.prepare('INSERT OR IGNORE INTO guild_supply (guild_id, week, slot, user_id) VALUES (?, ?, ?, ?)').bind(user.guild_id, week, slot, user.id).run();
  if (!r.meta.changes) throw new HttpError(409, 'Someone just took that slot.');
  return supplyView(env, user);
}
export async function claimSupply(env: Env, user: UserRow) {
  if (!user.guild_id) throw new HttpError(409, 'Join a holding company first.');
  const prev = previousWeekOf();
  const rows = await env.DB.prepare('SELECT user_id FROM guild_supply WHERE guild_id = ? AND week = ?').bind(user.guild_id, prev).all<{ user_id: string }>();
  if (rows.results.length < SLOTS.length) throw new HttpError(409, 'Your guild did not fill every slot last week.');
  if (!rows.results.some((r) => r.user_id === user.id)) throw new HttpError(409, 'Only members who filled a slot share the reward.');
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO reward_claims (user_id, kind, period, gems, created_at) VALUES (?, 'gsupply', ?, ?, ?)`).bind(user.id, prev, SUPPLY_GEMS, nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'Already claimed.');
  return { gems: SUPPLY_GEMS, week: prev };
}
