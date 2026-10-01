import {
  challengeField, dailyChallenge, FIXED_MONTHS, isoWeek, isValidChallengeCode, isValidWeek, msUntilNextWeek, ownerStakeOf, utcDay, weeklyChallenge,
  CHALLENGE_CODE_ALPHABET, type GameState,
} from '@cfx/engine';
import type { UserRow } from './auth';
import { HttpError, nowIso, type Env } from './util';

/**
 * "Fixed field" games: the server decides the company, each player gets one attempt, the score
 * counts only when the 24 months are finished and is taken from verified accounts. The daily
 * challenge, the weekly event and friend challenges are all this one thing with a different key.
 */
export type FixedKind = 'daily' | 'weekly' | 'challenge';

export interface FixedSpec {
  kind: FixedKind;
  /** Day, ISO week or challenge code. */
  key: string;
  seed: string;
  industryId: string;
  companyName: string;
  scenarioId: FixedKind;
  /** Static identifiers (never user input), so they are safe to put in SQL. */
  table: 'daily_scores' | 'weekly_scores' | 'challenge_scores';
  keyCol: 'day' | 'week' | 'code';
  runCol: 'daily_day' | 'weekly_week' | 'challenge_code';
  alreadyPlayed: string;
}

const SPEC_COLS = {
  daily: { table: 'daily_scores', keyCol: 'day', runCol: 'daily_day' },
  weekly: { table: 'weekly_scores', keyCol: 'week', runCol: 'weekly_week' },
  challenge: { table: 'challenge_scores', keyCol: 'code', runCol: 'challenge_code' },
} as const;

export function specFor(kind: FixedKind, key: string): FixedSpec {
  const cols = SPEC_COLS[kind];
  if (kind === 'daily') {
    const c = dailyChallenge(key);
    return { kind, key, seed: c.seed, industryId: c.industryId, companyName: c.companyName, scenarioId: 'daily', ...cols, alreadyPlayed: "You have already played today's challenge. A new one starts at midnight UTC." };
  }
  if (kind === 'weekly') {
    const c = weeklyChallenge(key);
    return { kind, key, seed: c.seed, industryId: c.industryId, companyName: c.companyName, scenarioId: 'weekly', ...cols, alreadyPlayed: 'You have already played this week\'s event. A new one starts on Monday (UTC).' };
  }
  const c = challengeField(key);
  return { kind, key, seed: c.seed, industryId: c.industryId, companyName: c.companyName, scenarioId: 'challenge', ...cols, alreadyPlayed: 'You have already played this challenge. Each player gets one attempt.' };
}

/** Work out which fixed game (if any) a create-run request is for, and check it is open to this player. */
export async function resolveFixed(env: Env, user: UserRow, b: { daily?: unknown; weekly?: unknown; challenge?: unknown }, seed: unknown, industryId: unknown): Promise<FixedSpec | null> {
  const asked = [b.daily === true, b.weekly === true, typeof b.challenge === 'string'].filter(Boolean).length;
  if (asked > 1) throw new HttpError(400, 'Choose one kind of challenge.');
  let spec: FixedSpec;
  if (b.daily === true) spec = specFor('daily', utcDay());
  else if (b.weekly === true) spec = specFor('weekly', isoWeek());
  else if (typeof b.challenge === 'string') {
    const code = b.challenge.toUpperCase();
    if (!isValidChallengeCode(code)) throw new HttpError(400, 'That challenge code is not valid.');
    const row = await env.DB.prepare('SELECT expires_at FROM challenges WHERE code = ?').bind(code).first<{ expires_at: string }>();
    if (!row) throw new HttpError(404, 'No challenge has that code.');
    if (row.expires_at < nowIso()) throw new HttpError(409, 'That challenge has expired.');
    spec = specFor('challenge', code);
  } else return null;
  if (seed !== spec.seed || industryId !== spec.industryId) throw new HttpError(409, 'This challenge has changed. Reload the page to get the new one.');
  const played = await env.DB.prepare(`SELECT 1 FROM ${spec.table} WHERE ${spec.keyCol} = ? AND user_id = ?`).bind(spec.key, user.id).first();
  if (played) throw new HttpError(409, spec.alreadyPlayed);
  return spec;
}

export const claimInsert = (env: Env, spec: FixedSpec, userId: string, runId: string, now: string) =>
  env.DB.prepare(`INSERT INTO ${spec.table} (${spec.keyCol}, user_id, run_id, updated_at) VALUES (?, ?, ?, ?)`).bind(spec.key, userId, runId, now);

/** The run row columns that say which fixed game a run belongs to. */
export interface FixedRunCols {
  daily_day: string | null;
  weekly_week: string | null;
  challenge_code: string | null;
}
export function fixedOfRun(run: FixedRunCols): { kind: FixedKind; key: string } | null {
  if (run.daily_day) return { kind: 'daily', key: run.daily_day };
  if (run.weekly_week) return { kind: 'weekly', key: run.weekly_week };
  if (run.challenge_code) return { kind: 'challenge', key: run.challenge_code };
  return null;
}

/** Score update for a verified sync (taken from the verified accounts only, finished once the game ends). */
export function scoreStatement(env: Env, run: FixedRunCols & { id: string }, state: GameState, userId: string, now: string) {
  const f = fixedOfRun(run);
  if (!f) return null;
  const cols = SPEC_COLS[f.kind];
  return env.DB.prepare(`UPDATE ${cols.table} SET score = ?, months = ?, finished = ?, status = ?, updated_at = ? WHERE ${cols.keyCol} = ? AND user_id = ? AND run_id = ?`)
    .bind(state.status === 'insolvent' ? 0 : ownerStakeOf(state), state.month, state.status !== 'playing' ? 1 : 0, state.status, now, f.key, userId, run.id);
}

/** Un-finish every board row for a run that failed verification. */
export const flagStatements = (env: Env, runId: string) =>
  (['daily_scores', 'weekly_scores', 'challenge_scores'] as const).map((t) => env.DB.prepare(`UPDATE ${t} SET finished = 0, status = 'flagged' WHERE run_id = ?`).bind(runId));

// ---------------------------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------------------------

const LIMIT = 20;
interface ScoreRow { user_id: string; name: string; icon: string; title: string | null; score: number; months: number }

export async function boardFor(env: Env, viewer: UserRow, kind: FixedKind, key: string, limit = LIMIT) {
  const { table, keyCol } = SPEC_COLS[kind];
  const top = await env.DB.prepare(
    `SELECT s.user_id, u.name, u.icon, u.title, s.score, s.months FROM ${table} s JOIN users u ON u.id = s.user_id
     WHERE s.${keyCol} = ? AND s.finished = 1 ORDER BY s.score DESC, s.updated_at ASC LIMIT ${limit}`,
  ).bind(key).all<ScoreRow>();
  const mine = await env.DB.prepare(`SELECT score, months, finished, status FROM ${table} WHERE ${keyCol} = ? AND user_id = ?`)
    .bind(key, viewer.id).first<{ score: number; months: number; finished: number; status: string }>();
  let rank: number | null = null;
  if (mine?.finished) {
    const ahead = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${keyCol} = ? AND finished = 1 AND score > ?`).bind(key, mine.score).first<{ n: number }>();
    rank = (ahead?.n ?? 0) + 1;
  }
  return {
    entries: top.results.map((r, i) => ({ rank: i + 1, id: r.user_id, name: r.name, icon: r.icon, title: r.title, score: r.score, months: r.months, me: r.user_id === viewer.id })),
    me: mine ? { status: mine.status, score: mine.score, months: mine.months, finished: !!mine.finished, rank } : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Weekly event
// ---------------------------------------------------------------------------------------------

export const WEEKLY_REWARD_RANKS = 10;
export const weeklyGems = (rank: number): number => (rank === 1 ? 100 : rank <= 3 ? 60 : rank <= WEEKLY_REWARD_RANKS ? 30 : 0);

const previousWeek = (): string => isoWeek(new Date(Date.now() - 7 * 86_400_000));

export async function weeklyView(env: Env, viewer: UserRow, weekParam: string | undefined) {
  const current = isoWeek();
  const week = weekParam ?? current;
  if (!isValidWeek(week) || week > current) throw new HttpError(400, 'Invalid week.');
  const c = weeklyChallenge(week);
  const board = await boardFor(env, viewer, 'weekly', week);
  // Last week's podium pays gems once, if the viewer finished in the top ten.
  const prev = previousWeek();
  const before = await boardFor(env, viewer, 'weekly', prev);
  const rank = before.me?.finished ? before.me.rank : null;
  const gems = rank && rank <= WEEKLY_REWARD_RANKS ? weeklyGems(rank) : 0;
  const claimed = gems > 0 ? !!(await env.DB.prepare(`SELECT 1 FROM reward_claims WHERE user_id = ? AND kind = 'weekly' AND period = ?`).bind(viewer.id, prev).first()) : false;
  return {
    week, isCurrent: week === current,
    challenge: { seed: c.seed, industryId: c.industryId, companyName: c.companyName, months: FIXED_MONTHS, twist: { id: c.twist.id, name: c.twist.name, blurb: c.twist.blurb } },
    endsInMs: week === current ? msUntilNextWeek() : 0,
    ...board,
    reward: gems > 0 ? { week: prev, rank, gems, claimed } : null,
  };
}

export async function claimWeeklyReward(env: Env, user: UserRow) {
  const prev = previousWeek();
  const { me } = await boardFor(env, user, 'weekly', prev);
  const gems = me?.finished && me.rank && me.rank <= WEEKLY_REWARD_RANKS ? weeklyGems(me.rank) : 0;
  if (!gems) throw new HttpError(409, 'No weekly reward to claim.');
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO reward_claims (user_id, kind, period, gems, created_at) VALUES (?, 'weekly', ?, ?, ?)`).bind(user.id, prev, gems, nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'Already claimed.');
  return { gems, week: prev, rank: me!.rank };
}

// ---------------------------------------------------------------------------------------------
// Friend challenges
// ---------------------------------------------------------------------------------------------

const CHALLENGE_DAYS = 14;
const MAX_ACTIVE_CHALLENGES = 10;

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CHALLENGE_CODE_ALPHABET[b % CHALLENGE_CODE_ALPHABET.length]).join('');
}

export async function createChallenge(env: Env, user: UserRow) {
  const now = nowIso();
  const active = await env.DB.prepare('SELECT COUNT(*) AS n FROM challenges WHERE creator_id = ? AND expires_at > ?').bind(user.id, now).first<{ n: number }>();
  if ((active?.n ?? 0) >= MAX_ACTIVE_CHALLENGES) throw new HttpError(429, 'You have plenty of open challenges already. Wait for one to expire.');
  const expires = new Date(Date.now() + CHALLENGE_DAYS * 86_400_000).toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const res = await env.DB.prepare('INSERT OR IGNORE INTO challenges (code, creator_id, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(code, user.id, now, expires).run();
    if (res.meta.changes) {
      const c = challengeField(code);
      return { code, expiresAt: expires, challenge: { seed: c.seed, industryId: c.industryId, companyName: c.companyName, months: FIXED_MONTHS } };
    }
  }
  throw new HttpError(409, 'Could not make a challenge code. Try again.');
}

export async function challengeView(env: Env, viewer: UserRow, codeParam: string) {
  const code = codeParam.toUpperCase();
  if (!isValidChallengeCode(code)) throw new HttpError(400, 'That challenge code is not valid.');
  const row = await env.DB.prepare(
    `SELECT c.expires_at, u.name AS creator FROM challenges c JOIN users u ON u.id = c.creator_id WHERE c.code = ?`,
  ).bind(code).first<{ expires_at: string; creator: string }>();
  if (!row) throw new HttpError(404, 'No challenge has that code.');
  const c = challengeField(code);
  const board = await boardFor(env, viewer, 'challenge', code, 50);
  return {
    code, creator: row.creator, expiresAt: row.expires_at, expired: row.expires_at < nowIso(),
    challenge: { seed: c.seed, industryId: c.industryId, companyName: c.companyName, months: FIXED_MONTHS },
    ...board,
  };
}
