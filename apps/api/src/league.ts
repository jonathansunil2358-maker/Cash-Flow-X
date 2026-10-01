import { detectiveOf, isoWeek, journalPuzzle, spotTheMistake, utcDay } from '@cfx/engine';
import type { UserRow } from './auth';
import { HttpError, nowIso, type Env } from './util';

/**
 * Weekly puzzle league. The puzzles are generated from the day, so the server can work out the right
 * answer itself: a point is a verified right answer, only for today's puzzles, once per kind per day.
 */
export const LEAGUE_SIZE = 20;
const KINDS = ['spot', 'detective', 'journal'] as const;
type Kind = (typeof KINDS)[number];

export async function answerPuzzle(env: Env, user: UserRow, body: { kind?: unknown; day?: unknown; answer?: unknown }) {
  const kind = body.kind as Kind;
  if (!KINDS.includes(kind)) throw new HttpError(400, 'Unknown puzzle.');
  const today = utcDay();
  if (body.day !== today) throw new HttpError(400, "That is not today's puzzle.");
  if (typeof body.answer !== 'string' || body.answer.length > 80) throw new HttpError(400, 'Choose an answer.');
  const right = kind === 'spot' ? spotTheMistake(today).answer : kind === 'journal' ? journalPuzzle(today).answer : detectiveOf(today).case.answer;
  const correct = body.answer === right ? 1 : 0;
  const res = await env.DB.prepare('INSERT OR IGNORE INTO puzzle_answers (user_id, day, kind, correct, week, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(user.id, today, kind, correct, isoWeek(), nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'You already answered that puzzle today.');
  return { correct: !!correct };
}

export async function leagueView(env: Env, viewer: UserRow) {
  const week = isoWeek();
  const top = await env.DB.prepare(
    `SELECT a.user_id AS id, u.name, u.icon, SUM(a.correct) AS points, COUNT(*) AS answered FROM puzzle_answers a JOIN users u ON u.id = a.user_id
     WHERE a.week = ? GROUP BY a.user_id HAVING points > 0 ORDER BY points DESC, answered ASC, MIN(a.created_at) ASC LIMIT ${LEAGUE_SIZE}`,
  ).bind(week).all<{ id: string; name: string; icon: string; points: number; answered: number }>();
  const mine = await env.DB.prepare('SELECT COALESCE(SUM(correct), 0) AS points, COUNT(*) AS answered FROM puzzle_answers WHERE week = ? AND user_id = ?').bind(week, viewer.id).first<{ points: number; answered: number }>();
  return {
    week, maxPoints: 21,
    mine: { points: mine?.points ?? 0, answered: mine?.answered ?? 0 },
    rows: top.results.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, icon: r.icon, points: r.points, me: r.id === viewer.id })),
  };
}
