import { gbp, type Pence } from '../money';
import { trailingPL } from './metrics';
import type { GameState, InsuranceTier } from './state';

/**
 * Insurance: a monthly premium (a small share of what the business turns over) in exchange for
 * a share of the cash cost of theft, breakdowns, inspections, fires and cyber attacks, less an
 * excess. Pure cash accounting: the premium is an expense, a claim is other operating income.
 */
export const INSURANCE_TIERS: readonly InsuranceTier[] = ['none', 'basic', 'full'];

export const COVER: Record<InsuranceTier, { name: string; premiumPct: number; floor: Pence; cover: number; excess: Pence; blurb: string }> = {
  none: { name: 'No cover', premiumPct: 0, floor: 0, cover: 0, excess: 0, blurb: 'Free, but every bad day comes out of your own pocket.' },
  basic: { name: 'Basic cover', premiumPct: 0.005, floor: gbp(40), cover: 0.6, excess: gbp(500), blurb: 'Pays 60% of theft, repairs and inspection costs.' },
  full: { name: 'Full cover', premiumPct: 0.012, floor: gbp(110), cover: 0.9, excess: gbp(250), blurb: 'Pays 90%, including fires and cyber attacks, and shortens outages.' },
};

/** Monthly premium: a share of the last three months' average revenue, with a floor. */
export function premiumFor(s: GameState, tier: InsuranceTier = s.insurance): Pence {
  const c = COVER[tier];
  if (tier === 'none') return 0;
  const t = trailingPL(s, 3);
  const avg = t.months > 0 ? t.summary.revenue / t.months : 0;
  return Math.max(c.floor, Math.round((avg * c.premiumPct) / 100) * 100);
}

/** What an insurer pays towards a loss of `cost` pence. */
export function claimPayout(s: GameState, cost: Pence): Pence {
  const c = COVER[s.insurance];
  if (c.cover === 0) return 0;
  return Math.max(0, Math.round(cost * c.cover) - c.excess);
}

/** Demand during an equipment outage: full cover pays for a rental replacement, so customers hardly notice. */
export const outageDemand = (s: GameState): number => (s.insurance === 'full' ? 0.85 : 0.6);
