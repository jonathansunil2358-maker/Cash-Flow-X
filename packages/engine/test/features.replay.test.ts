import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ActionError, applyActionInPlace, checkIntegrity, finalScore, forecast, INDUSTRY_IDS, newGame, plSummary, replay, tickInPlace, toSubmission,
  type Action, type DifficultyId, type GameState, type IndustryId,
} from '../src/index';

/** One step of a random game: some decisions, then a month passes. */
const decision: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ type: fc.constant('startPromo' as const), discountPct: fc.constantFrom(10, 20, 30, 15), months: fc.integer({ min: 0, max: 4 }) }),
  fc.record({ type: fc.constant('setPay' as const), level: fc.constantFrom('below' as const, 'market' as const, 'above' as const) }),
  fc.record({ type: fc.constant('setTraining' as const), amount: fc.integer({ min: 0, max: 400_000 }) }),
  fc.record({ type: fc.constant('startProject' as const), projectId: fc.constantFrom('productLine', 'costCutting', 'qualityLeap', 'nope') }),
  fc.record({ type: fc.constant('cancelProject' as const), projectId: fc.constantFrom('productLine', 'costCutting', 'qualityLeap') }),
  fc.record({ type: fc.constant('hire' as const), role: fc.constantFrom('ops' as const, 'rnd' as const, 'sales' as const), count: fc.integer({ min: 1, max: 4 }) }),
  fc.record({ type: fc.constant('fire' as const), role: fc.constantFrom('ops' as const, 'rnd' as const, 'sales' as const), count: fc.integer({ min: 1, max: 2 }) }),
  fc.record({ type: fc.constant('setMarketing' as const), amount: fc.integer({ min: 0, max: 30_000_00 }) }),
  fc.record({ type: fc.constant('setPrice' as const), price: fc.integer({ min: 100, max: 40_000 }) }),
);

function play(industryId: IndustryId, difficulty: DifficultyId, seed: string, steps: Action[][]): GameState {
  const s = newGame({ companyName: 'Prop', industryId, seed, difficulty });
  for (const step of steps) {
    if (s.status !== 'playing') break;
    for (const a of step) {
      try { applyActionInPlace(s, a); } catch (e) { if (!(e instanceof ActionError)) throw e; }
    }
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    tickInPlace(s);
  }
  return s;
}

describe('new mechanics under replay', () => {
  it('any sequence of decisions replays to exactly the same game, and the books stay balanced', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INDUSTRY_IDS), fc.constantFrom<DifficultyId>('easy', 'medium', 'hard'), fc.string({ minLength: 1, maxLength: 8 }),
        fc.array(fc.array(decision, { maxLength: 3 }), { minLength: 6, maxLength: 30 }),
        (industry, difficulty, seed, steps) => {
          const s = play(industry, difficulty, seed, steps);
          const replayed = replay(toSubmission(s));
          expect(replayed.ledger.balances).toEqual(s.ledger.balances);
          expect(replayed.morale).toBe(s.morale);
          expect(replayed.projects).toEqual(s.projects);
          expect(replayed.projectsDone).toEqual(s.projectsDone);
          expect(replayed.competitors).toEqual(s.competitors);
          expect(finalScore(replayed).score).toBe(finalScore(s).score);
          expect(checkIntegrity(s)).toEqual([]);
        },
      ),
      { numRuns: 120 },
    );
  });
});

describe('forecast with the new mechanics', () => {
  it('first forecast month matches the real next month for revenue, with a promotion and seasonality', () => {
    const s = newGame({ companyName: 'F', industryId: 'ecommerce', seed: 'FORECAST', difficulty: 'easy' });
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 1 });
    applyActionInPlace(s, { type: 'hire', role: 'sales', count: 1 });
    applyActionInPlace(s, { type: 'setMarketing', amount: 100_000 });
    for (let i = 0; i < 3; i++) { if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); tickInPlace(s); }
    applyActionInPlace(s, { type: 'startPromo', discountPct: 20, months: 2 });
    const f = forecast(s, 3);
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    tickInPlace(s);
    const actual = s.history.at(-1)!;
    expect(f.points[0].revenue).toBeGreaterThan(0);
    // Forecasts use expected-value randomness, so allow a band around the one real draw.
    expect(Math.abs(f.points[0].revenue - plSummary(actual.period.pl).revenue) / Math.max(1, f.points[0].revenue)).toBeLessThan(0.35);
  });
});
