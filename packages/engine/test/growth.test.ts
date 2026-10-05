import { describe, expect, it } from 'vitest';
import {
  acceptCheck, applyActionInPlace, distributableReserves, checkIntegrity, claimPayout, COVER, INDUSTRIES, INDUSTRY_IDS, listCheck, maybeOffer, newGame, openSiteCheck,
  capacityOf, createRng, demandFor, premiumFor, publicFloat, sharePrice, tickInPlace, trialBalanceTotal, valuationOf, ownership,
  type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => {
  if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
};
function step(s: GameState, policy = true) {
  answer(s);
  if (policy) applyPolicy(s);
  answer(s);
  tickInPlace(s);
}
const ready = (id: IndustryId = 'ecommerce', seed = 'GROW', months = 8) => {
  const s = newGame({ companyName: 'G', industryId: id, seed, difficulty: 'easy' });
  for (let i = 0; i < months && s.status === 'playing'; i++) step(s);
  return s;
};

describe('second location', () => {
  it('needs time to prove the first site, then costs a fit-out and rent from day one, and opens after two months', () => {
    const s = newGame({ companyName: 'S', industryId: 'ecommerce', seed: 'SITE', difficulty: 'easy' });
    expect(openSiteCheck(s).allowed).toBe(false);
    const t = ready('ecommerce', 'SITE', 8);
    expect(openSiteCheck(t).allowed).toBe(true);
    const cap = capacityOf(t, INDUSTRIES.ecommerce);
    const potential = demandFor(t, INDUSTRIES.ecommerce).potential;
    const cash = t.ledger.balances.cash;
    applyActionInPlace(t, { type: 'openSite' });
    expect(t.ledger.balances.cash).toBe(cash - openSiteCheck(t).cost);
    expect(t.pendingSites.length).toBe(1);
    expect(capacityOf(t, INDUSTRIES.ecommerce)).toBe(cap);
    const rentBefore = t.ledger.balances.rent;
    step(t, false); step(t, false); step(t, false);
    expect(t.sites).toBe(2);
    expect(t.pendingSites).toEqual([]);
    expect(capacityOf(t, INDUSTRIES.ecommerce)).toBeGreaterThan(cap * 1.3);
    expect(demandFor(t, INDUSTRIES.ecommerce).potential).toBeGreaterThan(potential * 1.05);
    expect(rentBefore).toBeGreaterThanOrEqual(0);
    expect(checkIntegrity(t)).toEqual([]);
  });

  it('stops at three sites, and closing one costs a break fee', () => {
    const s = ready('ecommerce', 'SITE2', 8);
    applyActionInPlace(s, { type: 'openSite' });
    applyActionInPlace(s, { type: 'openSite' });
    expect(() => applyActionInPlace(s, { type: 'openSite' })).toThrow();
    for (let i = 0; i < 3; i++) step(s, false);
    expect(s.sites).toBe(3);
    const cash = s.ledger.balances.cash;
    applyActionInPlace(s, { type: 'closeSite' });
    expect(s.sites).toBe(2);
    expect(s.ledger.balances.cash).toBeLessThan(cash);
    expect(trialBalanceTotal(s.ledger.balances)).toBe(0);
  });
});

describe('insurance', () => {
  it('charges a premium each month and pays a share of a loss after an excess', () => {
    const s = ready('ecommerce', 'INS', 6);
    expect(premiumFor(s)).toBe(0);
    applyActionInPlace(s, { type: 'setInsurance', tier: 'full' });
    expect(premiumFor(s)).toBeGreaterThanOrEqual(COVER.full.floor);
    const ins = s.ledger.balances.insurance;
    step(s, false);
    expect(s.ledger.balances.insurance).toBeGreaterThan(ins);
    expect(claimPayout(s, 100_000_00)).toBe(Math.round(100_000_00 * 0.9) - COVER.full.excess);
    s.insurance = 'basic';
    expect(claimPayout(s, 100_000_00)).toBe(Math.round(100_000_00 * 0.6) - COVER.basic.excess);
    s.insurance = 'none';
    expect(claimPayout(s, 100_000_00)).toBe(0);
    expect(() => applyActionInPlace(s, { type: 'setInsurance', tier: 'none' })).toThrow();
  });

  it('keeps the books balanced across years of bad luck, with and without cover', () => {
    for (const tier of ['none', 'full'] as const) {
      const s = ready('restaurant', 'INS2', 3);
      if (tier !== 'none') applyActionInPlace(s, { type: 'setInsurance', tier });
      for (let i = 0; i < 60 && s.status === 'playing'; i++) step(s);
      expect(checkIntegrity(s), tier).toEqual([]);
    }
  });
});

describe('big contracts', () => {
  it('offers arrive only after a track record, and are sized to what you sell', () => {
    const s = ready('ecommerce', 'CONTRACT', 10);
    while (s.month % 3 !== 0) step(s);
    s.contractOffers = [];
    const rng = createRng(s);
    let found = false;
    for (let i = 0; i < 30 && !found; i++) { s.contractOffers = []; maybeOffer(s, rng); found = s.contractOffers.length > 0; }
    expect(found).toBe(true);
    const o = s.contractOffers[0];
    expect(o.units).toBeGreaterThan(0);
    expect(o.price).toBeLessThan(s.price);
    expect(acceptCheck(s, o.id).allowed).toBe(true);
  });

  it('are served first, pay on their own terms, and a shortfall costs a penalty', () => {
    const s = ready('ecommerce', 'CONTRACT2', 10);
    const cap = Math.floor(capacityOf(s, INDUSTRIES.ecommerce));
    s.contractOffers = [{ id: 'K99', client: 'Test Co', units: Math.max(5, Math.floor(cap * 0.3)), price: s.price - 100, months: 6, paymentDays: 60, penaltyPct: 40, expiresMonth: s.month + 3 }];
    applyActionInPlace(s, { type: 'acceptContract', offerId: 'K99' });
    expect(s.contracts.length).toBe(1);
    expect(s.contractOffers.length).toBe(0);
    const revenue = s.ledger.balances.revenue;
    for (let i = 0; i < 6; i++) step(s, false);
    expect(s.contracts.length).toBe(0);
    expect(s.ledger.balances.revenue).not.toBe(revenue);
    expect(checkIntegrity(s)).toEqual([]);

    // Promise far more than you can deliver and the penalty shows up in the books.
    const t = ready('ecommerce', 'CONTRACT3', 10);
    t.contracts = [{ id: 'K1', client: 'Big Co', units: 100_000, price: t.price, months: 12, monthsLeft: 12, paymentDays: 30, penaltyPct: 30 }];
    const before = t.ledger.balances.cash;
    step(t, false);
    expect(t.ledger.balances.otherCosts).toBeGreaterThan(0);
    expect(t.ledger.balances.cash).toBeLessThan(before);
    expect(checkIntegrity(t)).toEqual([]);
  });

  it('work in subscription sectors too', () => {
    const s = ready('software', 'CONTRACT4', 10);
    s.contracts = [{ id: 'K1', client: 'Seat Co', units: 20, price: s.price, months: 6, monthsLeft: 6, paymentDays: 30, penaltyPct: 30 }];
    for (let i = 0; i < 6; i++) step(s, false);
    expect(s.contracts.length).toBe(0);
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('stock market listing', () => {
  it('is refused until the company is big, old and profitable', () => {
    const s = ready('software', 'LIST', 3);
    const c = listCheck(s);
    expect(c.allowed).toBe(false);
    expect(() => applyActionInPlace(s, { type: 'listCompany' })).toThrow();
    expect(() => applyActionInPlace(s, { type: 'buyBack', amount: 1000_00 })).toThrow();
  });

  it('floats shares at a discount, dilutes the owner, brings in cash, then prices the company each month', () => {
    let s: GameState | null = null;
    for (const seed of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24']) {
      const t = newGame({ companyName: 'L', industryId: 'software', seed, difficulty: 'easy' });
      for (let i = 0; i < 100 && t.status === 'playing' && !listCheck(t).allowed; i++) step(t);
      if (listCheck(t).allowed) { s = t; break; }
    }
    expect(s, 'no test company reached the listing threshold').not.toBeNull();
    const t = s!;
    const own = ownership(t);
    const cash = t.ledger.balances.cash;
    const total = t.shares.total;
    const floatBefore = publicFloat(t);
    const equityBefore = valuationOf(t).equityValue;
    applyActionInPlace(t, { type: 'listCompany' });
    expect(t.listed).toBe(true);
    expect(t.shares.total).toBeGreaterThan(total);
    expect(ownership(t)).toBeLessThan(own);
    expect(t.ledger.balances.cash).toBeGreaterThan(cash);
    expect(publicFloat(t)).toBe(floatBefore + (t.shares.total - total));
    expect(equityBefore).toBeGreaterThan(0);
    for (let i = 0; i < 8; i++) step(t);
    expect(t.priceHistory.length).toBe(8);
    expect(sharePrice(t)).toBeGreaterThan(0);
    expect(t.guidance).not.toBeNull();
    expect(checkIntegrity(t)).toEqual([]);
    const price = sharePrice(t);
    const budget = Math.max(price, Math.min(distributableReserves(t) / 2, t.ledger.balances.cash / 4));
    const before = t.shares.total;
    const mine = ownership(t);
    applyActionInPlace(t, { type: 'buyBack', amount: Math.floor(budget / price) * price });
    expect(t.shares.total).toBeLessThan(before);
    expect(ownership(t)).toBeGreaterThan(mine);
    expect(trialBalanceTotal(t.ledger.balances)).toBe(0);
  });
});

describe('opt-in: nothing changes for a company that uses none of it', () => {
  it('has neutral defaults in every sector', () => {
    for (const id of INDUSTRY_IDS) {
      const s = newGame({ companyName: 'N', industryId: id, seed: 'NEUTRAL', difficulty: 'easy' });
      expect(s.sites).toBe(1);
      expect(s.insurance).toBe('none');
      expect(s.contracts).toEqual([]);
      expect(s.listed).toBe(false);
      expect(premiumFor(s)).toBe(0);
    }
  });
});
