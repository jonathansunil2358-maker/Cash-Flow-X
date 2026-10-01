import { hashSeed } from './rng';
import { INDUSTRIES, INDUSTRY_IDS, type IndustryId } from './model/industries';
import type { EventEffects } from './model/state';

/**
 * "Fixed field" games: the server (and this pure code) decides the company, so every player starts
 * level. The daily challenge, the weekly event and friend challenges all work this way; the daily
 * lives in daily.ts, this file adds the other two.
 */
export const FIXED_MONTHS = 24;

/** ISO 8601 week as YYYY-Www (weeks start on Monday, in UTC). */
export function isoWeek(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function isValidWeek(week: unknown): week is string {
  if (typeof week !== 'string' || !/^\d{4}-W\d{2}$/.test(week)) return false;
  const [y, w] = week.split('-W').map(Number);
  if (w < 1 || w > 53 || y < 2000 || y > 2200) return false;
  // Round-trip: the Thursday of that ISO week must report the same week.
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * 86_400_000 + (w - 1) * 7 * 86_400_000);
  return isoWeek(monday) === week;
}

/** Milliseconds until the next week begins (Monday 00:00 UTC). */
export function msUntilNextWeek(now: Date = new Date()): number {
  const dow = now.getUTCDay() || 7;
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (8 - dow)) - now.getTime();
}

export interface Twist {
  id: string;
  name: string;
  blurb: string;
  effects: EventEffects;
}

/** The six twists a weekly event can have; each lasts the whole game and is shown to the player. */
export const WEEKLY_TWISTS: Twist[] = [
  { id: 'credit-crunch', name: 'Credit crunch', blurb: 'Banks lend far less, so cash is king.', effects: { lendingAppetite: 0.55 } },
  { id: 'boom', name: 'Boom time', blurb: 'Demand is 12% higher all game: grow fast, but rivals feel it too.', effects: { demandMult: 1.12 } },
  { id: 'supply-shock', name: 'Supply shock', blurb: 'Your supplies cost 15% more all game.', effects: { unitCostMult: 1.15 } },
  { id: 'gold-rush', name: 'Gold rush', blurb: 'Demand +20% and supplies +10%: busy, but pricey.', effects: { demandMult: 1.2, unitCostMult: 1.1 } },
  { id: 'frugal', name: 'Frugal week', blurb: 'Shoppers hold back (demand −10%) but suppliers are cheaper (−8%).', effects: { demandMult: 0.9, unitCostMult: 0.92 } },
  { id: 'bad-payers', name: 'Slow payers', blurb: 'Customers pay late and default far more often: watch your credit terms.', effects: { badDebtRate: 0.012 } },
];
export const twistOf = (id: string | null | undefined): Twist | undefined => WEEKLY_TWISTS.find((t) => t.id === id);

export interface FixedChallenge {
  key: string;
  seed: string;
  industryId: IndustryId;
  companyName: string;
  months: number;
}

export interface WeeklyChallenge extends FixedChallenge {
  week: string;
  scenarioId: 'weekly';
  twist: Twist;
}

export function weeklyChallenge(week: string): WeeklyChallenge {
  if (!isValidWeek(week)) throw new Error(`Not a valid week: ${String(week)}`);
  const seed = `WEEKLY-${week}`;
  const industryId = INDUSTRY_IDS[hashSeed(`${seed}:sector`) % INDUSTRY_IDS.length];
  const twist = WEEKLY_TWISTS[hashSeed(`${seed}:twist`) % WEEKLY_TWISTS.length];
  return { key: week, week, seed, industryId, twist, companyName: `Weekly ${INDUSTRIES[industryId].name.split(' ')[0]} Ltd`, scenarioId: 'weekly', months: FIXED_MONTHS };
}

/** The twist for a weekly seed (used by newGame so the client and server always agree). */
export function twistForSeed(seed: string): Twist {
  return WEEKLY_TWISTS[hashSeed(`${seed}:twist`) % WEEKLY_TWISTS.length];
}

export interface ChallengeField extends FixedChallenge {
  code: string;
  scenarioId: 'challenge';
}

export const CHALLENGE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const isValidChallengeCode = (code: unknown): code is string => typeof code === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(code);

/** A friend challenge: the code decides everything, so anybody holding it plays the same company. */
export function challengeField(code: string): ChallengeField {
  if (!isValidChallengeCode(code)) throw new Error('Not a valid challenge code.');
  const seed = `CH-${code}`;
  const industryId = INDUSTRY_IDS[hashSeed(`${seed}:sector`) % INDUSTRY_IDS.length];
  return { key: code, code, seed, industryId, companyName: `Challenge ${INDUSTRIES[industryId].name.split(' ')[0]} Ltd`, scenarioId: 'challenge', months: FIXED_MONTHS };
}
