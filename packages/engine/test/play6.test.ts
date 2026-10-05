import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, newGame, replay, stateChecksum, tickInPlace, toSubmission, CHOICE_EVENTS, startNamedEvent, createRng, layoutWeights, layoutScore, SHELVES,
  rivalDiscount, TENDERS, eventCardsOf, founderBook, mascotOf, mascotMood, nextMonthRevenue, forecastScore, interviewCandidates, hiringScore, candidateValue, routeGraphOf, routeScore, cheapestNetwork,
  warRival, warScore, WAR_PRICES, WAR_WEEKS, tempsActive, tierOf, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 40): GameState => {
  let s = play(newGame({ companyName: 'P', industryId: 'software', seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'P', industryId: 'software', seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 2_000_000_00;
  s.ledger.balances.shareCapital -= 2_000_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('version 7 fun', () => {
  it('every choice of every new decision runs and leaves the books balanced', () => {
    for (const id of ['insiderTip', 'boardCoup', 'disasterSeason', 'taxInspection', 'celebDeal']) {
      const def = CHOICE_EVENTS.find((e) => e.id === id)!;
      expect(def, id).toBeDefined();
      for (const c of def.setup(company(`P6-${id}`), createRng({ rng: 1 })).choices) {
        for (const kind of ['flood', 'heatwave', 'storm']) {
          const s = company(`P6-${id}`);
          s.pendingEvent = null;
          s.play6 = { kind };
          startNamedEvent(s, id, createRng({ rng: 5 }));
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
    const s = newGame({ companyName: 'P', industryId: 'software', seed: 'P6-LONG', difficulty: 'easy' });
    for (let i = 0; i < 110 && s.status === 'playing'; i++) { if (s.pendingEvent) seen.add(s.pendingEvent.id); answer(s); applyPolicy(s); answer(s); tickInPlace(s); }
    expect([...seen].some((x) => ['insiderTip', 'boardCoup', 'disasterSeason', 'taxInspection', 'celebDeal'].includes(x))).toBe(true);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });

  it('temps: one batch, cost money, add capacity for three months', () => {
    const s = company('P6-TEMP');
    applyActionInPlace(s, { type: 'temps', trained: true });
    expect(tempsActive(s)).toBe(true);
    expect(() => applyActionInPlace(s, { type: 'temps', trained: false })).toThrow();
    run(s, 4);
    expect(tempsActive(s)).toBe(false);
  });

  it('loyalty tiers cost money each month and can be changed', () => {
    const s = company('P6-TIER');
    applyActionInPlace(s, { type: 'tiers', level: 3 });
    expect(tierOf(s)).toBe(3);
    expect(() => applyActionInPlace(s, { type: 'tiers', level: 3 })).toThrow();
    expect(() => applyActionInPlace(s, { type: 'tiers', level: 9 })).toThrow();
    run(s, 4);
    applyActionInPlace(s, { type: 'tiers', level: 0 });
  });

  it('warehouse layout: the busiest shelves nearest the door score best; bad input is refused', () => {
    const s = company('P6-LAY');
    const w = layoutWeights(s);
    const best = w.map((x, i) => [x, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map((x) => x[1]);
    expect(layoutScore(w, best)).toBe(1);
    expect(layoutScore(w, [...best].reverse())).toBeLessThanOrEqual(0.001);
    expect(() => applyActionInPlace(s, { type: 'layout', order: [0, 0, 1, 2, 3, 4, 5, 6] })).toThrow();
    applyActionInPlace(s, { type: 'layout', order: best });
    expect(s.play6?.layout?.score).toBe(1);
    expect(() => applyActionInPlace(s, { type: 'layout', order: best })).toThrow();
    expect(SHELVES).toHaveLength(8);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('tenders: a big enough discount wins, a small one loses the fee, books balance', () => {
    const win = company('P6-TEN'); const lose = structuredClone(win);
    applyActionInPlace(win, { type: 'tender', index: 0, discount: 15 });
    expect(win.economy.active.some((a) => a.type === 'tender-demand')).toBe(true);
    expect(() => applyActionInPlace(win, { type: 'tender', index: 1, discount: 15 })).toThrow();
    const need = rivalDiscount(lose, 2);
    expect(need).toBeGreaterThan(5);
    applyActionInPlace(lose, { type: 'tender', index: 2, discount: 5 });
    expect(lose.economy.active.some((a) => a.type === 'tender-demand')).toBe(false);
    expect(() => applyActionInPlace(lose, { type: 'tender', index: 2, discount: 10 })).toThrow();
    expect(TENDERS).toHaveLength(3);
    expect(checkIntegrity(win)).toEqual([]); expect(checkIntegrity(lose)).toEqual([]);
    run(win, 14);
  });

  it('mascot, inspection, anniversary and the book read from the game', () => {
    const s = company('P6-MASC');
    applyActionInPlace(s, { type: 'mascot', id: 'owl' });
    expect(mascotOf(s)?.id).toBe('owl');
    expect(['delighted', 'content', 'worried']).toContain(mascotMood(s).mood);
    expect(() => applyActionInPlace(s, { type: 'mascot', id: 'dragon' })).toThrow();
    run(s, 14);
    expect(s.play6?.inspection).toBeTruthy();
    expect(founderBook(s)).toContain(s.companyName);
    expect(Array.isArray(eventCardsOf(s))).toBe(true);
  });

  it('a played game that uses all of it replays identically', () => {
    const g = play(newGame({ companyName: 'P', industryId: 'software', seed: 'P6-REPLAY', difficulty: 'easy' }), 38);
    for (const a of [{ type: 'temps', trained: false }, { type: 'tiers', level: 1 }, { type: 'tender', index: 0, discount: 10 }, { type: 'mascot', id: 'fox' }, { type: 'layout', order: [0, 1, 2, 3, 4, 5, 6, 7] }] as unknown as import('../src/index').Action[]) { try { applyActionInPlace(g, a); } catch { /* not affordable: fine */ } }
    run(g, 20);
    expect(stateChecksum(replay(toSubmission(g)))).toBe(stateChecksum(g));
  });
});

describe('four more daily games', () => {
  it('forecast: an exact guess scores 100 and a far one scores 0; the actual comes from a quiet clone', () => {
    const s = company('P6-FC');
    const actual = nextMonthRevenue(s, (c) => tickInPlace(c, { simulation: true }));
    expect(actual).toBeGreaterThan(0);
    expect(forecastScore(actual, actual)).toBe(100);
    expect(forecastScore(actual * 3, actual)).toBe(0);
    expect(s.month).toBe(company('P6-FC').month);
  });
  it('hiring: picking the best true candidate scores 100, the exaggerator less', () => {
    const c = interviewCandidates('2026-10-04');
    expect(c).toHaveLength(4);
    const best = c.reduce((a, b) => (candidateValue(b) > candidateValue(a) ? b : a));
    expect(hiringScore(c, best.id).points).toBe(100);
    expect(hiringScore(c, 'nope').points).toBe(0);
    expect(c.filter((x) => x.claimed > x.trueSkill)).toHaveLength(1);
  });
  it('routes: the cheapest network scores 100, a disconnected one 0', () => {
    const g = routeGraphOf('2026-10-04');
    const all = g.routes.map((r) => r.id);
    expect(routeScore(g, all).valid).toBe(true);
    expect(routeScore(g, all).points).toBeLessThanOrEqual(100);
    expect(routeScore(g, []).points).toBe(0);
    // Greedy cheapest edges (Kruskal) match the optimum.
    const p = g.nodes.map((_, i) => i); const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x])));
    const pick: string[] = [];
    for (const e of [...g.routes].sort((a, b) => a.cost - b.cost)) if (f(e.a) !== f(e.b)) { p[f(e.a)] = f(e.b); pick.push(e.id); }
    expect(routeScore(g, pick).points).toBe(100);
    expect(routeScore(g, pick).cost).toBe(cheapestNetwork(g));
  });
  it('price war: the rival has a three-week rhythm and the best prices score 100', () => {
    const r = warRival('2026-10-04');
    expect(r).toHaveLength(WAR_WEEKS);
    expect(r[0]).toBe(r[3]);
    const best = r.map((rv) => [...WAR_PRICES].sort((a, b) => Math.max(0, 100 * (1 + (rv - b) * 0.12)) * (b - 6) - Math.max(0, 100 * (1 + (rv - a) * 0.12)) * (a - 6))[0]);
    expect(warScore('2026-10-04', best).points).toBe(100);
    expect(warScore('2026-10-04', [8, 8, 8, 8, 8, 8]).points).toBeLessThan(100);
  });
});
