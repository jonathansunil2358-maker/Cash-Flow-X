import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { chance, type Rng } from '../rng';
import { adjustReputation } from './events';
import { logItem, type GameState } from './state';
import { plSummary } from '../ledger/statements';

/**
 * Franchising: license your name to others. Setting a franchise up costs half a month of your sales;
 * each one then pays you a royalty of 4% of your monthly sales. Franchisees are not you, though: now and
 * then one lets standards slip and your reputation takes the hit. This is the smallest honest version
 * (royalty income and reputation risk), not a model of other companies.
 */
export const MAX_FRANCHISES = 5;
export const FRANCHISE_MIN_MONTH = 12;
export const FRANCHISE_MIN_REPUTATION = 40;
export const ROYALTY_RATE = 0.04;
export const SLIP_CHANCE = 0.02;

const lastRevenue = (s: GameState): Pence => {
  const r = s.history.at(-1);
  return r ? plSummary(r.period.pl).revenue : 0;
};
export const franchiseCount = (s: GameState): number => s.franchises ?? 0;
export const franchiseFee = (s: GameState): Pence => Math.max(5_000_00, Math.round((lastRevenue(s) * 0.5) / 10000) * 10000);
export const royaltyEach = (s: GameState): Pence => Math.round(lastRevenue(s) * ROYALTY_RATE);

export function franchiseCheck(s: GameState): { ok: boolean; reason?: string; fee: Pence } {
  const fee = franchiseFee(s);
  if (s.month < FRANCHISE_MIN_MONTH) return { ok: false, reason: `Franchisees want a track record: wait until month ${FRANCHISE_MIN_MONTH + 1}.`, fee };
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'You need sales before anyone will pay to use your name.', fee };
  if (s.reputation < FRANCHISE_MIN_REPUTATION) return { ok: false, reason: `Your reputation must be at least ${FRANCHISE_MIN_REPUTATION} first.`, fee };
  if (franchiseCount(s) >= MAX_FRANCHISES) return { ok: false, reason: `You can have at most ${MAX_FRANCHISES} franchises.`, fee };
  return { ok: true, fee };
}

export function addFranchise(s: GameState): void {
  const fee = franchiseFee(s);
  post(s.ledger, s.month, 'Franchise set-up: legal work and training', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  s.franchises = franchiseCount(s) + 1;
  logItem(s, 'action', `Franchise number ${s.franchises} opens`, `Set-up cost ${formatGBP(fee)}. It will pay you about ${formatGBP(royaltyEach(s))} a month in royalties.`);
}

/** Monthly royalties, and the odd franchisee who lets standards slip. */
export function advanceFranchises(s: GameState, rng: Rng, simulation: boolean): void {
  const n = franchiseCount(s);
  if (!n) return;
  const royalty = royaltyEach(s) * n;
  if (royalty > 0) post(s.ledger, s.month, `Franchise royalties (${n})`, [dr('cash', royalty), cr('otherIncome', royalty)], { cf: 'operating' });
  if (simulation) return;
  for (let i = 0; i < n; i++) {
    if (chance(rng, SLIP_CHANCE)) {
      adjustReputation(s, -3);
      logItem(s, 'warning', 'A franchisee let standards slip', 'Customers blamed your name. Reputation fell a little.');
    }
  }
}
