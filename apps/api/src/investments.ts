import { MAX_OUTSIDE_SHARE } from '@cfx/engine';
import type { UserRow } from './auth';
import { HttpError, newId, nowIso, type Env } from './util';

const MIN_INVESTMENT = 1_000_00;

/**
 * Offer to buy new shares in a fellow member's company at its latest verified valuation. The
 * money leaves the investor's personal cash now (held until the owner accepts or declines).
 */
export async function offerInvestment(env: Env, user: UserRow, body: { investeeId?: unknown; amount?: unknown }) {
  const amount = body.amount;
  if (typeof body.investeeId !== 'string' || !Number.isInteger(amount) || (amount as number) < MIN_INVESTMENT) {
    throw new HttpError(400, 'Invest at least £1,000.');
  }
  if (body.investeeId === user.id) throw new HttpError(400, 'You cannot invest in your own company.');
  if (!user.guild_id) throw new HttpError(403, 'Join a holding company to invest in other members.');
  const target = await env.DB.prepare(
    `SELECT u.id, u.guild_id, r.id AS run_id, r.equity_value, r.shares_total, r.status FROM users u
     JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1 WHERE u.id = ?`,
  ).bind(body.investeeId).first<{ id: string; guild_id: string | null; run_id: string; equity_value: number; shares_total: number; status: string }>();
  if (!target || target.guild_id !== user.guild_id) throw new HttpError(403, 'You can only invest in members of your own holding company.');
  if (target.status !== 'playing' || target.equity_value <= 0) throw new HttpError(409, 'That company is not open to investment right now.');
  if (user.personal_cash < (amount as number)) throw new HttpError(409, 'Not enough personal cash. Pay yourself dividends to build it up.');

  // The 49% cap, counting accepted stakes and pending offers.
  const held = await env.DB.prepare(`SELECT COALESCE(SUM(shares), 0) AS s FROM investments WHERE run_id = ? AND status IN ('accepted', 'buyout-requested')`)
    .bind(target.run_id).first<{ s: number }>();
  const pending = await env.DB.prepare(`SELECT COALESCE(SUM(amount), 0) AS a FROM investments WHERE run_id = ? AND status = 'offered'`)
    .bind(target.run_id).first<{ a: number }>();
  const newShares = (target.shares_total * ((amount as number) + (pending?.a ?? 0))) / target.equity_value;
  if (((held?.s ?? 0) + newShares) / (target.shares_total + newShares) > MAX_OUTSIDE_SHARE) {
    throw new HttpError(409, 'That would take outside investors above 49% of the company.');
  }
  const id = newId();
  const now = nowIso();
  const res = await env.DB.batch([
    env.DB.prepare('UPDATE users SET personal_cash = personal_cash - ? WHERE id = ? AND personal_cash >= ?').bind(amount, user.id, amount),
    env.DB.prepare(`INSERT INTO investments (id, investor_id, investee_id, run_id, amount, pre_money, status, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, ?, 'offered', ?, ? WHERE changes() > 0`).bind(id, user.id, target.id, target.run_id, amount, target.equity_value, now, now),
  ]);
  if (!res[0].meta.changes) throw new HttpError(409, 'Not enough personal cash.');
  return { id, amount, preMoney: target.equity_value };
}

export async function declineInvestment(env: Env, user: UserRow, id: string) {
  const inv = await env.DB.prepare(`SELECT * FROM investments WHERE id = ? AND status = 'offered'`).bind(id).first<{ investor_id: string; investee_id: string; amount: number }>();
  if (!inv || (inv.investee_id !== user.id && inv.investor_id !== user.id)) throw new HttpError(404, 'Offer not found.');
  await env.DB.batch([
    env.DB.prepare(`UPDATE investments SET status = 'declined', updated_at = ? WHERE id = ? AND status = 'offered'`).bind(nowIso(), id),
    env.DB.prepare('UPDATE users SET personal_cash = personal_cash + ? WHERE id = ?').bind(inv.amount, inv.investor_id),
  ]);
  return { ok: true };
}

/** Everything about investments the signed-in player needs: offers to answer, buy-outs owed, stakes held. */
export async function myInvestments(env: Env, user: UserRow) {
  const incoming = await env.DB.prepare(
    `SELECT i.id, i.amount, i.pre_money, i.status, i.run_id, u.id AS investor_id, u.name AS investor_name
     FROM investments i JOIN users u ON u.id = i.investor_id WHERE i.investee_id = ? AND i.status IN ('offered', 'buyout-requested')`,
  ).bind(user.id).all<{ id: string; amount: number; pre_money: number; status: string; run_id: string; investor_id: string; investor_name: string }>();
  const holdings = await env.DB.prepare(
    `SELECT i.id, i.amount, i.status, i.shares, i.dividends_credited, i.buyout_credited, u.name AS investee_name, r.company_name, r.icon,
            r.status AS run_status, r.equity_value, r.shares_total
     FROM investments i JOIN users u ON u.id = i.investee_id JOIN game_runs r ON r.id = i.run_id
     WHERE i.investor_id = ? ORDER BY i.created_at DESC LIMIT 50`,
  ).bind(user.id).all<{
    id: string; amount: number; status: string; shares: number; dividends_credited: number; buyout_credited: number; investee_name: string;
    company_name: string; icon: string; run_status: string; equity_value: number; shares_total: number;
  }>();
  return {
    offers: incoming.results.filter((i) => i.status === 'offered').map((i) => ({
      id: i.id, runId: i.run_id, investorId: i.investor_id, investorName: i.investor_name, amount: i.amount, preMoney: i.pre_money,
    })),
    buyoutRequests: incoming.results.filter((i) => i.status === 'buyout-requested').map((i) => i.id),
    holdings: holdings.results.map((h) => ({
      id: h.id, investeeName: h.investee_name, companyName: h.company_name, icon: h.icon, status: h.status, invested: h.amount,
      dividends: h.dividends_credited, buyout: h.buyout_credited,
      value: ['accepted', 'buyout-requested'].includes(h.status) && h.run_status === 'playing' && h.shares_total > 0
        ? Math.round((h.shares * h.equity_value) / h.shares_total) : 0,
    })),
  };
}
