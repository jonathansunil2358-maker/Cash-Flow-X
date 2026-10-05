import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, newGame, replay, stateChecksum, tickInPlace, toSubmission, CHOICE_EVENTS, startNamedEvent, createRng, councilOptions, councilOpen, hasStock,
  stockLevel, budgetOf, outsourced, monumentsOf, MONUMENTS, trendsOf, trendScore, adWeights, adScore, bestAds, AD_UNITS, demandOf, payrollScore, cheapestRota, covered, leaseOf, negStart, negOffer,
  type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 40, industryId: 'software' | 'ecommerce' = 'software'): GameState => {
  let s = play(newGame({ companyName: 'P', industryId, seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'P', industryId, seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 2_000_000_00;
  s.ledger.balances.shareCapital -= 2_000_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('version 8 fun', () => {
  it('every choice of every new decision runs and leaves the books balanced', () => {
    for (const id of ['leakAlert', 'recallDrill', 'viralPost', 'supplierScare', 'mentorWarn']) {
      const def = CHOICE_EVENTS.find((e) => e.id === id)!;
      expect(def, id).toBeDefined();
      for (const c of def.setup(company(`P7-${id}`), createRng({ rng: 1 })).choices) {
        for (const rng of [5, 77, 901]) {
          const s = company(`P7-${id}`);
          s.pendingEvent = null;
          startNamedEvent(s, id, createRng({ rng }));
          expect((s.pendingEvent as { id: string } | null)?.id).toBe(id);
          applyActionInPlace(s, { type: 'resolveEvent', choiceId: c.id });
          expect(checkIntegrity(s)).toEqual([]);
          run(s, 8);
        }
      }
    }
  });

  it('events come up in a long game and it replays', () => {
    const seen = new Set<string>();
    const s = newGame({ companyName: 'P', industryId: 'software', seed: 'P7-LONG', difficulty: 'easy' });
    for (let i = 0; i < 120 && s.status === 'playing'; i++) { if (s.pendingEvent) seen.add(s.pendingEvent.id); answer(s); applyPolicy(s); answer(s); tickInPlace(s); }
    expect([...seen].some((x) => ['leakAlert', 'recallDrill', 'viralPost', 'supplierScare', 'mentorWarn'].includes(x))).toBe(true);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });

  it('council: three options a quarter, one vote, effects apply', () => {
    const s = company('P7-COUNCIL');
    expect(councilOptions(s)).toHaveLength(3);
    expect(councilOpen(s)).toBe(true);
    const id = councilOptions(s)[0].id;
    applyActionInPlace(s, { type: 'council', id });
    expect(councilOpen(s)).toBe(false);
    expect(() => applyActionInPlace(s, { type: 'council', id })).toThrow();
    run(s, 8);
    expect(councilOpen(s)).toBe(true);
    expect(() => applyActionInPlace(s, { type: 'council', id: 'nope' })).toThrow();
  });

  it('stock control only matters for stock-holding businesses and costs money each month', () => {
    const s = company('P7-STOCK', 40, 'ecommerce');
    expect(hasStock(s)).toBe(true);
    applyActionInPlace(s, { type: 'stockControl', level: 2 });
    expect(stockLevel(s)).toBe(2);
    expect(() => applyActionInPlace(s, { type: 'stockControl', level: 7 })).toThrow();
    run(s, 4);
    expect(hasStock(company('P7-SOFT'))).toBe(false);
  });

  it('training budget: shares must total 100, once a year', () => {
    const s = company('P7-BUDGET');
    expect(() => applyActionInPlace(s, { type: 'trainingBudget', ops: 50, rnd: 50, sales: 50 })).toThrow();
    applyActionInPlace(s, { type: 'trainingBudget', ops: 80, rnd: 10, sales: 10 });
    expect(budgetOf(s)?.ops).toBe(80);
    expect(() => applyActionInPlace(s, { type: 'trainingBudget', ops: 80, rnd: 10, sales: 10 })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
    run(s, 14);
  });

  it('outsourcing can be switched on and off and the books balance', () => {
    const s = company('P7-OUT');
    applyActionInPlace(s, { type: 'outsource', id: 'support', on: true });
    applyActionInPlace(s, { type: 'outsource', id: 'accounts', on: true });
    expect(outsourced(s)).toEqual(['support', 'accounts']);
    expect(() => applyActionInPlace(s, { type: 'outsource', id: 'support', on: true })).toThrow();
    run(s, 24);
    applyActionInPlace(s, { type: 'outsource', id: 'support', on: false });
    expect(outsourced(s)).toEqual(['accounts']);
  });

  it('limited range: one at a time, resolves after three months either way', () => {
    const s = company('P7-RANGE');
    applyActionInPlace(s, { type: 'rangeBatch', size: 'big' });
    expect(() => applyActionInPlace(s, { type: 'rangeBatch', size: 'small' })).toThrow();
    run(s, 4);
    expect(s.play7?.range).toBeUndefined();
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('monuments read from the company', () => {
    const s = company('P7-MON', 130);
    expect(MONUMENTS.length).toBeGreaterThanOrEqual(8);
    expect(monumentsOf(s).some((m) => m.id === 'decade')).toBe(s.month >= 120);
  });

  it('a played game that uses all of it replays identically', () => {
    const g = play(newGame({ companyName: 'P', industryId: 'ecommerce', seed: 'P7-REPLAY', difficulty: 'easy' }), 38);
    const id = councilOptions(g)[0].id;
    for (const a of [{ type: 'council', id }, { type: 'stockControl', level: 1 }, { type: 'trainingBudget', ops: 70, rnd: 10, sales: 20 }, { type: 'outsource', id: 'delivery', on: true }, { type: 'rangeBatch', size: 'small' }] as unknown as import('../src/index').Action[]) { try { applyActionInPlace(g, a); } catch { /* not affordable: fine */ } }
    run(g, 20);
    expect(stateChecksum(replay(toSubmission(g)))).toBe(stateChecksum(g));
  });
});

describe('four more daily games', () => {
  it('lease haggle reuses the negotiation rules', () => {
    const n = leaseOf('2026-10-05');
    expect(n.item).toContain('lease');
    const st = negOffer(n, negStart(n), 100);
    expect(st.status).toBe('deal');
  });
  it('trend: right calls score by count', () => {
    const c = trendsOf('2026-10-05');
    expect(c).toHaveLength(3);
    expect(trendScore(c, Object.fromEntries(c.map((x) => [x.id, x.up]))).points).toBe(100);
    expect(trendScore(c, Object.fromEntries(c.map((x) => [x.id, !x.up]))).points).toBe(0);
  });
  it('ad budget: the best split scores 100 and a wrong total scores 0', () => {
    const w = adWeights('2026-10-05');
    let best: number[] = [0, 0, 0, AD_UNITS]; let bv = -1;
    for (let a = 0; a <= AD_UNITS; a++) for (let b = 0; a + b <= AD_UNITS; b++) for (let c = 0; a + b + c <= AD_UNITS; c++) { const al = [a, b, c, AD_UNITS - a - b - c]; const sc = adScore(w, al).points; if (sc > bv) { bv = sc; best = al; } }
    expect(adScore(w, best).points).toBe(100);
    expect(bestAds(w)).toBeGreaterThan(0);
    expect(adScore(w, [5, 5, 5, 5]).points).toBe(0);
  });
  it('payroll: the cheapest rota scores 100; an uncovered one scores 0', () => {
    const d = demandOf('2026-10-05');
    expect(d).toHaveLength(6);
    const min = cheapestRota(d);
    expect(Number.isFinite(min)).toBe(true);
    let rota: number[] = [];
    for (let a = 0; a <= 5 && !rota.length; a++) for (let b = 0; b <= 5; b++) for (let c = 0; c <= 5; c++) for (let e = 0; e <= 5; e++) if (!rota.length && a + b + c + e === min && covered([a, b, c, e]).every((x, j) => x >= d[j])) rota = [a, b, c, e];
    expect(payrollScore(d, rota).points).toBe(100);
    expect(payrollScore(d, [0, 0, 0, 0]).points).toBe(0);
  });
});

import { badgesOf, claimSeason, recordMini, seasonIdOf, seasonStamps, MINI_KINDS, SEASON_NEEDED } from '../src/index';
describe('badges and the seasonal album', () => {
  const base = { gems: 0, badges: [] as string[], minis: {} as Record<string, { day: string; points: number }> };
  it('a high score earns a badge once; a low one does not', () => {
    const a = recordMini({ ...base }, 'trend', '2026-10-05', 100);
    expect(badgesOf(a.profile)).toEqual(['mini-trend']);
    const b = recordMini({ ...a.profile }, 'trend', '2026-10-06', 100);
    expect(badgesOf(b.profile)).toEqual(['mini-trend']);
    expect(badgesOf(recordMini({ ...base }, 'payroll', '2026-10-05', 40).profile)).toEqual([]);
  });
  it('six different games in a quarter fill the album, claimed once', () => {
    let p: typeof base & { seasonClaims?: string[] } = { ...base };
    expect(seasonIdOf('2026-10-05')).toBe('2026-Q4');
    for (const k of MINI_KINDS.slice(0, SEASON_NEEDED - 1)) p = recordMini(p, k, '2026-11-01', 50).profile;
    expect(() => claimSeason(p, '2026-11-02')).toThrow();
    p = recordMini(p, MINI_KINDS[SEASON_NEEDED], '2026-11-02', 50).profile;
    expect(seasonStamps(p, '2026-12-01').length).toBe(SEASON_NEEDED);
    p = claimSeason(p, '2026-12-01').profile;
    expect(() => claimSeason(p, '2026-12-02')).toThrow();
    expect(seasonStamps(p, '2027-01-02').length).toBe(0);
  });
});
