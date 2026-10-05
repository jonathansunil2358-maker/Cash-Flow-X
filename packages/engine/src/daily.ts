import { hashSeed } from './rng';
import { INDUSTRIES, CORE_INDUSTRY_IDS, type IndustryId } from './model/industries';

/**
 * The daily challenge: one company per UTC day, the same for everybody. It is a pure function of
 * the date, so the game and the server always agree on what today's challenge is.
 */
export const DAILY_MONTHS = 24;

export interface DailyChallenge {
  /** UTC calendar day, YYYY-MM-DD. */
  day: string;
  seed: string;
  industryId: IndustryId;
  companyName: string;
  scenarioId: 'daily';
  months: number;
}

export const utcDay = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

export function isValidDay(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && utcDay(d) === day;
}

export function dailyChallenge(day: string): DailyChallenge {
  if (!isValidDay(day)) throw new Error(`Not a valid day: ${String(day)}`);
  const seed = `DAILY-${day}`;
  const industryId = CORE_INDUSTRY_IDS[hashSeed(seed) % CORE_INDUSTRY_IDS.length];
  return { day, seed, industryId, companyName: `Daily ${INDUSTRIES[industryId].name.split(' ')[0]} Ltd`, scenarioId: 'daily', months: DAILY_MONTHS };
}

/** Milliseconds until the next daily challenge begins (UTC midnight). */
export function msUntilNextDaily(now: Date = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();
}
