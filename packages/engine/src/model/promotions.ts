import { gbp, type Pence } from '../money';
import type { IndustryConfig } from './industries';
import { monthOfYear, type GameState } from './state';

/**
 * Promotions and seasonality. A promotion is a temporary price discount: the lift in demand comes
 * out of the existing price elasticity (nothing is hard-coded), the discount comes straight out of
 * revenue, and the pull-forward leaves a one-month dip afterwards.
 */
export const PROMO_DISCOUNTS = [10, 20, 30] as const;
export const PROMO_MAX_MONTHS = 3;
export const PROMO_COOLDOWN_MONTHS = 3;
/** Demand in the month after a promotion of two months or more: customers already bought. */
export const PROMO_DIP = 0.85;
const MIN_SETUP_FEE: Pence = gbp(500);

/** Seasonal demand multiplier for the month being simulated (mean 1.0 over the year). */
export const seasonFactor = (s: GameState, ind: IndustryConfig): number => ind.seasonality[monthOfYear(s.month)] ?? 1;

/** The seasonal multiplier for any month number (used to look ahead). */
export const seasonalFactor = (ind: IndustryConfig, month: number): number => ind.seasonality[monthOfYear(month)] ?? 1;

/** The price customers actually pay this month, after any promotion. */
export const effectivePrice = (s: GameState): Pence =>
  s.promo ? Math.round(s.price * (1 - s.promo.discountPct / 100)) : s.price;

/** Demand multiplier from the after-promotion dip. */
export const promoDemandMult = (s: GameState): number => (!s.promo && s.promoDipMonths > 0 ? PROMO_DIP : 1);

/** One-off cost of launching a promotion: about half a month of marketing, with a floor. */
export const promoSetupFee = (s: GameState): Pence => Math.max(MIN_SETUP_FEE, Math.round((s.marketingBudget * 0.5) / 100) * 100);

export interface PromoCheck {
  allowed: boolean;
  reason?: string;
  fee: Pence;
}

export function promoCheck(s: GameState): PromoCheck {
  const fee = promoSetupFee(s);
  if (s.promo) return { allowed: false, reason: 'A promotion is already running.', fee };
  if (s.promoCooldown > 0) return { allowed: false, reason: `Customers need a rest: ${s.promoCooldown} more month${s.promoCooldown === 1 ? '' : 's'} before the next promotion.`, fee };
  return { allowed: true, fee };
}

/** Called once a month after trading: runs the promotion down, then the dip, then the cooldown. */
export function advancePromo(s: GameState): void {
  if (s.promo) {
    s.promo.monthsLeft -= 1;
    if (s.promo.monthsLeft <= 0) {
      s.promoDipMonths = s.promo.months >= 2 ? 1 : 0;
      s.promoCooldown = PROMO_COOLDOWN_MONTHS;
      s.promo = null;
    }
    return;
  }
  if (s.promoDipMonths > 0) s.promoDipMonths -= 1;
  if (s.promoCooldown > 0) s.promoCooldown -= 1;
}
