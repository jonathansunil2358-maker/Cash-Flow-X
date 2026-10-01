import type { Pence } from '../money';
import { leaseLiabilityTotal } from './leases';
import { annualise, currentBalanceSheet, trailingPL } from './metrics';
import { modifiersOf } from './modifiers';
import { loanPrincipal, type Economy, type GameState, type Loan } from './state';

export const OVERDRAFT_MARGIN = 0.05;
export const COVENANT_MAX_DEBT_EBITDA = 3.5;
export const COVENANT_MIN_INTEREST_COVER = 3;
export const COVENANT_GRACE_MONTHS = 6;
export const MIN_TERM = 12;
export const MAX_TERM = 84;

export const loanRate = (l: Loan, econ: Economy): number => econ.baseRate + l.spread + l.penalty;

export function scheduledRepayment(l: Loan): Pence {
  if (l.monthsRemaining <= 1) return l.principal;
  return Math.round(l.principal / l.monthsRemaining);
}

/** Principal falling due within 12 months (current liability). */
export function currentPortion(loans: Loan[]): Pence {
  let total = 0;
  for (const l of loans) {
    if (l.monthsRemaining <= 12) total += l.principal;
    else total += Math.min(l.principal, Math.round((l.principal * 12) / l.monthsRemaining));
  }
  return total;
}

function ttmEbitda(s: GameState): Pence {
  const t = trailingPL(s, 12);
  return annualise(t.summary.ebitda, t.months);
}

export interface LoanOffer {
  maxAmount: Pence;
  basis: string;
  ttmEbitda: Pence;
}

/**
 * How much the bank will lend: the greater of 3x trailing EBITDA, 60% of receivables + inventory
 * + net PP&E (asset-backed), or a £50k start-up loan in the first two years, less existing debt,
 * scaled by the bank's current appetite (cut in a credit crunch).
 */
export function loanOffer(s: GameState): LoanOffer {
  const ebitda = ttmEbitda(s);
  const bs = currentBalanceSheet(s);
  const cashflowBased = ebitda > 0 ? 3 * ebitda : 0;
  const assetBased = Math.round(0.6 * (bs.receivables + bs.inventory + bs.ppeNet));
  const startup = s.month < 24 ? 50_000_00 : 0;
  const capacity = Math.max(cashflowBased, assetBased, startup);
  const basis =
    capacity === cashflowBased ? '3x trailing EBITDA' : capacity === assetBased ? '60% of receivables, inventory & PP&E' : 'Start-up loan scheme';
  const raw = Math.max(0, (capacity - loanPrincipal(s) - leaseLiabilityTotal(s) - bs.overdraft) * s.economy.lendingAppetite);
  return { maxAmount: Math.floor(raw / 100_000) * 100_000, basis, ttmEbitda: ebitda };
}

/** Credit spread priced from leverage after the new loan. Loss-makers pay the most. */
export function spreadFor(s: GameState, amount: Pence): number {
  const ebitda = ttmEbitda(s);
  const delta = modifiersOf(s).loanSpreadDelta;
  if (ebitda <= 0) return Math.max(0.01, 0.065 + delta);
  const leverage = (loanPrincipal(s) + leaseLiabilityTotal(s) + amount) / ebitda;
  return Math.max(0.01, 0.025 + Math.min(0.04, 0.01 * leverage) + delta);
}

/** Overdraft facility: 50% of receivables + 25% of inventory + £10k, scaled by lending appetite. */
export function overdraftLimit(s: GameState): Pence {
  const b = s.ledger.balances;
  const raw = 0.5 * Math.max(0, b.receivables) + 0.25 * Math.max(0, b.inventory) + 10_000_00;
  return Math.round(raw * s.economy.lendingAppetite * modifiersOf(s).overdraftMult);
}

export interface CovenantTest {
  debt: Pence;
  ttmEbitda: Pence;
  ttmInterest: Pence;
  debtToEbitda: number | null;
  interestCover: number | null;
  breach: boolean;
}

export function covenantTest(s: GameState): CovenantTest {
  const t = trailingPL(s, 12);
  const ebitda = annualise(t.summary.ebitda, t.months);
  const interest = annualise(t.summary.financeCosts, t.months);
  const debt = loanPrincipal(s) + leaseLiabilityTotal(s) + Math.max(0, -s.ledger.balances.cash);
  const debtToEbitda = ebitda > 0 ? debt / ebitda : null;
  const interestCover = interest > 0 ? ebitda / interest : null;
  const breach =
    debt > 0 &&
    (ebitda <= 0 ||
      (debtToEbitda !== null && debtToEbitda > COVENANT_MAX_DEBT_EBITDA) ||
      (interestCover !== null && interestCover < COVENANT_MIN_INTEREST_COVER));
  return { debt, ttmEbitda: ebitda, ttmInterest: interest, debtToEbitda, interestCover, breach };
}
