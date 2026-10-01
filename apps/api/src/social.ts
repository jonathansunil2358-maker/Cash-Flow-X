import { guildLevelFor } from '@cfx/engine';
import type { Env } from './util';

/**
 * Shared queries for net worth and holding company values. Net worth = your stake in your active
 * verified company + personal cash (dividends, investment returns) + stakes in other players'
 * companies at their latest verified valuation.
 */

const STAKES_SQL = `
  SELECT i.investor_id AS uid, SUM(CAST(i.shares AS REAL) * r.equity_value / r.shares_total) AS v
  FROM investments i JOIN game_runs r ON r.id = i.run_id
  WHERE i.status IN ('accepted', 'buyout-requested') AND r.status = 'playing'
  GROUP BY i.investor_id`;

export const NET_WORTH_SQL = `
  SELECT u.id, u.name, COALESCE(r.icon, u.icon) AS icon, u.guild_id, g.name AS guild_name, u.prestige_count,
         r.difficulty, r.company_name, r.industry_id,
         CAST(COALESCE(r.owner_stake, 0) + u.personal_cash + COALESCE(st.v, 0) AS INTEGER) AS net_worth
  FROM users u
  LEFT JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1 AND r.status = 'playing'
  LEFT JOIN (${STAKES_SQL}) st ON st.uid = u.id
  LEFT JOIN guilds g ON g.id = u.guild_id`;

export interface NetWorthRow {
  id: string;
  name: string;
  icon: string;
  guild_id: string | null;
  guild_name: string | null;
  prestige_count: number;
  difficulty: string | null;
  company_name: string | null;
  industry_id: string | null;
  net_worth: number;
}

export async function netWorthOf(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare(`${NET_WORTH_SQL} WHERE u.id = ?`).bind(userId).first<NetWorthRow>();
  return row?.net_worth ?? 0;
}

/** Combined valuation of a holding company: members' active verified companies. */
export async function guildValuation(env: Env, guildId: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(r.equity_value), 0) AS v FROM users u
     JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1 AND r.status = 'playing'
     WHERE u.guild_id = ?`,
  ).bind(guildId).first<{ v: number }>();
  return row?.v ?? 0;
}

/** The holding company level a user's runs may claim (0 = not a member). */
export async function guildLevelOfUser(env: Env, guildId: string | null): Promise<number> {
  if (!guildId) return 0;
  return guildLevelFor(await guildValuation(env, guildId));
}

export async function memberCount(env: Env, guildId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE guild_id = ?').bind(guildId).first<{ n: number }>();
  return row?.n ?? 0;
}

/** Offers older than 7 days lapse and the money goes back to the investor. */
export async function expireOffers(env: Env): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const stale = await env.DB.prepare(`SELECT id, investor_id, amount FROM investments WHERE status = 'offered' AND created_at < ?`)
    .bind(cutoff).all<{ id: string; investor_id: string; amount: number }>();
  if (!stale.results.length) return;
  await env.DB.batch(stale.results.flatMap((o) => [
    env.DB.prepare(`UPDATE investments SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'offered'`).bind(new Date().toISOString(), o.id),
    env.DB.prepare('UPDATE users SET personal_cash = personal_cash + ? WHERE id = ?').bind(o.amount, o.investor_id),
  ]));
}
