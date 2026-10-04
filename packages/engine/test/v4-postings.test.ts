import { describe, expect, it } from 'vitest';
import { advanceDeals, advanceStrategy, checkIntegrity, newGame, tickInPlace, type GameState } from '../src/index';

/** Regression: the V4 write-downs (goodwill impairment, a bad month at a subsidiary) were posted as non-operating entries, which the ledger refuses, so the monthly tick threw. */
describe('V4 write-downs post cleanly', () => {
  const fresh = (label: string): GameState => {
    const s = newGame({ companyName: 'W', industryId: 'software', seed: label, difficulty: 'easy' });
    for (let i = 0; i < 3; i++) { if (s.pendingEvent) s.pendingEvent = null; tickInPlace(s); }
    s.pendingEvent = null;
    return s;
  };
  it('a goodwill impairment books and balances (checked over many seeds so the 25% chance lands)', () => {
    let hit = 0;
    for (let k = 0; k < 40 && hit < 3; k++) {
      const s = fresh(`WD-${k}`);
      s.ledger.balances.cash += 100_000_00;
      s.ledger.balances.shareCapital -= 100_000_00;
      // Pretend an acquisition happened: goodwill on the books and a test due this month.
      s.ledger.balances.goodwill += 60_000_00; s.ledger.balances.cash -= 60_000_00;
      s.deals = { acquired: 1, goodwill: 60_000_00, integration: { end: s.month, monthly: 0, test: s.month } };
      advanceDeals(s, false);
      if (s.ledger.balances.goodwill < 60_000_00) hit++;
      expect(s.deals?.integration).toBeUndefined();
      expect(checkIntegrity(s).slice(0, 2)).toEqual([]);
    }
    expect(hit).toBeGreaterThan(0);
  });
  it('a bad month at a subsidiary books and balances', () => {
    let hit = 0;
    for (let k = 0; k < 80 && hit < 3; k++) {
      const s = fresh(`WS-${k}`);
      s.ledger.balances.cash += 100_000_00;
      s.ledger.balances.shareCapital -= 100_000_00;
      s.ledger.balances.investments += 50_000_00; s.ledger.balances.cash -= 50_000_00;
      s.strat = { subs: [{ sector: 'restaurant', stake: 50_000_00, since: 0 }] };
      for (let m = 0; m < 30; m++) {
        const before = s.strat.subs![0].stake;
        advanceStrategy(s, false);
        if (s.strat.subs![0].stake < before) hit++;
        s.month += 1;
      }
      expect(checkIntegrity(s).slice(0, 2)).toEqual([]);
    }
    expect(hit).toBeGreaterThan(0);
  });
});
