import { describe, expect, it } from 'vitest';
import { activeHolders, applyActionInPlace, buybackQuote, checkIntegrity, newGame, ownership, replay, stateChecksum, tickInPlace, toSubmission, valuationOf, type GameState } from '../src/index';
import { cr, dr, post } from '../src/ledger/journal';
import { playPolicy } from './helpers';

const answer = (s: GameState) => {
  if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
};

/** A company with a valuation and some cash, plus an angel round taken a year ago. */
function withAngel(): GameState {
  const s = playPolicy('software', 'BUYBACK', 30);
  answer(s);
  const terms = valuationOf(s).equityValue;
  expect(terms).toBeGreaterThan(0);
  applyActionInPlace(s, { type: 'raiseEquity', amount: 25_000_00 });
  for (let i = 0; i < 7; i++) { answer(s); tickInPlace(s); }
  answer(s);
  return s;
}

describe('buying back investor shares', () => {
  it('records angel rounds as holders, locks them in for six months, then buys them out at a premium', () => {
    const s = playPolicy('software', 'BUYBACK', 30);
    answer(s);
    applyActionInPlace(s, { type: 'raiseEquity', amount: 25_000_00 });
    const h = activeHolders(s).filter((x) => x.investorId === 'angel').at(-1)!;
    expect(h).toBeTruthy();
    expect(buybackQuote(s, h.id, 100).ok).toBe(false);
    expect(buybackQuote(s, h.id, 100).reason).toMatch(/locked in/);
    for (let i = 0; i < 7; i++) { answer(s); tickInPlace(s); }
    answer(s);
    const q = buybackQuote(s, h.id, 100);
    expect(q.premium).toBeGreaterThanOrEqual(0.1);
    expect(q.premium).toBeLessThanOrEqual(0.35);
    expect(q.price).toBeGreaterThan(q.fair);
  });

  it('partial and full buy-backs move cash and shares, keep the books balanced, and replay exactly', () => {
    const s = withAngel();
    const h = activeHolders(s).filter((x) => x.investorId === 'angel').at(-1)!;
    post(s.ledger, s.month, 'Test cash', [dr('cash', 5_000_000_00), cr('shareCapital', 5_000_000_00)], { cf: 'financing', cfLabel: 'Test' });
    const before = { cash: s.ledger.balances.cash, total: s.shares.total, own: ownership(s), shares: h.shares };
    const half = buybackQuote(s, h.id, 50);
    expect(half.ok, half.reason).toBe(true);
    applyActionInPlace(s, { type: 'buyBackShares', holderId: h.id, pct: 50 });
    expect(s.ledger.balances.cash).toBe(before.cash - half.price);
    expect(s.shares.total).toBe(before.total - half.shares);
    expect(ownership(s)).toBeGreaterThan(before.own);
    expect(h.status).toBe('active');
    expect(h.buyout).toBe(half.price);
    expect(checkIntegrity(s)).toEqual([]);
    const rest = buybackQuote(s, h.id, 100);
    expect(rest.ok, rest.reason).toBe(true);
    applyActionInPlace(s, { type: 'buyBackShares', holderId: h.id, pct: 100 });
    expect(h.status).toBe('bought-out');
    expect(h.shares).toBe(0);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('replays on the server to exactly the same company', () => {
    const s = withAngel();
    const h = activeHolders(s).filter((x) => x.investorId === 'angel').at(-1)!;
    const q = buybackQuote(s, h.id, 10);
    expect(q.ok, q.reason).toBe(true);
    applyActionInPlace(s, { type: 'buyBackShares', holderId: h.id, pct: 10 });
    answer(s); tickInPlace(s);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });

  it('refuses bad requests and charges players in your holding company fair value only', () => {
    const s = withAngel();
    expect(() => applyActionInPlace(s, { type: 'buyBackShares', holderId: 'nope', pct: 100 })).toThrow();
    const h = activeHolders(s)[0];
    expect(() => applyActionInPlace(s, { type: 'buyBackShares', holderId: h.id, pct: 5 })).toThrow();
    s.outsideHolders.push({ id: 'P1', investorId: 'U2', investorName: 'Maya', shares: Math.round(s.shares.total * 0.02), invested: 1_000_00, dividends: 0, buyout: 0, status: 'active', since: 0 });
    s.shares.total += s.outsideHolders.at(-1)!.shares;
    const q = buybackQuote(s, 'P1', 100);
    expect(q.premium).toBe(0);
    expect(q.price).toBe(q.fair);
  });
});
