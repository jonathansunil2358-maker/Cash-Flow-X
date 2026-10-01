import { dailyChallenge, DAILY_MONTHS, isValidDay, msUntilNextDaily, utcDay } from '@cfx/engine';
import type { UserRow } from './auth';
import { boardFor } from './fixed';
import { HttpError, type Env } from './util';

/** Today's (or an earlier day's) challenge, the top finished companies, and where the viewer stands. */
export async function dailyBoard(env: Env, viewer: UserRow, dayParam: string | undefined) {
  const today = utcDay();
  const day = dayParam ?? today;
  if (!isValidDay(day) || day > today) throw new HttpError(400, 'Invalid day.');
  const challenge = dailyChallenge(day);
  return {
    day,
    isToday: day === today,
    challenge: { seed: challenge.seed, industryId: challenge.industryId, companyName: challenge.companyName, months: DAILY_MONTHS },
    endsInMs: day === today ? msUntilNextDaily() : 0,
    ...(await boardFor(env, viewer, 'daily', day)),
  };
}
