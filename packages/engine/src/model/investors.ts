import { cr, dr, post } from '../ledger/journal';
import { allocate, formatGBP, formatPct, type Pence } from '../money';
import { logItem, ownership, type GameState, type OutsideHolder } from './state';
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
    dividends: 0, buyout: 0, status: 'active', since: s.month,
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

/** Record shares issued to outside investors (angels, funds) so they can be bought back later. */
export function addOutsideHolder(s: GameState, name: string, shares: number, invested: Pence, investorId = 'angel'): void {
  s.outsideHolders.push({
    id: `${investorId}-${s.month}-${s.outsideHolders.length}`, investorId, investorName: name.slice(0, 24), shares, invested,
    dividends: 0, buyout: 0, status: 'active', since: s.month,
  });
}

/** Holders you can bargain with: angels, funds and sellers. Players in your holding company are paid at fair value only. */
export const isNegotiable = (h: OutsideHolder): boolean => ['vc', 'seller', 'angel'].includes(h.investorId);

/** Months a new investor must stay before you can buy their shares back. */
export const BUYBACK_LOCKUP = 6;
const MAX_PREMIUM = 0.35;

export interface BuybackQuote {
  ok: boolean;
  reason?: string;
  shares: number;
  /** What those shares are worth at your current equity valuation. */
  fair: Pence;
  /** Extra they ask for, as a fraction (0 for players, up to 35% for angels and funds who have done well). */
  premium: number;
  price: Pence;
}

/** The price to buy `pct` percent (10 to 100) of one investor's position back. */
export function buybackQuote(s: GameState, holderId: string, pct: number): BuybackQuote {
  const bad = (reason: string): BuybackQuote => ({ ok: false, reason, shares: 0, fair: 0, premium: 0, price: 0 });
  const h = activeHolders(s).find((x) => x.id === holderId);
  if (!h) return bad('That investor is not a shareholder.');
  if (!Number.isInteger(pct) || pct < 10 || pct > 100) return bad('Choose between 10% and 100% of their stake.');
  if (s.status !== 'playing') return bad('The company is not trading.');
  if (h.since !== undefined && s.month - h.since < BUYBACK_LOCKUP) return bad(`They are locked in until month ${h.since + BUYBACK_LOCKUP}.`);
  const shares = pct === 100 ? h.shares : Math.max(1, Math.floor((h.shares * pct) / 100));
  const equity = valuationOf(s).equityValue;
  if (equity <= 0) return bad('The company has no valuation to buy shares at.');
  const fair = Math.round((equity * shares) / s.shares.total);
  const gain = h.invested > 0 ? (equity * h.shares) / s.shares.total / h.invested - 1 : 0;
  const premium = isNegotiable(h) ? Math.min(MAX_PREMIUM, 0.1 + 0.08 * Math.max(0, gain)) : 0;
  const price = Math.round(fair * (1 + premium));
  if (price < 1_000_00) return bad('That stake is worth less than £1,000: buy more of it at once.');
  if (price > s.ledger.balances.cash) return { ok: false, reason: `You need ${formatGBP(price)} in the bank.`, shares, fair, premium, price };
  return { ok: true, shares, fair, premium, price };
}

/** Buy shares back from one investor (a buy-back: cash out, shares cancelled, charged to retained earnings). */
export function buyBackFrom(s: GameState, holderId: string, pct: number): Pence {
  const q = buybackQuote(s, holderId, pct);
  if (!q.ok) throw new Error(q.reason);
  const h = s.outsideHolders.find((x) => x.id === holderId)!;
  post(s.ledger, s.month, `Shares bought back from ${h.investorName}`, [dr('retainedEarnings', q.price), cr('cash', q.price)], {
    cf: 'financing', cfLabel: 'Purchase of own shares',
  });
  h.shares -= q.shares;
  h.buyout += q.price;
  s.shares.total -= q.shares;
  if (h.shares <= 0) h.status = 'bought-out';
  logItem(s, 'action', `Bought back shares from ${h.investorName}`,
    `Paid ${formatGBP(q.price)} for ${formatPct(q.shares / (s.shares.total + q.shares))} of the company${q.premium > 0 ? `, ${(q.premium * 100).toFixed(0)}% above fair value because they did well` : ' at fair value'}. You now own ${(ownership(s) * 100).toFixed(1)}%.`);
  return q.price;
}
