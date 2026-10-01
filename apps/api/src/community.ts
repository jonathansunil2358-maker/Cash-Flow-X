import { bracketFor, cleanPlan, hashSeed, isoWeek, weekendOf, type Entrant } from '@cfx/engine';
import type { UserRow } from './auth';
import { NET_WORTH_SQL, type NetWorthRow } from './social';
import { HttpError, newId, nowIso, type Env } from './util';

// ---------------------------------------------------------------------------------------------
// Community goal: everyone's verified months this week add up to a shared target
// ---------------------------------------------------------------------------------------------

export const COMMUNITY_TARGET = 600;
export const COMMUNITY_GEMS = 75;

/** Count verified months towards this week's goal (called when a run's sync is accepted). */
export const communityStatements = (env: Env, userId: string, months: number) => {
  const week = isoWeek();
  return months > 0 ? [
    env.DB.prepare(`INSERT INTO community (week, months) VALUES (?, ?) ON CONFLICT (week) DO UPDATE SET months = months + excluded.months`).bind(week, months),
    env.DB.prepare(`INSERT OR IGNORE INTO community_users (week, user_id) VALUES (?, ?)`).bind(week, userId),
  ] : [];
};

export async function communityView(env: Env, viewer: UserRow) {
  const week = isoWeek();
  const row = await env.DB.prepare('SELECT months FROM community WHERE week = ?').bind(week).first<{ months: number }>();
  const months = row?.months ?? 0;
  const mine = !!(await env.DB.prepare('SELECT 1 FROM community_users WHERE week = ? AND user_id = ?').bind(week, viewer.id).first());
  const players = (await env.DB.prepare('SELECT COUNT(*) AS n FROM community_users WHERE week = ?').bind(week).first<{ n: number }>())?.n ?? 0;
  const claimed = !!(await env.DB.prepare(`SELECT 1 FROM reward_claims WHERE user_id = ? AND kind = 'community' AND period = ?`).bind(viewer.id, week).first());
  return { week, months, target: COMMUNITY_TARGET, reached: months >= COMMUNITY_TARGET, players, contributed: mine, claimed, gems: COMMUNITY_GEMS };
}

export async function claimCommunity(env: Env, user: UserRow) {
  const v = await communityView(env, user);
  if (!v.reached) throw new HttpError(409, 'The community goal has not been reached yet.');
  if (!v.contributed) throw new HttpError(409, 'Play some verified months this week to share in the reward.');
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO reward_claims (user_id, kind, period, gems, created_at) VALUES (?, 'community', ?, ?, ?)`).bind(user.id, v.week, COMMUNITY_GEMS, nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'Already claimed.');
  return { gems: COMMUNITY_GEMS, week: v.week };
}

// ---------------------------------------------------------------------------------------------
// Tournament: last week's top eight, a knockout over the weekend
// ---------------------------------------------------------------------------------------------

const previousWeek = (): string => isoWeek(new Date(Date.now() - 7 * 86_400_000));

export async function tournamentView(env: Env, viewer: UserRow) {
  const week = previousWeek();
  const top = await env.DB.prepare(
    `SELECT s.user_id AS id, u.name, s.score FROM weekly_scores s JOIN users u ON u.id = s.user_id
     WHERE s.week = ? AND s.finished = 1 ORDER BY s.score DESC, s.updated_at ASC LIMIT 8`,
  ).bind(week).all<{ id: string; name: string; score: number }>();
  const { saturday, sunday } = weekendOf(week);
  const ids = top.results.map((r) => r.id);
  const scoresOn = async (day: string): Promise<Record<string, number>> => {
    const out: Record<string, number> = {};
    if (!ids.length) return out;
    const rows = await env.DB.prepare(`SELECT user_id, score FROM daily_scores WHERE day = ? AND finished = 1 AND user_id IN (${ids.map(() => '?').join(',')})`).bind(day, ...ids).all<{ user_id: string; score: number }>();
    for (const r of rows.results) out[r.user_id] = r.score;
    return out;
  };
  const entrants: Entrant[] = top.results;
  const bracket = bracketFor(entrants, await scoresOn(saturday), await scoresOn(sunday));
  return { week, saturday, sunday, entrants, bracket, me: ids.includes(viewer.id), ids };
}

// ---------------------------------------------------------------------------------------------
// Rival of the week: someone near you in net worth, rotating each week
// ---------------------------------------------------------------------------------------------

export async function rivalView(env: Env, viewer: UserRow) {
  const all = await env.DB.prepare(`SELECT * FROM (${NET_WORTH_SQL}) WHERE net_worth > 0 OR id = ? ORDER BY net_worth DESC, id ASC LIMIT 200`).bind(viewer.id).all<NetWorthRow>();
  const rows = all.results;
  const i = rows.findIndex((r) => r.id === viewer.id);
  if (i < 0 || rows.length < 2) return { week: isoWeek(), rival: null, you: i >= 0 ? rows[i].net_worth : 0 };
  const near = rows.slice(Math.max(0, i - 3), i + 4).filter((r) => r.id !== viewer.id);
  const week = isoWeek();
  const pick = near[hashSeed(`${week}:${viewer.id}`) % near.length];
  return {
    week,
    rank: i + 1,
    you: rows[i].net_worth,
    rival: { id: pick.id, name: pick.name, title: pick.title, icon: pick.icon, netWorth: pick.net_worth, company: pick.company_name, industry: pick.industry_id, rank: rows.indexOf(pick) + 1 },
  };
}

// ---------------------------------------------------------------------------------------------
// Plan marketplace
// ---------------------------------------------------------------------------------------------

const MAX_PLANS_PER_USER = 10;
const LIST_LIMIT = 20;

export async function publishPlan(env: Env, user: UserRow, body: { plan?: unknown }) {
  const plan = cleanPlan(body.plan);
  if (!plan) throw new HttpError(400, 'That plan is not valid.');
  const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM shared_plans WHERE user_id = ?').bind(user.id).first<{ n: number }>())?.n ?? 0;
  if (count >= MAX_PLANS_PER_USER) throw new HttpError(429, `You can share up to ${MAX_PLANS_PER_USER} plans. Remove one first.`);
  const id = newId();
  await env.DB.prepare('INSERT INTO shared_plans (id, user_id, name, plan_json, likes, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .bind(id, user.id, plan.name, JSON.stringify({ name: plan.name, price: plan.price, marketing: plan.marketing, hires: plan.hires }), nowIso()).run();
  return { id };
}

export async function listPlans(env: Env, viewer: UserRow, sort: string | undefined) {
  const order = sort === 'new' ? 'p.created_at DESC' : 'p.likes DESC, p.created_at DESC';
  const rows = await env.DB.prepare(
    `SELECT p.id, p.plan_json, p.likes, p.user_id, u.name AS author, u.title,
       EXISTS(SELECT 1 FROM plan_likes l WHERE l.plan_id = p.id AND l.user_id = ?) AS liked
     FROM shared_plans p JOIN users u ON u.id = p.user_id ORDER BY ${order} LIMIT ${LIST_LIMIT}`,
  ).bind(viewer.id).all<{ id: string; plan_json: string; likes: number; user_id: string; author: string; title: string | null; liked: number }>();
  const plans = rows.results.flatMap((r) => {
    const plan = cleanPlan({ ...JSON.parse(r.plan_json), id: r.id });
    return plan ? [{ ...plan, likes: r.likes, author: r.author, title: r.title, liked: !!r.liked, mine: r.user_id === viewer.id }] : [];
  });
  return { plans };
}

export async function togglePlanLike(env: Env, user: UserRow, planId: string) {
  const plan = await env.DB.prepare('SELECT user_id FROM shared_plans WHERE id = ?').bind(planId).first<{ user_id: string }>();
  if (!plan) throw new HttpError(404, 'That plan has gone.');
  if (plan.user_id === user.id) throw new HttpError(409, 'You cannot like your own plan.');
  const had = await env.DB.prepare('SELECT 1 FROM plan_likes WHERE plan_id = ? AND user_id = ?').bind(planId, user.id).first();
  if (had) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plan_likes WHERE plan_id = ? AND user_id = ?').bind(planId, user.id),
      env.DB.prepare('UPDATE shared_plans SET likes = MAX(0, likes - 1) WHERE id = ?').bind(planId),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO plan_likes (plan_id, user_id) VALUES (?, ?)').bind(planId, user.id),
      env.DB.prepare('UPDATE shared_plans SET likes = likes + 1 WHERE id = ?').bind(planId),
    ]);
  }
  const row = await env.DB.prepare('SELECT likes FROM shared_plans WHERE id = ?').bind(planId).first<{ likes: number }>();
  return { liked: !had, likes: row?.likes ?? 0 };
}

export async function deletePlanShared(env: Env, user: UserRow, planId: string) {
  const res = await env.DB.prepare('DELETE FROM shared_plans WHERE id = ? AND user_id = ?').bind(planId, user.id).run();
  if (!res.meta.changes) throw new HttpError(404, 'That plan is not yours or has gone.');
  await env.DB.prepare('DELETE FROM plan_likes WHERE plan_id = ?').bind(planId).run();
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Replays of finished fixed-field runs
// ---------------------------------------------------------------------------------------------

const REPLAY_KINDS = { daily: ['daily_scores', 'day'], weekly: ['weekly_scores', 'week'], challenge: ['challenge_scores', 'code'] } as const;

/** The top finished run for a day, week or challenge, with the decisions it took. */
export async function replayOf(env: Env, kind: string, key: string, rank: number) {
  const spec = REPLAY_KINDS[kind as keyof typeof REPLAY_KINDS];
  if (!spec) throw new HttpError(400, 'Unknown kind.');
  const [table, keyCol] = spec;
  if (!Number.isInteger(rank) || rank < 1 || rank > 10) throw new HttpError(400, 'Rank must be 1 to 10.');
  const row = await env.DB.prepare(
    `SELECT s.run_id, s.score, s.months, u.name, u.title, r.seed, r.industry_id, r.company_name, r.scenario_id
     FROM ${table} s JOIN users u ON u.id = s.user_id JOIN game_runs r ON r.id = s.run_id
     WHERE s.${keyCol} = ? AND s.finished = 1 AND r.status != 'flagged' ORDER BY s.score DESC, s.updated_at ASC LIMIT 1 OFFSET ?`,
  ).bind(key, rank - 1).first<{ run_id: string; score: number; months: number; name: string; title: string | null; seed: string; industry_id: string; company_name: string; scenario_id: string }>();
  if (!row) throw new HttpError(404, 'Nobody has finished at that rank yet.');
  const acts = await env.DB.prepare('SELECT month, action_json FROM fixed_actions WHERE run_id = ? ORDER BY seq ASC').bind(row.run_id).all<{ month: number; action_json: string }>();
  return {
    kind, key, rank, name: row.name, title: row.title, score: row.score, months: row.months,
    game: { seed: row.seed, industryId: row.industry_id, companyName: row.company_name, scenarioId: row.scenario_id },
    actions: acts.results.map((a) => ({ month: a.month, action: JSON.parse(a.action_json) })),
  };
}

/** Statements that remember the decisions of a fixed-field run as they are verified. */
export const recordActionStatements = (env: Env, runId: string, firstSeq: number, actions: { month: number; action: unknown }[]) =>
  actions.map((a, i) => env.DB.prepare('INSERT OR IGNORE INTO fixed_actions (run_id, seq, month, action_json) VALUES (?, ?, ?, ?)').bind(runId, firstSeq + i, a.month, JSON.stringify(a.action)));
