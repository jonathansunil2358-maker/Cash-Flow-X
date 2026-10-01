import { dailyChallenge, DAILY_MONTHS, isValidDay, msUntilNextDaily, utcDay } from '@cfx/engine';
import type { UserRow } from './auth';
import { HttpError, type Env } from './util';

const LIMIT = 20;

interface ScoreRow {
  user_id: string;
  name: string;
  icon: string;
  score: number;
  months: number;
}

/** Today's (or an earlier day's) challenge, the top finished companies, and where the viewer stands. */
export async function dailyBoard(env: Env, viewer: UserRow, dayParam: string | undefined) {
  const today = utcDay();
  const day = dayParam ?? today;
  if (!isValidDay(day) || day > today) throw new HttpError(400, 'Invalid day.');
  const top = await env.DB.prepare(
    `SELECT s.user_id, u.name, u.icon, s.score, s.months FROM daily_scores s JOIN users u ON u.id = s.user_id
     WHERE s.day = ? AND s.finished = 1 ORDER BY s.score DESC, s.updated_at ASC LIMIT ${LIMIT}`,
  ).bind(day).all<ScoreRow>();
  const mine = await env.DB.prepare(`SELECT score, months, finished, status FROM daily_scores WHERE day = ? AND user_id = ?`)
    .bind(day, viewer.id).first<{ score: number; months: number; finished: number; status: string }>();
  let rank: number | null = null;
  if (mine?.finished) {
    const ahead = await env.DB.prepare(`SELECT COUNT(*) AS n FROM daily_scores WHERE day = ? AND finished = 1 AND score > ?`).bind(day, mine.score).first<{ n: number }>();
    rank = (ahead?.n ?? 0) + 1;
  }
  const challenge = dailyChallenge(day);
  return {
    day,
    isToday: day === today,
    challenge: { seed: challenge.seed, industryId: challenge.industryId, companyName: challenge.companyName, months: DAILY_MONTHS },
    endsInMs: day === today ? msUntilNextDaily() : 0,
    entries: top.results.map((r, i) => ({ rank: i + 1, id: r.user_id, name: r.name, icon: r.icon, score: r.score, months: r.months, me: r.user_id === viewer.id })),
    me: mine ? { status: mine.status, score: mine.score, months: mine.months, finished: !!mine.finished, rank } : null,
  };
}
