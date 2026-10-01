import {
  BOOSTS, compactForServer, continueRun, currentBalanceSheet, dailyChallenge, DIFFICULTIES, DIFFICULTY_IDS, INDUSTRIES, INDUSTRY_IDS, newGame, ownerStakeOf, utcDay,
  ownership, plSummary, RULES_VERSION, stateChecksum, trailingPL, valuationOf, type Action, type ActiveBoost, type GameState, type PerkLevels,
} from '@cfx/engine';
import type { UserRow } from './auth';
import { guildLevelOfUser, guildValuation, netWorthOf } from './social';
import { cleanIcon, cleanName, gunzipJson, gzipJson, HttpError, newId, nowIso, seasonOf, weekOf, type Env } from './util';

/** A sync may cover at most this many months (the client syncs yearly; offline runs are shorter). */
export const MAX_SYNC_MONTHS = 36;
const MAX_SYNC_ACTIONS = 2000;

interface RunRow {
  id: string;
  user_id: string;
  is_active: number;
  status: string;
  checkpoint: ArrayBuffer;
  actions_verified: number;
  month: number;
  owner_dividends: number;
  difficulty: string;
  daily_day: string | null;
}

export interface CreateRunBody {
  seed: unknown;
  industryId: unknown;
  difficulty: unknown;
  equipmentFinance: unknown;
  companyName: unknown;
  icon: unknown;
  boosts: unknown;
  rulesVersion: unknown;
  /** true to start today's daily challenge (the server decides the company). */
  daily?: unknown;
}

/** Summary shown to holding company members and on leaderboards, computed from verified state. */
function statsOf(s: GameState) {
  const t = trailingPL(s, 12);
  const bs = currentBalanceSheet(s);
  const v = valuationOf(s);
  const k = s.history.at(-1)?.kpis;
  return {
    month: s.month, companyName: s.companyName, industryId: s.industryId, difficulty: s.difficulty, icon: s.icon, status: s.status,
    months: t.months, revenue: t.summary.revenue, grossProfit: t.summary.grossProfit, ebitda: t.summary.ebitda, profit: t.summary.profit,
    pl: t.summary,
    bs: {
      cash: bs.cash, overdraft: bs.overdraft, receivables: bs.receivables, inventory: bs.inventory, ppeNet: bs.ppeNet, totalAssets: bs.totalAssets,
      currentLiabilities: bs.currentLiabilities, totalLiabilities: bs.totalLiabilities, totalEquity: bs.totalEquity,
      borrowings: bs.borrowingsCurrent + bs.borrowingsNonCurrent, leases: bs.leaseLiabilitiesCurrent + bs.leaseLiabilitiesNonCurrent,
    },
    equityValue: v.equityValue, enterpriseValue: v.enterpriseValue, ownership: ownership(s),
    customers: k?.customers ?? 0, unitsSold: k?.unitsSold ?? 0, headcount: k?.headcount ?? 0,
  };
}

export async function createRun(env: Env, user: UserRow, b: CreateRunBody) {
  if (b.rulesVersion !== RULES_VERSION) throw new HttpError(409, 'A new version of the game is available. Reload the page to update.');
  if (typeof b.seed !== 'string' || !b.seed || b.seed.length > 32) throw new HttpError(400, 'Invalid seed.');
  if (!INDUSTRY_IDS.includes(b.industryId as never)) throw new HttpError(400, 'Unknown sector.');
  if (!DIFFICULTY_IDS.includes(b.difficulty as never)) throw new HttpError(400, 'Unknown difficulty.');
  if (b.equipmentFinance !== 'buy' && b.equipmentFinance !== 'lease') throw new HttpError(400, 'Invalid equipment choice.');

  // The daily challenge: the server decides the company, and each player gets one attempt a day.
  const challenge = b.daily === true ? dailyChallenge(utcDay()) : null;
  if (challenge) {
    if (b.seed !== challenge.seed || b.industryId !== challenge.industryId) throw new HttpError(409, "Today's challenge has changed. Reload the page to get the new one.");
    const played = await env.DB.prepare('SELECT 1 FROM daily_scores WHERE day = ? AND user_id = ?').bind(challenge.day, user.id).first();
    if (played) throw new HttpError(409, "You have already played today's challenge. A new one starts at midnight UTC.");
  }

  const current = await env.DB.prepare(`SELECT id, status FROM game_runs WHERE user_id = ? AND is_active = 1`).bind(user.id).first<{ id: string; status: string }>();
  if (current?.status === 'playing') {
    const holders = await env.DB.prepare(`SELECT COUNT(*) AS n FROM investments WHERE run_id = ? AND status IN ('accepted', 'buyout-requested')`)
      .bind(current.id).first<{ n: number }>();
    if ((holders?.n ?? 0) > 0) throw new HttpError(409, 'Other players own shares in your current company. Buy them out (Finance › Investors) before starting a new one.');
  }

  const difficulty = (challenge ? 'medium' : b.difficulty) as keyof typeof DIFFICULTIES;
  const perks: PerkLevels = DIFFICULTIES[difficulty].perksApply && !challenge ? JSON.parse(user.perks_json) : {};
  // Boosts are bought with client-side gems; cap what a run may start with.
  const boosts: ActiveBoost[] = Array.isArray(b.boosts) && !challenge
    ? (b.boosts as ActiveBoost[]).filter((x) => x && x.id in BOOSTS && Number.isInteger(x.monthsRemaining)).slice(0, 3)
      .map((x) => ({ id: x.id, monthsRemaining: Math.min(24, Math.max(0, x.monthsRemaining)) }))
    : [];
  const game = newGame({
    companyName: challenge ? challenge.companyName : cleanName(b.companyName, 40) || `${INDUSTRIES[b.industryId as keyof typeof INDUSTRIES].name.split(' ')[0]} Co Ltd`,
    industryId: b.industryId as never, seed: b.seed, difficulty, equipmentFinance: challenge ? 'buy' : b.equipmentFinance, perks, boosts,
    prestigeLevel: challenge ? 0 : user.prestige_count, icon: cleanIcon(b.icon), scenarioId: challenge ? 'daily' : undefined,
  });
  const id = newId();
  const now = nowIso();
  const start = { seed: game.seedLabel, industryId: game.industryId, difficulty, equipmentFinance: game.start.equipmentFinance, perks, boosts: game.start.boosts, prestigeLevel: game.prestigeLevel, companyName: game.companyName, icon: game.icon, ...(challenge ? { scenarioId: 'daily', daily: challenge.day } : {}) };
  await env.DB.batch([
    // The latest company icon becomes the player's icon on leaderboards and in holding companies.
    env.DB.prepare('UPDATE users SET icon = ?, updated_at = ? WHERE id = ?').bind(game.icon, now, user.id),
    env.DB.prepare(`UPDATE game_runs SET is_active = 0, status = CASE WHEN status = 'playing' THEN 'abandoned' ELSE status END, updated_at = ? WHERE user_id = ? AND is_active = 1`).bind(now, user.id),
    env.DB.prepare(
      `INSERT INTO game_runs (id, user_id, seed, industry_id, difficulty, scenario_id, company_name, icon, start_json, checkpoint, stats_json, equity_value, owner_stake, created_at, updated_at, daily_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.id, game.seedLabel, game.industryId, difficulty, challenge ? 'daily' : 'standard', game.companyName, game.icon, JSON.stringify(start),
      await gzipJson(compactForServer(game)), JSON.stringify(statsOf(game)), valuationOf(game).equityValue, ownerStakeOf(game), now, now, challenge?.day ?? null),
    ...(challenge ? [env.DB.prepare(`INSERT INTO daily_scores (day, user_id, run_id, updated_at) VALUES (?, ?, ?, ?)`).bind(challenge.day, user.id, id, now)] : []),
  ]);
  return { runId: id, ...start };
}

export interface SyncBody {
  fromAction: unknown;
  actions: unknown;
  month: unknown;
  checksum: unknown;
}

export async function syncRun(env: Env, user: UserRow, runId: string, b: SyncBody) {
  const run = await env.DB.prepare('SELECT * FROM game_runs WHERE id = ? AND user_id = ?').bind(runId, user.id).first<RunRow>();
  if (!run) throw new HttpError(404, 'That company is not registered to your account.');
  if (run.status === 'flagged') throw new HttpError(422, 'This company failed verification and no longer counts for leaderboards.');
  if (run.status !== 'playing' || !run.is_active) return { actionsVerified: run.actions_verified, status: run.status, verified: true };
  if (b.fromAction !== run.actions_verified) {
    throw new HttpError(409, JSON.stringify({ resendFrom: run.actions_verified }));
  }
  if (!Array.isArray(b.actions) || b.actions.length > MAX_SYNC_ACTIONS) throw new HttpError(400, 'Invalid action batch.');
  if (!Number.isInteger(b.month) || (b.month as number) < run.month) throw new HttpError(400, 'Invalid month.');
  if ((b.month as number) - run.month > MAX_SYNC_MONTHS) throw new HttpError(400, `Sync at most ${MAX_SYNC_MONTHS} months at a time.`);
  if (typeof b.checksum !== 'string') throw new HttpError(400, 'Missing checksum.');
  const actions = b.actions as { month: number; action: Action }[];
  for (const a of actions) {
    if (!a || !Number.isInteger(a.month) || typeof a.action?.type !== 'string') throw new HttpError(400, 'Malformed action.');
  }

  // Holding company actions must match what the server knows.
  const guildLevel = await guildLevelOfUser(env, user.guild_id);
  for (const { action } of actions) {
    if (action.type === 'setGuildLevel' && action.level > guildLevel) return flag(env, run, `Claimed holding company level ${action.level}, actual ${guildLevel}.`);
    if (action.type === 'acceptInvestment') {
      const inv = await env.DB.prepare(`SELECT * FROM investments WHERE id = ?`).bind(action.investmentId).first<{
        investor_id: string; investee_id: string; run_id: string; amount: number; pre_money: number; status: string;
      }>();
      if (!inv || inv.status !== 'offered' || inv.run_id !== run.id || inv.investee_id !== user.id || inv.investor_id !== action.investorId
        || inv.amount !== action.amount || inv.pre_money !== action.preMoney) {
        return flag(env, run, 'Accepted an investment that was not offered on these terms.');
      }
    }
  }

  const state = await gunzipJson<GameState>(run.checkpoint);
  const monthBefore = state.month;
  try {
    continueRun(state, actions, b.month as number);
  } catch (e) {
    return flag(env, run, `Replay failed: ${(e as Error).message}`);
  }
  if (stateChecksum(state) !== b.checksum) return flag(env, run, 'The replayed accounts do not match the game.');

  const now = nowIso();
  const stmts: D1PreparedStatement[] = [];
  const stats = statsOf(state);
  const ownerDividendsDelta = state.ownerDividends - run.owner_dividends;
  const profitDelta = state.history.filter((r) => r.month >= monthBefore).reduce((a, r) => a + plSummary(r.period.pl).profit, 0);

  stmts.push(env.DB.prepare(
    `UPDATE game_runs SET checkpoint = ?, actions_verified = ?, month = ?, status = ?, stats_json = ?, equity_value = ?, owner_stake = ?,
       owner_dividends = ?, shares_total = ?, profit_to_date = profit_to_date + ?, updated_at = ? WHERE id = ?`,
  ).bind(await gzipJson(compactForServer(state)), run.actions_verified + actions.length, state.month, state.status, JSON.stringify(stats),
    state.status === 'playing' ? stats.equityValue : 0, state.status === 'playing' ? ownerStakeOf(state) : 0,
    state.ownerDividends, state.shares.total, profitDelta, now, run.id));
  if (ownerDividendsDelta > 0) stmts.push(env.DB.prepare('UPDATE users SET personal_cash = personal_cash + ? WHERE id = ?').bind(ownerDividendsDelta, user.id));

  // Investors: accepted offers, dividends and buy-outs reach their personal cash.
  const invs = await env.DB.prepare(`SELECT * FROM investments WHERE run_id = ?`).bind(run.id).all<{
    id: string; investor_id: string; status: string; dividends_credited: number; buyout_credited: number;
  }>();
  for (const inv of invs.results) {
    const h = state.outsideHolders.find((x) => x.id === inv.id);
    if (!h) continue;
    const div = h.dividends - inv.dividends_credited;
    const buy = h.buyout - inv.buyout_credited;
    if (div + buy > 0) stmts.push(env.DB.prepare('UPDATE users SET personal_cash = personal_cash + ? WHERE id = ?').bind(div + buy, inv.investor_id));
    const status = h.status === 'bought-out' ? 'bought-out' : inv.status === 'offered' ? 'accepted' : inv.status;
    stmts.push(env.DB.prepare(`UPDATE investments SET status = ?, shares = ?, dividends_credited = ?, buyout_credited = ?, updated_at = ? WHERE id = ?`)
      .bind(status, h.shares, h.dividends, h.buyout, now, inv.id));
  }
  if (state.status === 'insolvent') {
    stmts.push(env.DB.prepare(`UPDATE investments SET status = 'written-off', updated_at = ? WHERE run_id = ? AND status IN ('accepted', 'buyout-requested')`).bind(now, run.id));
  }

  const season = seasonOf();
  if (state.status === 'prestiged') {
    const pts = state.prestigeAward;
    stmts.push(env.DB.prepare(`UPDATE users SET legacy_points = legacy_points + ?, legacy_earned = legacy_earned + ?, prestige_count = prestige_count + 1, updated_at = ? WHERE id = ?`)
      .bind(pts, pts, now, user.id));
    stmts.push(env.DB.prepare(`INSERT INTO season_stats (user_id, season, prestiges) VALUES (?, ?, 1)
      ON CONFLICT (user_id, season) DO UPDATE SET prestiges = prestiges + 1`).bind(user.id, season));
  }
  if (run.daily_day) {
    // Scored from the verified accounts only, and only counted once the 24 months are done.
    const finished = state.status !== 'playing' ? 1 : 0;
    stmts.push(env.DB.prepare(`UPDATE daily_scores SET score = ?, months = ?, finished = ?, status = ?, updated_at = ? WHERE day = ? AND user_id = ? AND run_id = ?`)
      .bind(state.status === 'insolvent' ? 0 : ownerStakeOf(state), state.month, finished, state.status, now, run.daily_day, user.id, run.id));
  }
  if (user.guild_id && profitDelta !== 0) {
    stmts.push(env.DB.prepare(`INSERT INTO guild_weekly (guild_id, week, profit) VALUES (?, ?, ?)
      ON CONFLICT (guild_id, week) DO UPDATE SET profit = profit + excluded.profit`).bind(user.guild_id, weekOf(), profitDelta));
  }
  await env.DB.batch(stmts);

  // Season peaks (after the updates above).
  const nw = await netWorthOf(env, user.id);
  const peaks = [env.DB.prepare(`INSERT INTO season_stats (user_id, season, peak_net_worth) VALUES (?, ?, ?)
    ON CONFLICT (user_id, season) DO UPDATE SET peak_net_worth = MAX(peak_net_worth, excluded.peak_net_worth)`).bind(user.id, season, nw)];
  if (user.guild_id) {
    peaks.push(env.DB.prepare(`INSERT INTO guild_season (guild_id, season, peak_valuation) VALUES (?, ?, ?)
      ON CONFLICT (guild_id, season) DO UPDATE SET peak_valuation = MAX(peak_valuation, excluded.peak_valuation)`)
      .bind(user.guild_id, season, await guildValuation(env, user.guild_id)));
  }
  await env.DB.batch(peaks);
  return { actionsVerified: run.actions_verified + actions.length, status: state.status, verified: true, netWorth: nw };
}

async function flag(env: Env, run: RunRow, reason: string) {
  await env.DB.batch([
    env.DB.prepare(`UPDATE daily_scores SET finished = 0, status = 'flagged' WHERE run_id = ?`).bind(run.id),
    env.DB.prepare(`UPDATE game_runs SET status = 'flagged', flagged_reason = ?, equity_value = 0, owner_stake = 0, updated_at = ? WHERE id = ?`).bind(reason.slice(0, 300), nowIso(), run.id),
    // Offers into a flagged company are refunded.
    env.DB.prepare(`UPDATE users SET personal_cash = personal_cash + COALESCE((SELECT SUM(amount) FROM investments i WHERE i.run_id = ? AND i.status = 'offered' AND i.investor_id = users.id), 0)
      WHERE id IN (SELECT investor_id FROM investments WHERE run_id = ? AND status = 'offered')`).bind(run.id, run.id),
    env.DB.prepare(`UPDATE investments SET status = 'expired' WHERE run_id = ? AND status = 'offered'`).bind(run.id),
  ]);
  throw new HttpError(422, `Verification failed: ${reason}`);
}
