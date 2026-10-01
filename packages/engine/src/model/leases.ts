import { cr, dr, post, type CfCategory, type JournalLine } from '../ledger/journal';
import type { Pence } from '../money';
import { newId, type GameState, type Lease } from './state';

/** Incremental borrowing rate for leases: base rate + 3%, fixed at commencement. */
export const LEASE_MARGIN = 0.03;

export function leasePayment(principal: Pence, annualRate: number, months: number): Pence {
  const r = annualRate / 12;
  if (r === 0) return Math.ceil(principal / months);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

/**
 * Start a lease (IFRS 16): recognise a right-of-use asset and a lease liability at the present
 * value of the payments. Payments are set so their present value equals the equipment's cost.
 * The commencement entry moves no cash.
 */
export function startLease(s: GameState, label: string, cost: Pence, termMonths: number): Lease {
  const annualRate = s.economy.baseRate + LEASE_MARGIN;
  const lease: Lease = {
    id: newId(s, 'R'), label, cost, accumulated: 0, liability: cost, annualRate,
    payment: leasePayment(cost, annualRate, termMonths), termMonths, monthsRemaining: termMonths, startMonth: s.month,
  };
  post(s.ledger, s.month, `Lease commenced: ${label}`, [dr('rightOfUse', cost), cr('leaseLiability', cost)], { cf: 'none' });
  s.leases.push(lease);
  return lease;
}

type Poster = (memo: string, lines: JournalLine[], cf?: CfCategory, cfLabel?: string) => void;

/**
 * One month of every lease: straight-line depreciation of the right-of-use asset, interest on the
 * liability (operating cash flow), and the principal part of the payment (financing cash flow).
 */
export function processLeases(s: GameState, P: Poster): void {
  for (const l of s.leases) {
    const dep = l.monthsRemaining <= 1 ? l.cost - l.accumulated : Math.min(Math.round(l.cost / l.termMonths), l.cost - l.accumulated);
    if (dep) P(`Depreciation of right-of-use asset: ${l.label}`, [dr('depreciation', dep), cr('rouAccumDepreciation', dep)]);
    l.accumulated += dep;

    const interest = Math.round((l.liability * l.annualRate) / 12);
    const principal = l.monthsRemaining <= 1 ? l.liability : Math.min(l.liability, Math.max(0, l.payment - interest));
    if (interest) P(`Lease interest: ${l.label}`, [dr('interestExpense', interest), cr('cash', interest)]);
    if (principal) P(`Lease payment (principal): ${l.label}`, [dr('leaseLiability', principal), cr('cash', principal)], 'financing', 'Repayment of lease liabilities');
    l.liability -= principal;
    l.monthsRemaining -= 1;
  }
  const ended = s.leases.filter((l) => l.monthsRemaining <= 0);
  for (const l of ended) {
    post(s.ledger, s.month, `Lease ended: ${l.label} derecognised`, [dr('rouAccumDepreciation', l.accumulated), cr('rightOfUse', l.cost)], { cf: 'none' });
  }
  s.leases = s.leases.filter((l) => l.monthsRemaining > 0);
}

/** Principal of lease liabilities falling due within the next 12 months. */
export function leasesCurrentPortion(leases: Lease[]): Pence {
  let total = 0;
  for (const l of leases) {
    let liability = l.liability;
    for (let i = 0; i < Math.min(12, l.monthsRemaining) && liability > 0; i++) {
      const interest = Math.round((liability * l.annualRate) / 12);
      const principal = i === l.monthsRemaining - 1 ? liability : Math.min(liability, Math.max(0, l.payment - interest));
      total += principal;
      liability -= principal;
    }
  }
  return total;
}

export const leaseLiabilityTotal = (s: GameState): Pence => s.leases.reduce((a, l) => a + l.liability, 0);
