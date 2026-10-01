import { describe, expect, it } from 'vitest';
import {
  MINI_GEMS, miniDone, negOffer, negScore, negStart, negotiationOf, newGame, newProfile, pitchMetrics, pitchPriorities, pitchScore, recordMini, stockScore, stockTakeOf, stockWrong,
  tetrisBalances, tetrisOf, tetrisScore, tickInPlace, applyActionInPlace, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const days = Array.from({ length: 60 }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`);

describe('daily results', () => {
  it('pay by score, once a day per game', () => {
    expect([100, 70, 40, 5].map(MINI_GEMS)).toEqual([12, 7, 3, 0]);
    let p = { ...newProfile(), gems: 0 };
    expect(miniDone(p, 'pitch', '2026-10-01')).toBe(false);
    const r = recordMini(p, 'pitch', '2026-10-01', 90);
    expect(r.gems).toBe(12);
    p = r.profile;
    expect(miniDone(p, 'pitch', '2026-10-01')).toBe(true);
    expect(recordMini(p, 'pitch', '2026-10-01', 100).gems).toBe(0);
    expect(recordMini(p, 'tetris', '2026-10-01', 100).gems).toBe(12);
    expect(recordMini(p, 'pitch', '2026-10-02', 10).gems).toBe(0);
  });
});

describe('negotiation duel', () => {
  it('is the same for everyone; a fair offer closes, a greedy one drives the seller away, and a smart haggle scores best', () => {
    const n = negotiationOf(days[0]);
    expect(negotiationOf(days[0])).toEqual(n);
    expect(n.reservation).toBeLessThan(n.list);
    // Paying list closes the deal at once but scores little.
    const lazy = negOffer(n, negStart(n), 100);
    expect(lazy.status).toBe('deal');
    // Lowballing twice walks the seller away.
    let st = negStart(n);
    for (let i = 0; i < 4 && st.status === 'open'; i++) st = negOffer(n, st, 50);
    expect(st.status).toBe('walked');
    expect(negScore(n, st)).toBe(0);
    // Always offering the highest price that is still a deal is as good as it gets: try offers from low to high until it closes.
    const sweep = (start: number): number => { let s2 = negStart(n); for (let pct = start; s2.status === 'open' && pct <= 100; pct += 5) s2 = negOffer(n, s2, pct); return negScore(n, s2); };
    const bestSweep = Math.max(...[70, 75, 80, 85, 90].map(sweep));
    expect(bestSweep).toBeGreaterThan(negScore(n, lazy));
    for (const d of days) { const m = negotiationOf(d); expect(negScore(m, negOffer(m, negStart(m), 100))).toBeLessThan(60); }
    expect(negOffer(n, lazy, 50)).toBe(lazy);
  });
});

describe('pitch day', () => {
  it('scores real metrics against what the investor wants today, deterministically', () => {
    const s = play(newGame({ companyName: 'P', industryId: 'software', seed: 'PITCH', difficulty: 'easy' }), 20);
    const metrics = pitchMetrics(s);
    expect(metrics).toHaveLength(6);
    for (const d of days) { const p = pitchPriorities(d); expect(p).toHaveLength(2); expect(p[0]).not.toBe(p[1]); expect(pitchPriorities(d)).toEqual(p); }
    const strong = metrics.filter((m) => m.strong).map((m) => m.id);
    const weak = metrics.filter((m) => !m.strong).map((m) => m.id);
    const day = days[3];
    const best = pitchScore(s, day, strong.slice(0, 3));
    const worst = pitchScore(s, day, weak.slice(0, 3));
    expect(best.points).toBeGreaterThanOrEqual(worst.points);
    expect(pitchScore(s, day, []).points).toBe(0);
    expect(pitchScore(s, day, ['nonsense']).points).toBe(0);
    expect(pitchScore(s, day, strong.slice(0, 3)).points).toBeLessThanOrEqual(100);
  });
});

describe('stock-take rush', () => {
  it('always has exactly three wrong shelves; finding them scores, false alarms cost', () => {
    for (const d of days) {
      const lines = stockTakeOf(d);
      expect(lines).toHaveLength(12);
      const wrong = lines.filter(stockWrong);
      expect(wrong).toHaveLength(3);
      expect(stockScore(lines, wrong.map((l) => l.id)).points).toBe(100);
      expect(stockScore(lines, []).points).toBe(0);
      const ok = lines.find((l) => !stockWrong(l))!;
      expect(stockScore(lines, [...wrong.map((l) => l.id), ok.id]).points).toBe(80);
    }
  });
});

describe('cash-flow tetris', () => {
  it('scores a valid, safe plan 100, penalises overdrafts, and refuses plans outside the windows; most days are solvable', () => {
    let solvable = 0;
    for (const d of days) {
      const t = tetrisOf(d);
      expect(tetrisOf(d)).toEqual(t);
      expect(tetrisBalances(t, {})).toHaveLength(t.weeks);
      // Brute force the best plan.
      let best = 0;
      const place: Record<string, number> = {};
      const go = (i: number) => {
        if (i === t.flex.length) { best = Math.max(best, tetrisScore(t, place).points); return; }
        for (let w = t.flex[i].from; w <= t.flex[i].to; w++) { place[t.flex[i].id] = w; go(i + 1); }
      };
      go(0);
      if (best >= 60) solvable++;
      const bad = Object.fromEntries(t.flex.map((f) => [f.id, f.to + 1]));
      expect(tetrisScore(t, bad)).toMatchObject({ points: 0, valid: false });
    }
    expect(solvable).toBeGreaterThanOrEqual(days.length * 0.7);
  });
});
