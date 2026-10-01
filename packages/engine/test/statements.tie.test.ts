import { describe, expect, it } from 'vitest';
import {
  balanceSheet, cashFlowStatement, checkIntegrity, INDUSTRY_IDS, mergePeriods, newGame, plSummary, STARTING_CAPITAL,
} from '../src/index';
import { playPolicy } from './helpers';

describe('opening position', () => {
  it.each(INDUSTRY_IDS)('%s on Easy starts with £100k share capital and a balanced balance sheet', (id) => {
    const s = newGame({ companyName: 'X', industryId: id, seed: 'OPEN', difficulty: 'easy' });
    const bs = balanceSheet(s.ledger.balances, 0);
    expect(bs.shareCapital).toBe(STARTING_CAPITAL);
    expect(bs.difference).toBe(0);
    expect(bs.totalAssets).toBe(STARTING_CAPITAL);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('case study opens with a balanced, reconciled balance sheet', () => {
    const s = newGame({ companyName: '', industryId: 'software', seed: 'CASE', scenarioId: 'profitable-but-broke' });
    expect(s.industryId).toBe('clothing');
    expect(balanceSheet(s.ledger.balances, 0).difference).toBe(0);
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('the three statements tie every month', () => {
  it.each(INDUSTRY_IDS)('%s over 36 months', (id) => {
    const s = playPolicy(id, `TIE-${id}`, 36);
    expect(s.integrityErrors).toEqual([]);
    for (const r of s.history) {
      const bs = balanceSheet(r.closing, r.loansCurrentPortion);
      expect(bs.difference).toBe(0);
      const cf = cashFlowStatement(r.period, r.closing.cash);
      expect(cf.reconciles).toBe(true);
      expect(cf.operatingTies).toBe(true);
    }
  });

  it('annual statements reconcile when months are merged', () => {
    const s = playPolicy('clothing', 'ANNUAL', 24);
    const year2 = s.history.slice(12, 24);
    const merged = mergePeriods(year2.map((r) => r.period));
    const cf = cashFlowStatement(merged, year2[11].closing.cash);
    expect(cf.openingCash).toBe(s.history[11].closing.cash);
    expect(cf.reconciles).toBe(true);
    const monthlyProfit = year2.reduce((a, r) => a + plSummary(r.period.pl).profit, 0);
    expect(plSummary(merged.pl).profit).toBe(monthlyProfit);
  });

  it('year-end close moves profit into retained earnings and zeroes the P&L', () => {
    const s = playPolicy('software', 'CLOSE', 12);
    const b = s.ledger.balances;
    expect(b.revenue).toBe(0);
    expect(b.wages).toBe(0);
    const bs = balanceSheet(b, 0);
    expect(bs.currentYearProfit).toBe(0);
    const yearProfit = s.history.reduce((a, r) => a + plSummary(r.period.pl).profit, 0);
    expect(bs.retainedEarnings).toBe(yearProfit);
  });
});
