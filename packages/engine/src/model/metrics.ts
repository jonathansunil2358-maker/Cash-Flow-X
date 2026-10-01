import { balanceSheet, plSummary, sumPL, type BalanceSheet, type PLSummary } from '../ledger/statements';
import type { Pence } from '../money';
import { leasesCurrentPortion } from './leases';
import { currentPortion } from './loans';
import type { GameState, MonthRecord } from './state';

/** P&L for the last `months` closed months (skipping the most recent `offset`). */
export function trailingPL(s: GameState, months = 12, offset = 0): { summary: PLSummary; months: number; records: MonthRecord[] } {
  const end = Math.max(0, s.history.length - offset);
  const records = s.history.slice(Math.max(0, end - months), end);
  return { summary: plSummary(sumPL(records.map((r) => r.period))), months: records.length, records };
}

/** Scale a partial-year figure to a 12-month equivalent. */
export const annualise = (value: Pence, months: number): Pence => (months > 0 ? Math.round((value * 12) / months) : 0);

export function currentBalanceSheet(s: GameState): BalanceSheet {
  return balanceSheet(s.ledger.balances, currentPortion(s.loans), leasesCurrentPortion(s.leases));
}

/** Year-to-date P&L for the current financial year: closed months plus the open month. */
export function ytdPL(s: GameState): PLSummary {
  const yearStart = s.month - (s.month % 12);
  const closed = s.history.filter((r) => r.month >= yearStart && r.month < s.month).map((r) => r.period);
  return plSummary(sumPL([...closed, s.ledger.period]));
}

/** Annualised revenue growth: year-on-year once there are 24 months, else quarter-on-quarter. */
export function revenueGrowth(s: GameState): number {
  const h = s.history;
  const rev = (rs: MonthRecord[]) => rs.reduce((a, r) => a - (r.period.pl.revenue ?? 0), 0);
  if (h.length >= 24) {
    const cur = rev(h.slice(-12));
    const prev = rev(h.slice(-24, -12));
    return prev > 0 ? cur / prev - 1 : 0;
  }
  if (h.length >= 6) {
    const cur = rev(h.slice(-3));
    const prev = rev(h.slice(-6, -3));
    if (prev <= 0) return cur > 0 ? 1 : 0;
    return Math.min(2, Math.max(-0.5, Math.pow(cur / prev, 4) - 1));
  }
  return 0;
}
