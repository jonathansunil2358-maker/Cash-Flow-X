import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { logItem, type GameState } from './state';
import { plSummary } from '../ledger/statements';

/**
 * Product designer: a single "features" slider from basic (0) to loaded (100). The middle, 50, is how the
 * game has always worked. More features win more customers but cost more to build; fewer features are cheap
 * but sell less. Changing the design costs a month's thinking time and can be done once a quarter.
 */
export const DESIGN_DEFAULT = 50;
export const DESIGN_COOLDOWN = 3;
export const designOf = (s: GameState): number => s.design ?? DESIGN_DEFAULT;
export const designDemandMult = (s: GameState): number => 1 + ((designOf(s) - DESIGN_DEFAULT) / 50) * 0.06;
export const designCostMult = (s: GameState): number => 1 + ((designOf(s) - DESIGN_DEFAULT) / 50) * 0.05;

const lastRevenue = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
export const designFee = (s: GameState): Pence => Math.max(500_00, Math.round((lastRevenue(s) * 0.03) / 10000) * 10000);

export function designCheck(s: GameState, features: number): { ok: boolean; reason?: string; fee: Pence } {
  const fee = designFee(s);
  if (!Number.isInteger(features) || features < 0 || features > 100) return { ok: false, reason: 'Features must be a whole number from 0 to 100.', fee };
  if (features === designOf(s)) return { ok: false, reason: 'That is already your design.', fee };
  if (s.designSince !== undefined && s.month - s.designSince < DESIGN_COOLDOWN) return { ok: false, reason: `You redesigned recently. Wait ${DESIGN_COOLDOWN - (s.month - s.designSince)} more month(s).`, fee };
  return { ok: true, fee };
}

export function setDesign(s: GameState, features: number): void {
  const fee = designFee(s);
  post(s.ledger, s.month, 'Product redesign', [dr('research', fee), cr('cash', fee)], { cf: 'operating' });
  s.design = features === DESIGN_DEFAULT ? undefined : features;
  s.designSince = s.month;
  logItem(s, 'action', `Product redesigned: ${features} features`, `It cost ${formatGBP(fee)}. Sales should ${features > DESIGN_DEFAULT ? 'grow, and so will your costs' : features < DESIGN_DEFAULT ? 'soften, but your costs fall' : 'return to the usual level'}.`);
}
