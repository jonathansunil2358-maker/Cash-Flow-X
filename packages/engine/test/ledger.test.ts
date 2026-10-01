import { describe, expect, it } from 'vitest';
import { allocate, cr, createLedger, dr, LedgerError, post, trialBalanceTotal } from '../src/index';

describe('allocate', () => {
  it('preserves the exact total', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(-100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(-100);
    expect(allocate(7, [0.5, 0.5])).toEqual([4, 3]);
    expect(allocate(0, [])).toEqual([]);
  });
  it('rejects non-integer totals and impossible splits', () => {
    expect(() => allocate(1.5, [1])).toThrow();
    expect(() => allocate(10, [0, 0])).toThrow();
  });
});

describe('journal posting', () => {
  it('posts balanced entries and keeps the trial balance at zero', () => {
    const L = createLedger();
    post(L, 0, 'Share issue', [dr('cash', 10_000), cr('shareCapital', 10_000)], { cf: 'none', kind: 'opening' });
    post(L, 0, 'Sale', [dr('receivables', 500), cr('revenue', 500)], { cf: 'operating' });
    expect(L.balances.cash).toBe(10_000);
    expect(L.balances.revenue).toBe(-500);
    expect(trialBalanceTotal(L.balances)).toBe(0);
  });

  it('rejects unbalanced entries', () => {
    const L = createLedger();
    expect(() => post(L, 0, 'Bad', [dr('cash', 100), cr('revenue', 99)], { cf: 'operating' })).toThrow(LedgerError);
    expect(trialBalanceTotal(L.balances)).toBe(0);
    expect(L.journal).toHaveLength(0);
  });

  it('rejects fractional pence', () => {
    const L = createLedger();
    expect(() => post(L, 0, 'Bad', [dr('cash', 1.5), cr('revenue', 1.5)], { cf: 'operating' })).toThrow(LedgerError);
  });

  it('only allows P&L lines in operating entries', () => {
    const L = createLedger();
    expect(() => post(L, 0, 'Bad', [dr('cash', 100), cr('revenue', 100)], { cf: 'investing' })).toThrow(/operating/);
  });

  it('requires a cash flow classification for cash movements', () => {
    const L = createLedger();
    expect(() => post(L, 0, 'Bad', [dr('cash', 100), cr('loans', 100)], { cf: 'none' })).toThrow(/classification/);
  });

  it('accumulates cash flow by category', () => {
    const L = createLedger();
    post(L, 0, 'Loan', [dr('cash', 1000), cr('loans', 1000)], { cf: 'financing', cfLabel: 'Proceeds from borrowings' });
    post(L, 0, 'Kit', [dr('ppe', 400), cr('cash', 400)], { cf: 'investing', cfLabel: 'Capex' });
    post(L, 0, 'Cash sale', [dr('cash', 300), cr('revenue', 300)], { cf: 'operating' });
    expect(L.period.financing['Proceeds from borrowings']).toBe(1000);
    expect(L.period.investing.Capex).toBe(-400);
    expect(L.period.operating.revenue).toBe(300);
  });

  it('skips entries whose lines net to nothing', () => {
    const L = createLedger();
    expect(post(L, 0, 'Nothing', [dr('cash', 0), cr('revenue', 0)], { cf: 'operating' })).toBeNull();
  });
});
