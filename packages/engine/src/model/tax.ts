import type { Pence } from '../money';

export const SMALL_PROFITS_LIMIT: Pence = 50_000_00;
export const MAIN_RATE_LIMIT: Pence = 250_000_00;
export const SMALL_PROFITS_RATE = 0.19;
export const MAIN_RATE = 0.25;
/** Months after the year end that corporation tax is paid (9 months and 1 day -> the 10th month). */
export const TAX_PAYMENT_LAG = 10;

/**
 * UK corporation tax on annual taxable profits (from April 2023): 19% up to £50k, 25% above
 * £250k, with marginal relief in between (standard fraction 3/200).
 */
export function corporationTax(annualProfit: Pence): Pence {
  if (annualProfit <= 0) return 0;
  if (annualProfit <= SMALL_PROFITS_LIMIT) return Math.round(annualProfit * SMALL_PROFITS_RATE);
  if (annualProfit >= MAIN_RATE_LIMIT) return Math.round(annualProfit * MAIN_RATE);
  const relief = (3 / 200) * (MAIN_RATE_LIMIT - annualProfit);
  return Math.round(annualProfit * MAIN_RATE - relief);
}

export function effectiveTaxRate(annualProfit: Pence): number {
  return annualProfit > 0 ? corporationTax(annualProfit) / annualProfit : SMALL_PROFITS_RATE;
}
