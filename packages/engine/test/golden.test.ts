import { describe, expect, it } from 'vitest';
import { balanceSheet, mergePeriods, plSummary } from '../src/index';
import { playPolicy } from './helpers';

/**
 * Golden-file snapshot of a 24-month software run. Any change to game balance or accounting
 * shows up here as a diff, so changes to the numbers are always deliberate.
 * Update with: npx vitest run -u
 */
describe('golden run', () => {
  it('24 months of software with the reference policy', () => {
    const s = playPolicy('software', 'GOLDEN', 24);
    const year = (y: number) => {
      const recs = s.history.slice(y * 12, y * 12 + 12);
      const p = plSummary(mergePeriods(recs.map((r) => r.period)).pl);
      const bs = balanceSheet(recs[11].closing, recs[11].loansCurrentPortion);
      return {
        revenue: p.revenue, grossProfit: p.grossProfit, ebitda: p.ebitda, profit: p.profit, tax: p.tax,
        cash: bs.cash - bs.overdraft, receivables: bs.receivables, deferredRevenue: bs.deferredRevenue,
        totalEquity: bs.totalEquity, customers: recs[11].kpis.customers, headcount: recs[11].kpis.headcount,
        equityValue: recs[11].valuation.equityValue,
      };
    };
    expect({ year1: year(0), year2: year(1), status: s.status }).toMatchSnapshot();
  });
});
