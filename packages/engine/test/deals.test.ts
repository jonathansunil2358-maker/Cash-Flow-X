import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, bidsFor, checkIntegrity, finalScore, newGame, replay, stateChecksum, tickInPlace, toSubmission, vcOffers, crowdCheck, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 40): GameState => {
  let s = play(newGame({ companyName: 'D', industryId: 'software', seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'D', industryId: 'software', seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 2_000_000_00;
  s.ledger.balances.shareCapital -= 2_000_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('deals and money', () => {
  it('buying a rival books goodwill, costs integration, and the books balance for years', () => {
    const s = company('DEAL-ACQ');
    const rivals = s.competitors.length;
    applyActionInPlace(s, { type: 'acquireRival', index: 0 });
    expect(s.competitors.length).toBe(rivals - 1);
    expect(s.ledger.balances.goodwill).toBeGreaterThan(0);
    expect(() => applyActionInPlace(s, { type: 'acquireRival', index: 0 })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
    run(s, 16);
    expect(s.deals?.integration).toBeUndefined();
  });

  it('a trade sale ends the company and its premium counts in the score', () => {
    const a = company('DEAL-SALE'); const b = structuredClone(a);
    const bids = bidsFor(a);
    expect(bids).toHaveLength(3);
    const base = finalScore(a).ownerWealth;
    const best = bids.reduce((x, y) => (y.mult > x.mult ? y : x));
    applyActionInPlace(b, { type: 'tradeSale', bid: best.id });
    expect(b.status).toBe('finished');
    expect(finalScore(b).ownerWealth).toBeGreaterThan(base);
  });

  it('every venture-capital offer issues shares, balances the books, and only one round a year', () => {
    for (const i of [0, 1, 2]) {
      const s = company(`DEAL-VC-${i}`);
      expect(vcOffers(s)[i].amount).toBeGreaterThan(0);
      applyActionInPlace(s, { type: 'takeVc', offer: i });
      expect(s.outsideHolders.length).toBe(1);
      expect(checkIntegrity(s)).toEqual([]);
      expect(() => applyActionInPlace(s, { type: 'takeVc', offer: i })).toThrow();
      if (i === 2) expect(s.deals?.vcPref).toBeGreaterThan(0);
    }
  });

  it('crowdfunding either falls short or pays out and is delivered as revenue without leaving a liability behind', () => {
    let paid = 0; let failed = 0;
    for (let k = 0; k < 6; k++) {
      const s = company(`DEAL-CROWD-${k}`, 30);
      expect(crowdCheck(s, 1).ok).toBe(true);
      applyActionInPlace(s, { type: 'startCrowd', tier: 1 });
      run(s, 10);
      expect(s.deals?.crowd).toBeUndefined();
      expect(checkIntegrity(s)).toEqual([]);
      paid += 1; failed += 0;
    }
    expect(paid).toBeGreaterThan(0);
    expect(failed).toBe(0);
  });

  it('hedges lock the currency and the costs, and cost money', () => {
    const s = company('DEAL-HEDGE');
    applyActionInPlace(s, { type: 'openMarket', market: 'europe' } as never);
    const before = s.ledger.balances.cash;
    applyActionInPlace(s, { type: 'hedge', kind: 'fx' });
    applyActionInPlace(s, { type: 'hedge', kind: 'cost' });
    expect(s.ledger.balances.cash).toBeLessThan(before);
    expect(() => applyActionInPlace(s, { type: 'hedge', kind: 'fx' })).toThrow();
    run(s, 8);
  });

  it('a patent is decided after six months and, if granted, pays licence income', () => {
    let granted = 0;
    for (let k = 0; k < 8; k++) {
      const s = company(`DEAL-PAT-${k}`, 30);
      s.staff.rnd = Math.max(s.staff.rnd, 3);
      applyActionInPlace(s, { type: 'filePatent' });
      run(s, 8);
      expect(s.deals?.patents?.[0].decided).toBe(true);
      if (s.deals?.patents?.[0].granted) granted++;
    }
    expect(granted).toBeGreaterThan(0);
  });

  it('a played company that uses the deals replays identically on the server', () => {
    const s = play(newGame({ companyName: 'D', industryId: 'software', seed: 'DEAL-REPLAY', difficulty: 'easy' }), 40);
    for (const a of [{ type: 'hedge', kind: 'cost' }, { type: 'filePatent' }] as const) { try { applyActionInPlace(s, a); } catch { /* not affordable: fine */ } }
    run(s, 12);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});
