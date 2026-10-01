import { describe, expect, it } from 'vitest';
import {
  advanceMonth, applyAction, finalScore, forecast, newGame, replay, toSubmission, type Action,
} from '../src/index';
import { playPolicy } from './helpers';

describe('determinism and replay', () => {
  it('the same seed and decisions always produce the same game', () => {
    const a = playPolicy('software', 'SAME', 30);
    const b = playPolicy('software', 'SAME', 30);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds produce different games', () => {
    const a = playPolicy('clothing', 'SEED-A', 24);
    const b = playPolicy('clothing', 'SEED-B', 24);
    expect(a.ledger.balances.cash).not.toBe(b.ledger.balances.cash);
  });

  it('replaying a submission reproduces the final score exactly', () => {
    const s = playPolicy('ecommerce', 'REPLAY', 40);
    const replayed = replay(toSubmission(s));
    expect(finalScore(replayed).score).toBe(finalScore(s).score);
    expect(replayed.ledger.balances).toEqual(s.ledger.balances);
  });

  it('a tampered action log does not reproduce the score', () => {
    const s = playPolicy('software', 'TAMPER', 30);
    const sub = toSubmission(s);
    const tampered = { ...sub, actions: sub.actions.map((x) => (x.action.type === 'setMarketing' ? { ...x, action: { ...x.action, amount: x.action.amount * 3 } as Action } : x)) };
    let score: number | null = null;
    try {
      score = finalScore(replay(tampered)).score;
    } catch {
      score = null;
    }
    expect(score).not.toBe(finalScore(s).score);
  });

  it('rejects logs that are out of order or missing an event decision', () => {
    const s = playPolicy('software', 'MONTHS', 12);
    expect(() => replay({ ...toSubmission(s), actions: [...toSubmission(s).actions].reverse() })).toThrow();
    const withDecisions = toSubmission(s).actions.filter((a) => a.action.type !== 'resolveEvent');
    if (withDecisions.length < toSubmission(s).actions.length) {
      expect(() => replay({ ...toSubmission(s), actions: withDecisions })).toThrow(/missing the decision/);
    }
  });
});

describe('purity', () => {
  it('advanceMonth and applyAction never mutate their input', () => {
    const s = newGame({ companyName: 'Pure', industryId: 'fitness', seed: 'PURE' });
    const snapshot = JSON.stringify(s);
    const s2 = applyAction(s, { type: 'hire', role: 'ops', count: 2 });
    advanceMonth(s2);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('forecast runs on a copy and never changes the game', () => {
    const s = playPolicy('clothing', 'FORECAST', 6);
    const snapshot = JSON.stringify(s);
    const f = forecast(s, 12);
    expect(f.points.length).toBeGreaterThan(0);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
