import { cr, dr, post } from '../ledger/journal';
import { allocate, formatGBP, type Pence } from '../money';
import { logItem, type GameState, type OutsideHolder } from './state';
import { valuationOf } from './valuation';

/** Outside investors may own at most this share of a company. */
export const MAX_OUTSIDE_SHARE = 0.49;

export const activeHolders = (s: GameState): OutsideHolder[] => s.outsideHolders.filter((h) => h.status === 'active');
export const outsideShares = (s: GameState): number => activeHolders(s).reduce((a, h) => a + h.shares, 0);
export const outsideFraction = (s: GameState): number => outsideShares(s) / s.shares.total;

/** New shares issued for `amount` at `preMoney` (the company's equity value before the money). */
export const sharesFor = (s: GameState, amount: Pence, preMoney: Pence): number =>
  Math.max(1, Math.round((s.shares.total * amount) / Math.max(1, preMoney)));

/** Would this investment push outside investors above 49%? */
export function investmentAllowed(s: GameState, amount: Pence, preMoney: Pence): { ok: boolean; reason?: string } {
  if (!Number.isInteger(amount) || amount < 1_000_00) return { ok: false, reason: 'Minimum investment is £1,000.' };
  if (!Number.isInteger(preMoney) || preMoney <= 0) return { ok: false, reason: 'The company has no valuation yet.' };
  const added = sharesFor(s, amount, preMoney);
  const after = (outsideShares(s) + added) / (s.shares.total + added);
  if (after > MAX_OUTSIDE_SHARE) return { ok: false, reason: `Outside investors would own ${(after * 100).toFixed(1)}%, above the 49% limit.` };
  return { ok: true };
}

/**
 * Accept a holding company member's investment: new shares issued for cash (IFRS: cash in, share
 * capital up), recorded as an outside holder so future dividends and buy-outs reach them.
 */
export function acceptInvestment(
  s: GameState, inv: { investmentId: string; investorId: string; investorName: string; amount: Pence; preMoney: Pence },
): void {
  if (s.outsideHolders.some((h) => h.id === inv.investmentId)) throw new Error('That investment was already accepted.');
  const check = investmentAllowed(s, inv.amount, inv.preMoney);
  if (!check.ok) throw new Error(check.reason);
  const shares = sharesFor(s, inv.amount, inv.preMoney);
  post(s.ledger, s.month, `Shares issued to ${inv.investorName} (holding company investment)`, [dr('cash', inv.amount), cr('shareCapital', inv.amount)], {
    cf: 'financing', cfLabel: 'Proceeds from issue of shares (net of costs)',
  });
  s.shares.total += shares;
  s.outsideHolders.push({
    id: inv.investmentId, investorId: inv.investorId, investorName: inv.investorName.slice(0, 24), shares, invested: inv.amount,
    dividends: 0, buyout: 0, status: 'active',
  });
  logItem(s, 'action', `${inv.investorName} invested ${formatGBP(inv.amount)}`,
    `New shares at a ${formatGBP(inv.preMoney)} pre-money valuation. Outside investors now own ${(outsideFraction(s) * 100).toFixed(1)}%.`);
}

/** Share out a dividend's outside-holder portion (called when a dividend is paid). */
export function distributeDividend(s: GameState, amount: Pence): void {
  const holders = activeHolders(s);
  if (!holders.length) return;
  const parts = allocate(Math.round((amount * outsideShares(s)) / s.shares.total), holders.map((h) => h.shares));
  holders.forEach((h, i) => (h.dividends += parts[i]));
}

/**
 * Buy out outside investors at the current equity valuation, paid from company cash (a share
 * buy-back, charged to retained earnings). If cash can't cover it, the shortfall is written off
 * and investors receive what there is. Used on prestige and when a member leaves.
 */
export function buyOutHolders(s: GameState, holderIds?: string[]): Pence {
  const holders = activeHolders(s).filter((h) => !holderIds || holderIds.includes(h.id));
  if (!holders.length) return 0;
  const equity = s.status === 'insolvent' ? 0 : valuationOf(s).equityValue;
  const owed = holders.map((h) => Math.round((equity * h.shares) / s.shares.total));
  const totalOwed = owed.reduce((a, b) => a + b, 0);
  const pay = Math.min(totalOwed, Math.max(0, s.ledger.balances.cash));
  const parts = totalOwed > 0 ? allocate(pay, owed) : owed.map(() => 0);
  if (pay > 0) {
    post(s.ledger, s.month, 'Outside investors bought out (share buy-back)', [dr('retainedEarnings', pay), cr('cash', pay)], {
      cf: 'financing', cfLabel: 'Purchase of own shares',
    });
  }
  holders.forEach((h, i) => {
    h.buyout += parts[i];
    h.status = 'bought-out';
    s.shares.total -= h.shares;
  });
  logItem(s, 'action', 'Investors bought out',
    `Paid ${formatGBP(pay)} to ${holders.length} investor${holders.length > 1 ? 's' : ''}${pay < totalOwed ? ` (${formatGBP(totalOwed - pay)} shortfall written off)` : ''}.`);
  return pay;
}
