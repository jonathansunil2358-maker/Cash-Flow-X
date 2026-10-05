import { describe, expect, it } from 'vitest';
import { applyActionInPlace, checkIntegrity, INDUSTRY_IDS, listedRivals, MAX_RIVALS, MIN_RIVALS, newGame, replay, stateChecksum, stockCheck, tickInPlace, toSubmission, type GameState } from '../src/index';
import { applyPolicy } from '../scripts/policy';

const play = (id: (typeof INDUSTRY_IDS)[number], seed: string, months: number): GameState => {
  const s = newGame({ companyName: 'W', industryId: id, seed, difficulty: 'easy' });
  while (s.month < months && s.status === 'playing') { applyPolicy(s); tickInPlace(s); }
  return s;
};

describe('the living market', () => {
  it('keeps between five and ten rivals, with unique names and ids, while firms come and go', () => {
    for (const id of ['software', 'toymaker', 'hotel'] as const) {
      const s = newGame({ companyName: 'W', industryId: id, seed: `WORLD-${id}`, difficulty: 'easy' });
      let founded = 0;
      for (let i = 0; i < 180 && s.status === 'playing'; i++) {
        applyPolicy(s); tickInPlace(s);
        if (i > 3) { expect(s.competitors.length).toBeGreaterThanOrEqual(MIN_RIVALS); }
        expect(s.competitors.length).toBeLessThanOrEqual(MAX_RIVALS);
        expect(new Set(s.competitors.map((c) => c.name)).size).toBe(s.competitors.length);
        expect(new Set(s.competitors.map((c) => c.id)).size).toBe(s.competitors.length);
        founded = s.world!.founded;
      }
      expect(founded, id).toBeGreaterThan(3);
      expect(s.world!.failed + s.world!.mergers, id).toBeGreaterThan(0);
    }
  });

  it('lists some rivals and moves their prices every month', () => {
    const s = play('software', 'LIVE-1', 60);
    const listed = listedRivals(s);
    expect(listed.length).toBeGreaterThan(0);
    for (const c of listed) {
      expect(c.px).toBeGreaterThan(0);
      expect(c.pxHist!.length).toBeGreaterThan(1);
      expect(new Set(c.pxHist).size).toBeGreaterThan(1);
    }
    expect(s.world!.index.length).toBeGreaterThan(10);
  });

  it('holds total rival strength about constant, so the market stays as tough as before', () => {
    const s = newGame({ companyName: 'W', industryId: 'ecommerce', seed: 'BUDGET', difficulty: 'easy' });
    const start = s.competitors.reduce((a, c) => a + c.strength, 0);
    for (let i = 0; i < 60 && s.status === 'playing'; i++) { applyPolicy(s); tickInPlace(s); }
    const now = s.competitors.reduce((a, c) => a + c.strength, 0);
    expect(now).toBeGreaterThan(start * 0.8);
    expect(now).toBeLessThan(start * 1.2);
  });

  it('replays exactly on the server', () => {
    const s = play('restaurant', 'REPLAY-W', 40);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
    const r = replay(toSubmission(s));
    expect(r.competitors.map((c) => c.name)).toEqual(s.competitors.map((c) => c.name));
    expect(r.competitors.map((c) => c.px)).toEqual(s.competitors.map((c) => c.px));
  });

  it('buys and sells shares in a listed rival, keeping the books balanced', () => {
    let s = play('software', 'TRADE-1', 30);
    for (const seed of ['TRADE-2', 'TRADE-3', 'TRADE-4', 'TRADE-5', 'TRADE-6']) {
      if (s.status === 'playing' && s.ledger.balances.cash > 200_000_00 && listedRivals(s).length) break;
      s = play('software', seed, 36);
    }
    const c = listedRivals(s)[0];
    expect(c).toBeTruthy();
    expect(s.ledger.balances.cash).toBeGreaterThan(50_000_00);
    const cash0 = s.ledger.balances.cash;
    const shares = Math.max(1, Math.floor(Math.min(cash0 * 0.2, c.shares! * c.px! * 0.1) / c.px!));
    const q = stockCheck(s, 'buy', c.id!, shares);
    expect(q.ok, q.reason).toBe(true);
    applyActionInPlace(s, { type: 'tradeStock', side: 'buy', rivalId: c.id!, shares });
    expect(s.world!.holdings[c.id!].shares).toBe(shares);
    expect(s.world!.holdings[c.id!].carry).toBe(shares * c.px!);
    expect(checkIntegrity(s)).toEqual([]);
    // Prices move, the carrying value follows, and the books still balance.
    for (let i = 0; i < 6 && s.status === 'playing'; i++) { if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); tickInPlace(s); }
    expect(checkIntegrity(s)).toEqual([]);
    const h = s.world!.holdings[c.id!];
    if (h) {
      const now = s.competitors.find((x) => x.id === c.id);
      if (now) expect(h.carry).toBe(h.shares * now.px!);
      applyActionInPlace(s, { type: 'tradeStock', side: 'sell', rivalId: c.id!, shares: h.shares });
      expect(s.world!.holdings[c.id!]).toBeUndefined();
    }
    expect(checkIntegrity(s)).toEqual([]);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });

  it('refuses bad trades: unlisted firms, too many shares, selling what you do not own', () => {
    const s = play('software', 'TRADE-2', 20);
    const unlisted = s.competitors.find((c) => !c.listed);
    if (unlisted) expect(() => applyActionInPlace(s, { type: 'tradeStock', side: 'buy', rivalId: unlisted.id!, shares: 1 })).toThrow();
    const c = listedRivals(s)[0];
    expect(() => applyActionInPlace(s, { type: 'tradeStock', side: 'sell', rivalId: c.id!, shares: 1 })).toThrow(/only own/);
    expect(() => applyActionInPlace(s, { type: 'tradeStock', side: 'buy', rivalId: c.id!, shares: c.shares! })).toThrow();
    expect(() => applyActionInPlace(s, { type: 'tradeStock', side: 'buy', rivalId: c.id!, shares: 0.5 })).toThrow();
  });
});
