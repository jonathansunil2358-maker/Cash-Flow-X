import type { IndustryConfig } from './industries';
import { headcount, type GameState } from './state';
import type { Pence } from '../money';

/**
 * Growing pains: a business that grows has to move to bigger premises (a capitalised fit-out and a
 * higher base rent), and a team run flat out for months gets worn down.
 */

/** Staff numbers at which the business outgrows its premises. */
export const PREMISES_STEPS = [10, 25, 50, 100];

export const premisesTier = (heads: number): number => PREMISES_STEPS.filter((n) => heads >= n).length;

/** Monthly base rent for a premises tier: each move adds 40% to the base rent. */
export const baseRentFor = (ind: IndustryConfig, tier: number): Pence => Math.round(ind.rentBase * (1 + 0.4 * tier));

/** Fit-out of the premises for a tier: about four months of its full rent, capitalised as PP&E. */
export const fitOutFor = (ind: IndustryConfig, tier: number): Pence =>
  tier <= 0 ? 0 : Math.round((ind.rentBase + ind.rentPerHead * PREMISES_STEPS[tier - 1]) * 4);

/** Fit-outs are depreciated over seven years. */
export const FIT_OUT_LIFE_MONTHS = 84;

export interface PremisesMove { fromTier: number; toTier: number; fitOut: Pence; staffLimit: number }

/** The move that hiring `extra` more people would trigger, or null if they still fit. */
export function premisesMove(s: GameState, ind: IndustryConfig, extra: number): PremisesMove | null {
  const fromTier = premisesTier(headcount(s));
  const toTier = premisesTier(headcount(s) + extra);
  if (toTier <= fromTier) return null;
  let fitOut = 0;
  for (let t = fromTier + 1; t <= toTier; t++) fitOut += fitOutFor(ind, t);
  return { fromTier, toTier, fitOut, staffLimit: PREMISES_STEPS[fromTier] };
}

/** Running above this share of capacity builds strain; below the lower bound it eases. */
export const STRAIN_ON = 0.95;
export const STRAIN_OFF = 0.85;

/** Next month's strain (0-1) after a month at `utilisation`. */
export function nextStrain(strain: number, utilisation: number): number {
  if (utilisation > STRAIN_ON) return Math.min(1, strain + 0.1);
  if (utilisation < STRAIN_OFF) return Math.max(0, strain - 0.2);
  return Math.max(0, strain - 0.05);
}
