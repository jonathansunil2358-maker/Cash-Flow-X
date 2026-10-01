import { chance, type Rng } from '../rng';
import { addTemporaryEffect } from './events';
import { logItem, type GameState } from './state';

/**
 * Pick who supplies you. The cheap supplier saves money but now and then lets you down; the premium
 * one costs more but is reliable and keeps quality creeping up. "Standard" is how the game always
 * worked, so existing companies are unchanged until they choose.
 */
export type SupplierId = 'budget' | 'standard' | 'premium';
export interface SupplierDef { id: SupplierId; name: string; blurb: string; costMult: number; failChance: number; qualityPerMonth: number }
export const SUPPLIERS: SupplierDef[] = [
  { id: 'budget', name: 'Budget supplier', blurb: 'Supplies cost 5% less, but one month in ten a delivery goes wrong and sales dip for two months.', costMult: 0.95, failChance: 0.1, qualityPerMonth: 0 },
  { id: 'standard', name: 'Standard supplier', blurb: 'The usual deal: fair price, no surprises.', costMult: 1, failChance: 0, qualityPerMonth: 0 },
  { id: 'premium', name: 'Premium supplier', blurb: 'Supplies cost 5% more, but never let you down and quality creeps up.', costMult: 1.05, failChance: 0, qualityPerMonth: 0.08 },
];
export const supplierDef = (id: string | undefined): SupplierDef => SUPPLIERS.find((x) => x.id === id) ?? SUPPLIERS[1];
export const supplierMult = (s: GameState): number => supplierDef(s.supplier).costMult;
export const SUPPLIER_SWITCH_MONTHS = 3;

export function supplierCheck(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (!SUPPLIERS.some((x) => x.id === id)) return { ok: false, reason: 'Unknown supplier.' };
  if ((s.supplier ?? 'standard') === id) return { ok: false, reason: 'You already use that supplier.' };
  if (s.supplierSince !== undefined && s.month - s.supplierSince < SUPPLIER_SWITCH_MONTHS) return { ok: false, reason: `You switched recently. Wait ${SUPPLIER_SWITCH_MONTHS - (s.month - s.supplierSince)} more month(s).` };
  return { ok: true };
}

export function setSupplier(s: GameState, id: SupplierId): void {
  s.supplier = id === 'standard' ? undefined : id;
  s.supplierSince = s.month;
  logItem(s, 'action', `New supplier: ${supplierDef(id).name}`, supplierDef(id).blurb);
}

/** Monthly: the premium supplier lifts quality; the budget one sometimes fails. Draws random numbers only for a non-standard supplier. */
export function advanceSuppliers(s: GameState, rng: Rng, simulation: boolean): void {
  if (!s.supplier) return;
  const d = supplierDef(s.supplier);
  if (d.qualityPerMonth) s.quality = Math.min(100, s.quality + d.qualityPerMonth);
  if (simulation || !d.failChance) return;
  if (!s.economy.active.some((a) => a.type === 'supplier-fail') && chance(rng, d.failChance)) {
    addTemporaryEffect(s, 'supplier-fail', 'Supplier delivery problem', 2, { demandMult: 0.88 });
    logItem(s, 'event', 'Your budget supplier let you down', 'A late, short delivery left shelves bare. Sales will dip for a couple of months.');
  }
}
