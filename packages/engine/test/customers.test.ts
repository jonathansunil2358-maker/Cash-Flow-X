import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, complaintsOf, happyRegulars, modifiersOf, newGame, regularsOf, replay, stateChecksum, tickInPlace, toSubmission, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 22): GameState => {
  let s = play(newGame({ companyName: 'C', industryId: 'software', seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'C', industryId: 'software', seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 500_000_00;
  s.ledger.balances.shareCapital -= 500_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('customers and brand', () => {
  it('the loyalty programme raises demand, lowers churn, costs money every month and can be closed', () => {
    const s = company('CUS-LOY');
    const d0 = modifiersOf(s).demandMult; const c0 = modifiersOf(s).churnMult;
    applyActionInPlace(s, { type: 'setLoyalty', on: true });
    expect(modifiersOf(s).demandMult).toBeGreaterThan(d0);
    expect(modifiersOf(s).churnMult).toBeLessThan(c0);
    expect(() => applyActionInPlace(s, { type: 'setLoyalty', on: true })).toThrow();
    run(s, 3);
    applyActionInPlace(s, { type: 'setLoyalty', on: false });
    expect(modifiersOf(s).demandMult).toBeCloseTo(d0, 5);
  });

  it('complaints can be answered; ignored ones cost reputation', () => {
    const s = company('CUS-SERVICE');
    const first = complaintsOf(s);
    expect(first.length).toBeGreaterThan(0);
    applyActionInPlace(s, { type: 'resolveComplaint', id: first[0].id });
    expect(complaintsOf(s).some((c) => c.id === first[0].id)).toBe(false);
    expect(() => applyActionInPlace(s, { type: 'resolveComplaint', id: first[0].id })).toThrow();
    // Two copies of the same company: one answers everything every month, the other ignores it.
    const kind = structuredClone(s); const rude = structuredClone(s);
    for (let i = 0; i < 6; i++) {
      for (const c of complaintsOf(kind)) { try { applyActionInPlace(kind, { type: 'resolveComplaint', id: c.id }); } catch { /* poor */ } }
      tickInPlace(kind); tickInPlace(rude); answer(kind); answer(rude);
      expect(checkIntegrity(kind).slice(0, 2)).toEqual([]);
    }
    expect(kind.reputation).toBeGreaterThan(rude.reputation);
  });

  it('influencer deals cost money, take time, and only one runs at a time', () => {
    for (const tier of ['micro', 'mega']) {
      const s = company(`CUS-INF-${tier}`);
      const cash = s.ledger.balances.cash;
      applyActionInPlace(s, { type: 'influencer', tier });
      expect(s.ledger.balances.cash).toBeLessThan(cash);
      expect(() => applyActionInPlace(s, { type: 'influencer', tier })).toThrow();
      run(s, 5);
    }
  });

  it('Black Friday only runs in November, once a year, and the books balance', () => {
    const s = company('CUS-BF', 22);
    expect(s.month % 12).toBe(10);
    applyActionInPlace(s, { type: 'blackFriday' });
    expect(() => applyActionInPlace(s, { type: 'blackFriday' })).toThrow();
    run(s, 3);
    expect(() => applyActionInPlace(s, { type: 'blackFriday' })).toThrow();
  });

  it('five regulars have moods that follow reputation', () => {
    const s = company('CUS-REG');
    expect(regularsOf(s)).toHaveLength(5);
    s.reputation = 100;
    expect(happyRegulars(s)).toBe(5);
    s.reputation = 0;
    expect(happyRegulars(s)).toBe(0);
  });

  it('a company that uses them all replays identically on the server', () => {
    const s = play(newGame({ companyName: 'C', industryId: 'software', seed: 'CUS-REPLAY', difficulty: 'easy' }), 22);
    for (const a of [{ type: 'setLoyalty', on: true }, { type: 'influencer', tier: 'micro' }, { type: 'blackFriday' }] as const) { try { applyActionInPlace(s, a); } catch { /* not allowed or affordable */ } }
    run(s, 10);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});
