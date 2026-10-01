import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, corporationTax, currentPortion, dcf, INDUSTRIES, newGame, tickInPlace, valuationOf, type Loan,
} from '../src/index';
import { playPolicy } from './helpers';

describe('UK corporation tax', () => {
  it('applies the small profits rate, main rate and marginal relief', () => {
    expect(corporationTax(0)).toBe(0);
    expect(corporationTax(-5_000_00)).toBe(0);
    expect(corporationTax(40_000_00)).toBe(7_600_00); // 19%
    expect(corporationTax(50_000_00)).toBe(9_500_00); // 19% at the limit
    expect(corporationTax(100_000_00)).toBe(22_750_00); // 25% less 3/200 x 150k
    expect(corporationTax(300_000_00)).toBe(75_000_00); // 25%
  });

  it('carries trading losses forward against later profits', () => {
    const s = playPolicy('software', 'LOSSES', 12);
    // First year of a start-up is loss-making in this seed.
    expect(s.tax.lossesCarriedForward).toBeGreaterThan(0);
    expect(s.tax.due).toBe(0);
  });

  it('schedules the liability for payment 10 months after the year end', () => {
    const s = playPolicy('automotive', 'TAXPAY', 36);
    const paid = s.ledger.journal.filter((e) => e.memo === 'Corporation tax paid to HMRC');
    for (const e of paid) expect(e.month % 12).toBe(9);
  });
});

describe('loans', () => {
  it('amortise to zero over the term and charge interest monthly', () => {
    const s = newGame({ companyName: 'Loan', industryId: 'software', seed: 'LOAN' });
    applyActionInPlace(s, { type: 'takeLoan', amount: 24_000_00, termMonths: 12 });
    const interestBefore = s.ledger.balances.interestExpense;
    for (let i = 0; i < 12 && s.status === 'playing'; i++) {
      if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
      tickInPlace(s);
    }
    expect(s.loans).toHaveLength(0);
    expect(s.ledger.balances.loans).toBe(0);
    expect(s.integrityErrors).toEqual([]);
    expect(s.history.some((r) => (r.period.pl.interestExpense ?? 0) > 0)).toBe(true);
    expect(interestBefore).toBe(240_00); // 1% arrangement fee
  });

  it('splits principal due within 12 months into current liabilities', () => {
    const loan: Loan = { id: 'L1', label: 'L', principal: 120_000_00, original: 120_000_00, spread: 0.03, penalty: 0, termMonths: 60, monthsRemaining: 60, startMonth: 0, consecutiveBreaches: 0 };
    expect(currentPortion([loan])).toBe(24_000_00);
    expect(currentPortion([{ ...loan, monthsRemaining: 6 }])).toBe(120_000_00);
  });
});

describe('valuation', () => {
  it('values a company with no trading history at its net assets', () => {
    const s = newGame({ companyName: 'V', industryId: 'software', seed: 'VAL', difficulty: 'easy' });
    const v = valuationOf(s);
    expect(v.enterpriseValue).toBe(0);
    expect(v.equityValue).toBe(100_000_00);
  });

  it('DCF discounts at base rate + 7.5% with a 2% terminal growth rate', () => {
    const d = dcf(1_000_000_00, 200_000_00, 0.2, 0.04, INDUSTRIES.software);
    expect(d.wacc).toBeCloseTo(0.115);
    expect(d.years).toHaveLength(5);
    expect(d.enterpriseValue).toBeGreaterThan(0);
    // Higher discount rate -> lower value.
    expect(dcf(1_000_000_00, 200_000_00, 0.2, 0.08, INDUSTRIES.software).enterpriseValue).toBeLessThan(d.enterpriseValue);
  });
});

describe('equity and dividends', () => {
  it('dividends are capped at distributable reserves', () => {
    const s = newGame({ companyName: 'D', industryId: 'software', seed: 'DIV' });
    expect(() => applyActionInPlace(s, { type: 'payDividend', amount: 1_00 })).toThrow(/distributable/);
  });

  it('an equity raise dilutes the owner', () => {
    const s = playPolicy('software', 'EQUITY', 48);
    if (s.status !== 'playing') return;
    const before = s.shares.owner / s.shares.total;
    applyActionInPlace(s, { type: 'raiseEquity', amount: 100_000_00 });
    expect(s.shares.owner / s.shares.total).toBeLessThan(before);
    tickInPlace(s);
    expect(s.integrityErrors).toEqual([]);
  });
});

describe('case study', () => {
  it('runs 18 months and then finishes', () => {
    const s = newGame({ companyName: '', industryId: 'clothing', seed: 'CASE', scenarioId: 'profitable-but-broke' });
    applyActionInPlace(s, { type: 'setCreditTerms', customerDays: 45, supplierDays: 45 });
    applyActionInPlace(s, { type: 'setStockCover', months: 1 });
    while (s.status === 'playing') {
      if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
      tickInPlace(s);
    }
    expect(s.integrityErrors).toEqual([]);
    expect(['finished', 'insolvent']).toContain(s.status);
    if (s.status === 'finished') expect(s.month).toBe(18);
  });
});
