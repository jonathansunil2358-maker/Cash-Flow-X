import type { UserRow } from './auth';
import { HttpError, newId, nowIso, weekOf, type Env } from './util';
import { pointsFor } from './social5';

const today = (): string => nowIso().slice(0, 10);
const previousWeekOf = (): string => weekOf(new Date(Date.now() - 7 * 86_400_000));

// ---------------------------------------------------------------------------------------------
// Supplier deals: one player supplies another for four weeks, and both claim a little each week
// ---------------------------------------------------------------------------------------------
export const DEAL_DAYS = 28;
export const DEAL_GEMS = 5;
export const MAX_OPEN_OFFERS = 3;
interface DealRow { id: string; supplier_id: string; buyer_id: string; status: string; created_at: string; started_at: string | null; supplier_week: string | null; buyer_week: string | null }
const expired = (d: DealRow): boolean => d.status === 'active' && !!d.started_at && Date.now() - Date.parse(d.started_at) > DEAL_DAYS * 86_400_000;
const nameOf = async (env: Env, id: string): Promise<string> => (await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(id).first<{ name: string }>())?.name ?? '?';

export async function offerDeal(env: Env, user: UserRow, buyerId: unknown) {
  const buyer = String(buyerId ?? '').slice(0, 64);
  if (!buyer || buyer === user.id) throw new HttpError(409, 'Offer a deal to someone else.');
  if (!(await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(buyer).first())) throw new HttpError(404, 'No player has that island code.');
  const open = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM supply_deals WHERE supplier_id = ? AND status IN ('offered', 'active')`).bind(user.id).first<{ n: number }>())?.n ?? 0;
  if (open >= MAX_OPEN_OFFERS) throw new HttpError(429, `At most ${MAX_OPEN_OFFERS} deals at a time.`);
  if (await env.DB.prepare(`SELECT 1 FROM supply_deals WHERE supplier_id = ? AND buyer_id = ? AND status IN ('offered', 'active')`).bind(user.id, buyer).first()) throw new HttpError(409, 'You already have a deal with them.');
  const id = newId();
  await env.DB.prepare('INSERT INTO supply_deals (id, supplier_id, buyer_id, status, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, user.id, buyer, 'offered', nowIso()).run();
  return { id };
}
export async function dealsView(env: Env, user: UserRow) {
  const rows = await env.DB.prepare(
    `SELECT * FROM supply_deals WHERE (supplier_id = ? OR buyer_id = ?) AND status IN ('offered', 'active') ORDER BY created_at DESC LIMIT 20`,
  ).bind(user.id, user.id).all<DealRow>();
  const week = weekOf();
  const out = [];
  for (const d of rows.results) {
    if (expired(d)) { await env.DB.prepare(`UPDATE supply_deals SET status = 'ended' WHERE id = ? AND status = 'active'`).bind(d.id).run(); continue; }
    const asSupplier = d.supplier_id === user.id;
    const mine = asSupplier ? d.supplier_week : d.buyer_week;
    const left = d.started_at ? Math.max(0, Math.ceil((DEAL_DAYS * 86_400_000 - (Date.now() - Date.parse(d.started_at))) / 86_400_000)) : null;
    out.push({ id: d.id, role: asSupplier ? ('supplier' as const) : ('buyer' as const), partner: await nameOf(env, asSupplier ? d.buyer_id : d.supplier_id), status: d.status, daysLeft: left, claimable: d.status === 'active' && mine !== week, gems: DEAL_GEMS });
  }
  return { deals: out };
}
export async function acceptDeal(env: Env, user: UserRow, id: string) {
  const r = await env.DB.prepare(`UPDATE supply_deals SET status = 'active', started_at = ? WHERE id = ? AND buyer_id = ? AND status = 'offered'`).bind(nowIso(), id, user.id).run();
  if (!r.meta.changes) throw new HttpError(404, 'No such offer.');
  return { ok: true };
}
export async function declineDeal(env: Env, user: UserRow, id: string) {
  const r = await env.DB.prepare(`UPDATE supply_deals SET status = 'declined' WHERE id = ? AND (buyer_id = ? OR supplier_id = ?) AND status = 'offered'`).bind(id, user.id, user.id).run();
  if (!r.meta.changes) throw new HttpError(404, 'No such offer.');
  return { ok: true };
}
export async function claimDeal(env: Env, user: UserRow, id: string) {
  const d = await env.DB.prepare('SELECT * FROM supply_deals WHERE id = ?').bind(id).first<DealRow>();
  if (!d || d.status !== 'active' || (d.supplier_id !== user.id && d.buyer_id !== user.id)) throw new HttpError(404, 'No such deal.');
  if (expired(d)) { await env.DB.prepare(`UPDATE supply_deals SET status = 'ended' WHERE id = ?`).bind(id).run(); throw new HttpError(409, 'That deal has ended.'); }
  const run = await env.DB.prepare(`SELECT 1 FROM game_runs WHERE user_id = ? AND is_active = 1 AND status = 'playing'`).bind(user.id).first();
  if (!run) throw new HttpError(409, 'Run a company to collect from a deal.');
  const col = d.supplier_id === user.id ? 'supplier_week' : 'buyer_week';
  const r = await env.DB.prepare(`UPDATE supply_deals SET ${col} = ? WHERE id = ? AND (${col} IS NULL OR ${col} != ?)`).bind(weekOf(), id, weekOf()).run();
  if (!r.meta.changes) throw new HttpError(409, 'You already collected this week.');
  return { gems: DEAL_GEMS };
}

// ---------------------------------------------------------------------------------------------
// The weekly co-op boss: everyone chips away at one health bar
// ---------------------------------------------------------------------------------------------
export const BOSS_GOAL = 150;
export const BOSS_GEMS = 10;
export const BOSS_MIN_DAYS = 3;
const BOSSES = ['The Red-Tape Dragon', 'Inflation Kraken', 'The Late-Invoice Ghost', 'Supply-Chain Hydra', 'Mr Audit'];
export const bossOf = (week: string): string => { let h = 0; for (const c of week) h = (h * 31 + c.charCodeAt(0)) >>> 0; return BOSSES[h % BOSSES.length]; };
async function totals(env: Env, week: string, userId: string) {
  const total = (await env.DB.prepare('SELECT COALESCE(SUM(pts), 0) AS n FROM boss_hits WHERE week = ?').bind(week).first<{ n: number }>())?.n ?? 0;
  const mine = await env.DB.prepare('SELECT COUNT(*) AS days, COALESCE(SUM(pts), 0) AS pts FROM boss_hits WHERE week = ? AND user_id = ?').bind(week, userId).first<{ days: number; pts: number }>();
  const fighters = (await env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM boss_hits WHERE week = ?').bind(week).first<{ n: number }>())?.n ?? 0;
  return { total, days: mine?.days ?? 0, pts: mine?.pts ?? 0, fighters };
}
export async function bossView(env: Env, user: UserRow) {
  const week = weekOf(); const prev = previousWeekOf();
  const now = await totals(env, week, user.id);
  const last = await totals(env, prev, user.id);
  const hitToday = !!(await env.DB.prepare('SELECT 1 FROM boss_hits WHERE week = ? AND user_id = ? AND day = ?').bind(week, user.id, today()).first());
  const claimed = !!(await env.DB.prepare(`SELECT 1 FROM reward_claims WHERE user_id = ? AND kind = 'boss' AND period = ?`).bind(user.id, prev).first());
  const beaten = last.total >= BOSS_GOAL;
  return {
    week, boss: bossOf(week), goal: BOSS_GOAL, damage: now.total, fighters: now.fighters, mine: now.pts, myDays: now.days, hitToday,
    last: beaten || last.total > 0 ? { week: prev, boss: bossOf(prev), beaten, myDays: last.days, reward: beaten && last.days >= BOSS_MIN_DAYS ? { gems: BOSS_GEMS, claimed } : null } : null,
  };
}
export async function hitBoss(env: Env, user: UserRow) {
  const run = await env.DB.prepare(`SELECT equity_value FROM game_runs WHERE user_id = ? AND is_active = 1 AND status = 'playing'`).bind(user.id).first<{ equity_value: number | null }>();
  if (!run) throw new HttpError(409, 'Run a company to join the fight.');
  const r = await env.DB.prepare('INSERT OR IGNORE INTO boss_hits (week, user_id, day, pts) VALUES (?, ?, ?, ?)').bind(weekOf(), user.id, today(), pointsFor(run.equity_value ?? 0)).run();
  if (!r.meta.changes) throw new HttpError(409, 'You already struck today.');
  return bossView(env, user);
}
export async function claimBoss(env: Env, user: UserRow) {
  const prev = previousWeekOf();
  const t = await totals(env, prev, user.id);
  if (t.total < BOSS_GOAL) throw new HttpError(409, 'The boss was not beaten last week.');
  if (t.days < BOSS_MIN_DAYS) throw new HttpError(409, `You need to strike on ${BOSS_MIN_DAYS} different days to share the reward.`);
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO reward_claims (user_id, kind, period, gems, created_at) VALUES (?, 'boss', ?, ?, ?)`).bind(user.id, prev, BOSS_GEMS, nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'Already claimed.');
  return { gems: BOSS_GEMS, week: prev };
}
