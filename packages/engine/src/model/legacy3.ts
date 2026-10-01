import { plSummary } from '../ledger/statements';
import { INDUSTRIES, type IndustryId } from './industries';
import type { Profile, RunSummary } from './prestige';
import type { GameState } from './state';

// ---------------------------------------------------------------------------------------------
// Dynasty: your finished companies as a family tree
// ---------------------------------------------------------------------------------------------
export interface Generation { n: number; companies: { name: string; sector: string; emoji: string; stake: number; months: number; outcome: RunSummary['outcome'] }[]; best: number }
/** Runs are grouped five to a generation, oldest first. */
export function dynastyOf(p: Pick<Profile, 'runs'>): Generation[] {
  const out: Generation[] = [];
  const runs = [...p.runs];
  for (let i = 0; i < runs.length; i += 5) {
    const slice = runs.slice(i, i + 5);
    out.push({
      n: out.length + 1, best: Math.max(...slice.map((r) => r.ownerStake)),
      companies: slice.map((r) => ({ name: r.companyName, sector: INDUSTRIES[r.industryId]?.name ?? r.industryId, emoji: INDUSTRIES[r.industryId]?.emoji ?? '🏢', stake: r.ownerStake, months: r.months, outcome: r.outcome })),
    });
  }
  return out;
}
export const INHERITANCE_GEMS = 20;
export const inheritanceClaimed = (p: Pick<Profile, 'dynastyClaimed'>): number => p.dynastyClaimed ?? 0;
/** A generation is complete when it has five companies; each completed one pays an inheritance once. */
export function claimableGenerations(p: Pick<Profile, 'runs' | 'dynastyClaimed'>): number {
  return Math.max(0, Math.floor(p.runs.length / 5) - inheritanceClaimed(p));
}
export function claimInheritance<T extends Pick<Profile, 'runs' | 'dynastyClaimed' | 'gems'>>(p: T): T {
  const n = claimableGenerations(p);
  if (n < 1) throw new Error('No generation is complete yet. Finish five companies to complete one.');
  return { ...p, gems: p.gems + n * INHERITANCE_GEMS, dynastyClaimed: inheritanceClaimed(p) + n };
}

// ---------------------------------------------------------------------------------------------
// Mastery challenges: hand-picked "perfect run" goals
// ---------------------------------------------------------------------------------------------
export interface MasteryChallenge { id: string; name: string; text: string; sector: IndustryId | null; check: (s: GameState) => boolean }
const profitableStreak = (s: GameState, n: number): boolean => s.history.length >= n && s.history.slice(-n).every((h) => plSummary(h.period.pl).profit > 0);
const neverOverdrawn = (s: GameState, n: number): boolean => s.history.length >= n && s.history.slice(-n).every((h) => h.closing.cash >= 0);
export const MASTERY_CHALLENGES: MasteryChallenge[] = [
  { id: 'streak12', name: 'Twelve in the black', text: 'Make a profit in 12 months in a row.', sector: null, check: (s) => profitableStreak(s, 12) },
  { id: 'clean24', name: 'Never overdrawn', text: 'Stay out of your overdraft for 24 months in a row.', sector: null, check: (s) => neverOverdrawn(s, 24) },
  { id: 'lean', name: 'Lean and mean', text: 'Be worth £1m with a team of eight or fewer.', sector: null, check: (s) => (s.history.at(-1)?.valuation?.equityValue ?? 0) >= 1_000_000_00 && s.staff.ops + s.staff.rnd + s.staff.sales <= 8 },
  { id: 'trusted', name: 'Trusted name', text: 'Reach a reputation of 80 or more.', sector: null, check: (s) => s.reputation >= 80 },
  { id: 'debtfree', name: 'Debt-free grower', text: 'Be worth £2m with no loans.', sector: null, check: (s) => (s.history.at(-1)?.valuation?.equityValue ?? 0) >= 2_000_000_00 && s.loans.length === 0 },
  { id: 'soft-saas', name: 'Subscription star', text: 'Reach 2,000 customers in a software company.', sector: 'software', check: (s) => s.industryId === 'software' && (s.history.at(-1)?.kpis.customers ?? 0) >= 2000 },
  { id: 'rest-full', name: 'Full house', text: 'Run a restaurant above 90% of capacity and profitable.', sector: 'restaurant', check: (s) => s.industryId === 'restaurant' && (s.history.at(-1)?.kpis.utilisation ?? 0) > 0.9 && profitableStreak(s, 3) },
  { id: 'shop-global', name: 'Selling worldwide', text: 'Open two export markets in an e-commerce company.', sector: 'ecommerce', check: (s) => s.industryId === 'ecommerce' && (s.markets?.length ?? 0) >= 2 },
  { id: 'gym-quality', name: 'Premium gym', text: 'Run a fitness business with quality above 75.', sector: 'fitness', check: (s) => s.industryId === 'fitness' && s.quality > 75 },
  { id: 'cloth-lean', name: 'Fast fashion, fast cash', text: 'Run a clothing brand with a cash conversion cycle under 60 days for a month.', sector: 'clothing', check: (s) => s.industryId === 'clothing' && s.customerDays + 0 <= 45 && s.stockCoverMonths <= 2 },
  { id: 'auto-fleet', name: 'Fleet owner', text: 'Be worth £3m in a car business.', sector: 'automotive', check: (s) => s.industryId === 'automotive' && (s.history.at(-1)?.valuation?.equityValue ?? 0) >= 3_000_000_00 },
];
export const challengesFor = (sector: IndustryId): MasteryChallenge[] => MASTERY_CHALLENGES.filter((c) => c.sector === null || c.sector === sector);
export const challengesDone = (p: Pick<Profile, 'mchallenges'>): string[] => (p.mchallenges ?? []).filter((id) => MASTERY_CHALLENGES.some((c) => c.id === id));
export const CHALLENGE_GEMS = 15;
/** Challenges the company has just met that the player has not yet been paid for. */
export function newlyMet(s: GameState, p: Pick<Profile, 'mchallenges'>): MasteryChallenge[] {
  const done = new Set(challengesDone(p));
  return challengesFor(s.industryId).filter((c) => !done.has(c.id) && c.check(s));
}
