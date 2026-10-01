import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, effectivePrice, INDUSTRIES, INDUSTRY_IDS, newGame, tickInPlace, type GameState, type IndustryId,
} from '../src/index';

/** Advance a month, taking the first choice on any decision that comes up (same for every game compared). */
function step(s: GameState) {
  if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
  tickInPlace(s);
}

function game(industryId: IndustryId, seed = 'PROMO') {
  const s = newGame({ companyName: 'P', industryId, seed, difficulty: 'easy' });
  applyActionInPlace(s, { type: 'hire', role: 'ops', count: 1 });
  applyActionInPlace(s, { type: 'hire', role: 'sales', count: 1 });
  applyActionInPlace(s, { type: 'setMarketing', amount: 100_000 });
  return s;
}

describe('seasonality', () => {
  it('has 12 months per industry averaging 1.0, so a year is not inflated or deflated', () => {
    for (const id of INDUSTRY_IDS) {
      const c = INDUSTRIES[id].seasonality;
      expect(c.length, id).toBe(12);
      expect(c.reduce((a, b) => a + b, 0) / 12, id).toBeCloseTo(1, 2);
    }
  });

  it('peaks where it should: restaurants in December, fitness in January, e-commerce in November', () => {
    const peak = (id: IndustryId) => INDUSTRIES[id].seasonality.indexOf(Math.max(...INDUSTRIES[id].seasonality));
    expect(peak('restaurant')).toBe(11);
    expect(peak('fitness')).toBe(0);
    expect(peak('ecommerce')).toBe(10);
  });
});

describe('promotions', () => {
  it('discount the price, cost a set-up fee and keep the books balanced', () => {
    const s = game('ecommerce');
    const cash = s.ledger.balances.cash;
    applyActionInPlace(s, { type: 'startPromo', discountPct: 20, months: 2 });
    expect(s.ledger.balances.cash).toBeLessThan(cash);
    expect(effectivePrice(s)).toBe(Math.round(s.price * 0.8));
    for (let i = 0; i < 6; i++) step(s);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('raise sales while running, then leave a dip, then enforce a cooldown', () => {
    const base = game('ecommerce', 'PROMO-A');
    const promo = game('ecommerce', 'PROMO-A');
    applyActionInPlace(promo, { type: 'startPromo', discountPct: 30, months: 2 });
    const units = (s: ReturnType<typeof game>) => s.history.map((h) => h.kpis.unitsSold);
    for (let i = 0; i < 6; i++) { step(base); step(promo); }
    const b = units(base); const p = units(promo);
    expect(p[0]).toBeGreaterThan(b[0]);
    expect(p[1]).toBeGreaterThan(b[1]);
    expect(promo.promo).toBeNull();
    expect(p[2]).toBeLessThan(b[2]);
  });

  it('enforce a three-month cooldown once one ends', () => {
    const s = game('ecommerce', 'PROMO-C');
    applyActionInPlace(s, { type: 'startPromo', discountPct: 10, months: 1 });
    step(s);
    expect(s.promo).toBeNull();
    expect(() => applyActionInPlace(s, { type: 'startPromo', discountPct: 10, months: 1 })).toThrow(/rest/);
    for (let i = 0; i < 3; i++) step(s);
    expect(() => applyActionInPlace(s, { type: 'startPromo', discountPct: 10, months: 1 })).not.toThrow();
  });

  it('refuse a second promotion, bad discounts and bad lengths', () => {
    const s = game('restaurant');
    expect(() => applyActionInPlace(s, { type: 'startPromo', discountPct: 15, months: 1 })).toThrow(/10%, 20% or 30%/);
    expect(() => applyActionInPlace(s, { type: 'startPromo', discountPct: 10, months: 9 })).toThrow(/1 to 3 months/);
    applyActionInPlace(s, { type: 'startPromo', discountPct: 10, months: 1 });
    expect(() => applyActionInPlace(s, { type: 'startPromo', discountPct: 10, months: 1 })).toThrow(/already running/);
  });
});
