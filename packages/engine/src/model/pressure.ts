import type { Pence } from '../money';
import { gbp } from '../money';
import { DIFFICULTIES } from './difficulty';
import { annualise, trailingPL } from './metrics';
import type { GameState } from './state';

/**
 * The slow squeeze: the bigger and more prestigious a company gets, the more the world pushes back.
 *  - Wages and rents rise every new year (and faster with the "Runaway inflation" modifier).
 *  - Compliance, audit and legal costs grow with revenue, faster than the business itself.
 *  - Every prestige rank makes suppliers dearer and rivals sharper, so the rank bonus has to be earned back.
 */
export const WAGE_INFLATION = 0.04;
export const RENT_INFLATION = 0.02;
export const COMPLIANCE_START: Pence = gbp(2_000_000);
export const COMPLIANCE_PER_DOUBLING = 0.003;
export const COMPLIANCE_MAX = 0.02;
export const RANK_COST_PER_RANK = 0.015;
export const RANK_RIVAL_PER_RANK = 0.1;

export const hasModifier = (s: GameState, id: string): boolean => (s.modifiers ?? []).includes(id);

export const wageInflation = (s: GameState): number => WAGE_INFLATION * (hasModifier(s, 'inflation') ? 2 : 1);

/** Share of revenue spent on compliance, audit and legal: zero up to £1m a year, then 0.4% per doubling, capped at 3%. */
export const complianceRate = (annualRevenue: Pence): number =>
  annualRevenue <= COMPLIANCE_START ? 0 : Math.min(COMPLIANCE_MAX, COMPLIANCE_PER_DOUBLING * Math.log2(annualRevenue / COMPLIANCE_START));

/** This month's compliance bill, from the last twelve months of revenue. */
export function complianceCost(s: GameState): Pence {
  const t = trailingPL(s, 12);
  const annual = annualise(t.summary.revenue, t.months);
  return Math.round((annual / 12) * complianceRate(annual));
}

const ranked = (s: GameState): number => (DIFFICULTIES[s.difficulty].perksApply ? Math.max(0, s.prestigeLevel ?? 0) : 0);
/** Supplier costs rise with prestige rank. */
export const rankCostMult = (s: GameState): number => 1 + RANK_COST_PER_RANK * ranked(s);
/** Rivals get sharper with prestige rank. */
export const rivalPressure = (s: GameState): number => (1 + RANK_RIVAL_PER_RANK * ranked(s)) * (hasModifier(s, 'aggressive-rivals') ? 1.5 : 1);
