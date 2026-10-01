import {
  BOOSTS, checkIntegrity, cleanModifiers, compactForServer, continueRun, currentBalanceSheet, DIFFICULTIES, DIFFICULTY_IDS, INDUSTRIES, INDUSTRY_IDS, newGame, ownerStakeOf, STATE_VERSION,
  ownership, plSummary, RULES_VERSION, stateChecksum, trailingPL, valuationOf, type Action, type ActiveBoost, type GameState, type PerkLevels,
} from '@cfx/engine';
import type { UserRow } from './auth';
import { claimInsert, flagStatements, resolveFixed, scoreStatement } from './fixed';
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
  weekly_week: string | null;
  challenge_code: string | null;
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
  /** true to start this week's event. */
  weekly?: unknown;
  /** A friend challenge code. */
  challenge?: unknown;
  /** Optional handicaps for a standard company (see OPTIONAL_MODIFIERS). */
  modifiers?: unknown;
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

  // Daily, weekly and friend challenges: the server decides the company, and each player gets one attempt.
  const challenge = await resolveFixed(env, user, b, b.seed, b.industryId);

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
    prestigeLevel: challenge ? 0 : user.prestige_count, modifiers: challenge ? [] : cleanModifiers(b.modifiers), icon: cleanIcon(b.icon), scenarioId: challenge ? challenge.scenarioId : undefined,
  });
  const id = newId();
  const now = nowIso();
  const start = { seed: game.seedLabel, industryId: game.industryId, difficulty, equipmentFinance: game.start.equipmentFinance, perks, boosts: game.start.boosts, prestigeLevel: game.prestigeLevel, modifiers: game.modifiers ?? [], companyName: game.companyName, icon: game.icon, ...(challenge ? { scenarioId: challenge.scenarioId, [challenge.kind]: challenge.key } : {}) };
  await env.DB.batch([
    // The latest company icon becomes the player's icon on leaderboards and in holding companies.
    env.DB.prepare('UPDATE users SET icon = ?, updated_at = ? WHERE id = ?').bind(game.icon, now, user.id),
    env.DB.prepare(`UPDATE game_runs SET is_active = 0, status = CASE WHEN status = 'playing' THEN 'abandoned' ELSE status END, updated_at = ? WHERE user_id = ? AND is_active = 1`).bind(now, user.id),
    env.DB.prepare(
      `INSERT INTO game_runs (id, user_id, seed, industry_id, difficulty, scenario_id, company_name, icon, start_json, checkpoint, stats_json, equity_value, owner_stake, created_at, updated_at, daily_day, weekly_week, challenge_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.id, game.seedLabel, game.industryId, difficulty, challenge ? challenge.scenarioId : 'standard', game.companyName, game.icon, JSON.stringify(start),
      await gzipJson(compactForServer(game)), JSON.stringify(statsOf(game)), valuationOf(game).equityValue, ownerStakeOf(game), now, now,
      challenge?.kind === 'daily' ? challenge.key : null, challenge?.kind === 'weekly' ? challenge.key : null, challenge?.kind === 'challenge' ? challenge.key : null),
    ...(challenge ? [claimInsert(env, challenge, user.id, id, now)] : []),
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
  // A company from before the update has to be carried over to the new rules first.
  if (state.version !== STATE_VERSION) throw new HttpError(409, JSON.stringify({ code: 'CARRYOVER_REQUIRED' }));
  const monthBefore = state.month;
  const levelBefore = state.prestigeLevel ?? 0;
  const awardBefore = state.prestigeAward ?? 0;
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
  // Prestiges done in this batch (verified by the replay): each one earns Legacy points and a rank.
  const prestiges = (state.prestigeLevel ?? 0) - levelBefore;
  if (prestiges > 0) {
    const pts = (state.prestigeAward ?? 0) - awardBefore;
    stmts.push(env.DB.prepare(`UPDATE users SET legacy_points = legacy_points + ?, legacy_earned = legacy_earned + ?, prestige_count = prestige_count + ?, updated_at = ? WHERE id = ?`)
      .bind(pts, pts, prestiges, now, user.id));
    stmts.push(env.DB.prepare(`INSERT INTO season_stats (user_id, season, prestiges) VALUES (?, ?, ?)
      ON CONFLICT (user_id, season) DO UPDATE SET prestiges = prestiges + excluded.prestiges`).bind(user.id, season, prestiges));
  }
  const score = scoreStatement(env, run, state, user.id, now);
  if (score) stmts.push(score);
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

/** How much a carried-over company may have grown since its last verified checkpoint (the old months could not be replayed). */
const CARRYOVER_MAX_GROWTH = 6;
const CARRYOVER_EQUITY_FLOOR = 100_000_000; // £1m in pence

export interface CarryOverBody {
  /** The player's company, already upgraded to the current rules. */
  state: unknown;
  /** How many decisions the player has made so far (later syncs continue from here). */
  actions: unknown;
}

/**
 * One-time bridge for companies started before the rules changed. The months since the last
 * verified checkpoint were played under the old rules and can never replay, so the server takes
 * the player's company as it stands, provided it is plausible: it must be the same company, its
 * books must balance, and it cannot have grown beyond what real play could produce. This works
 * once per run and only for runs whose stored checkpoint is from the old version; everything
 * after it is verified by replay as normal.
 */
export async function carryOverRun(env: Env, user: UserRow, runId: string, b: CarryOverBody) {
  const run = await env.DB.prepare(
    `SELECT id, is_active, status, checkpoint, actions_verified, month, equity_value, owner_dividends, stats_json FROM game_runs WHERE id = ? AND user_id = ?`,
  ).bind(runId, user.id).first<{ id: string; is_active: number; status: string; checkpoint: ArrayBuffer; actions_verified: number; month: number; equity_value: number; owner_dividends: number; stats_json: string }>();
  if (!run) throw new HttpError(404, 'That company is not registered to your account.');
  // A company that was sold under the old prestige rules may be reopened once: it carries on, a rank higher.
  const reopening = run.status === 'prestiged' && !!run.is_active;
  if ((run.status !== 'playing' && !reopening) || !run.is_active) throw new HttpError(409, 'This company is not running.');
  const old = await gunzipJson<Record<string, any>>(run.checkpoint);
  if (reopening && old.status !== 'prestiged') throw new HttpError(409, 'This company is not running.');
  if (old.version === STATE_VERSION) throw new HttpError(409, 'This company is already on the current version.');
  if (typeof old.version !== 'number' || old.version < 3) throw new HttpError(409, 'This company is too old to carry over.');

  const st = b.state as GameState | null;
  const refuse = (why: string): never => { throw new HttpError(422, `This company cannot be carried over: ${why}`); };
  if (!st || typeof st !== 'object' || st.version !== STATE_VERSION) return refuse('it has not been upgraded to the current version.');
  if (st.seedLabel !== old.seedLabel || st.industryId !== old.industryId || st.difficulty !== old.difficulty || (st.scenarioId ?? 'standard') !== (old.scenarioId ?? 'standard')) {
    return refuse('it is not the company the server has on record.');
  }
  if (st.status !== 'playing') return refuse('it has already ended.');
  if (reopening && ((st.prestigeLevel ?? 0) !== (old.prestigeLevel ?? 0) + 1 || (st.prestigeAward ?? 0) !== (old.prestigeAward ?? 0))) {
    return refuse('it does not match the company that was sold.');
  }
  if (!Number.isInteger(st.month) || st.month < old.month || st.month > old.month + MAX_SYNC_MONTHS) return refuse('its month is out of range.');
  if (!Number.isInteger(b.actions) || (b.actions as number) < run.actions_verified || (b.actions as number) > run.actions_verified + MAX_SYNC_ACTIONS) return refuse('its decision count is out of range.');
  if (!st.ledger?.balances || !Object.values(st.ledger.balances).every((v) => Number.isInteger(v))) return refuse('its accounts are malformed.');
  if (!Array.isArray(st.history) || !Array.isArray(st.competitors) || !Array.isArray(st.outsideHolders)) return refuse('it is malformed.');
  const errors = checkIntegrity(st);
  if (errors.length) return refuse('its accounts do not balance.');

  // Shareholders can only be ones the server already knows about.
  const known = new Set<string>((old.outsideHolders ?? []).map((h: { id: string }) => h.id));
  const rows = await env.DB.prepare('SELECT id FROM investments WHERE run_id = ?').bind(run.id).all<{ id: string }>();
  for (const r of rows.results) known.add(r.id);
  if (st.outsideHolders.some((h) => !known.has(h.id))) return refuse('it lists shareholders the server does not know.');

  const clean = compactForServer(st);
  let equity: number;
  try { equity = valuationOf(clean).equityValue; } catch { return refuse('its value could not be worked out.'); }
  // A sold company has its value zeroed in the database; use what was recorded when it was last verified.
  const baseline = reopening ? Number((JSON.parse(run.stats_json) as { equityValue?: number }).equityValue ?? 0) : run.equity_value;
  if (!Number.isFinite(equity) || equity > Math.max(baseline * CARRYOVER_MAX_GROWTH, CARRYOVER_EQUITY_FLOOR)) return refuse('it has grown more than real play could explain.');

  const now = nowIso();
  await env.DB.prepare(
    `UPDATE game_runs SET checkpoint = ?, actions_verified = ?, month = ?, stats_json = ?, equity_value = ?, owner_stake = ?,
       owner_dividends = ?, shares_total = ?, status = 'playing', updated_at = ? WHERE id = ? AND status IN ('playing', 'prestiged')`,
  ).bind(await gzipJson(clean), b.actions as number, clean.month, JSON.stringify(statsOf(clean)), equity, ownerStakeOf(clean), clean.ownerDividends, clean.shares.total, now, run.id).run();
  return { actionsVerified: b.actions as number, month: clean.month, status: 'playing' };
}

async function flag(env: Env, run: RunRow, reason: string) {
  await env.DB.batch([
    ...flagStatements(env, run.id),
    env.DB.prepare(`UPDATE game_runs SET status = 'flagged', flagged_reason = ?, equity_value = 0, owner_stake = 0, updated_at = ? WHERE id = ?`).bind(reason.slice(0, 300), nowIso(), run.id),
    // Offers into a flagged company are refunded.
    env.DB.prepare(`UPDATE users SET personal_cash = personal_cash + COALESCE((SELECT SUM(amount) FROM investments i WHERE i.run_id = ? AND i.status = 'offered' AND i.investor_id = users.id), 0)
      WHERE id IN (SELECT investor_id FROM investments WHERE run_id = ? AND status = 'offered')`).bind(run.id, run.id),
    env.DB.prepare(`UPDATE investments SET status = 'expired' WHERE run_id = ? AND status = 'offered'`).bind(run.id),
  ]);
  throw new HttpError(422, `Verification failed: ${reason}`);
}
