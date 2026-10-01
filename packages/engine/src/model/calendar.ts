import type { Pence } from '../money';
import { industryOf } from './industries';
import { loanRate, scheduledRepayment } from './loans';
import { grossPayroll } from './morale';
import { premiumFor } from './insurance';
import { rentedExtraSites } from './sites';
import { headcount, monthLabel, type GameState } from './state';

/**
 * The cash-flow calendar: the big known payments coming up, month by month. It is a plan, not a
 * promise: wages and rent move with the business, and tax follows the profit you actually make.
 */
export type CalendarKind = 'tax' | 'loan' | 'rent' | 'payroll' | 'insurance';
export interface CalendarItem {
  month: number;
  label: string;
  kind: CalendarKind;
  amount: Pence;
}

export function cashCalendar(s: GameState, months = 6): CalendarItem[] {
  const ind = industryOf(s);
  const out: CalendarItem[] = [];
  const rent = Math.round((ind.rentBase * (1 + rentedExtraSites(s)) + ind.rentPerHead * headcount(s)) * s.rentIndex);
  const payroll = Math.round(grossPayroll(s) * 1.15);
  const premium = premiumFor(s);
  for (let i = 0; i < months; i++) {
    const m = s.month + i;
    if (s.tax.dueMonth === m && s.tax.due > 0) out.push({ month: m, label: 'Corporation tax to HMRC', kind: 'tax', amount: s.tax.due });
    if (m % 3 === 0 && rent > 0) out.push({ month: m, label: 'Quarterly rent in advance', kind: 'rent', amount: rent * 3 });
    if (payroll > 0) out.push({ month: m, label: 'Payroll and on-costs', kind: 'payroll', amount: payroll });
    if (premium > 0) out.push({ month: m, label: 'Insurance premium', kind: 'insurance', amount: premium });
    for (const l of s.loans) {
      if (l.monthsRemaining <= i) continue;
      const interest = Math.round((l.principal * loanRate(l, s.economy)) / 12);
      out.push({ month: m, label: `Loan: ${l.label}`, kind: 'loan', amount: scheduledRepayment(l) + interest });
    }
  }
  return out;
}

/** Total of the calendar for one month. */
export const calendarTotal = (items: CalendarItem[], month: number): Pence => items.filter((i) => i.month === month).reduce((a, i) => a + i.amount, 0);
export const calendarMonthLabel = (month: number): string => monthLabel(month);
