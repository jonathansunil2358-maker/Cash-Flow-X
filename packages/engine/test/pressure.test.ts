import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, cleanModifiers, complianceRate, finalScore, modifierBonus, modifiersOf, newGame, OPTIONAL_MODIFIERS, prestigeCheck,
  rankCostMult, replay, rivalPressure, rivalTrait, saturationFactor, tickInPlace, toSubmission, wageInflation, WAGE_INFLATION, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const play = (s: GameState, months: number) => {
  for (let i = 0; i < months && s.status === 'playing'; i++) {
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    applyPolicy(s);
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    tickInPlace(s);
  }
  return s;
};

describe('the slow squeeze', () => {
  it('compliance is free for small companies and grows with revenue, capped', () => {
    expect(complianceRate(1_000_000_00)).toBe(0);
    expect(complianceRate(2_000_000_00)).toBe(0);
    expect(complianceRate(4_000_000_00)).toBeCloseTo(0.003);
    expect(complianceRate(16_000_000_00)).toBeCloseTo(0.006);
    expect(complianceRate(1_000_000_000_00)).toBe(0.02);
  });

  it('wages and rents rise every new year, and the books stay balanced', () => {
    const s = newGame({ companyName: 'W', industryId: 'ecommerce', seed: 'WAGE', difficulty: 'easy' });
    play(s, 13);
    expect(s.salaryIndex).toBeCloseTo(1 + WAGE_INFLATION);
    expect(s.rentIndex).toBeCloseTo(1.02);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('saturation: demand only shrinks once you hold a big share, and never below 60%', () => {
    const s = newGame({ companyName: 'S', industryId: 'ecommerce', seed: 'SAT', difficulty: 'easy' });
    expect(saturationFactor(s)).toBe(1);
    play(s, 3);
    const k = s.history.at(-1)!.kpis;
    k.preferenceShare = 0.2;
    expect(saturationFactor(s)).toBe(1);
    k.preferenceShare = 0.6;
    expect(saturationFactor(s)).toBeLessThan(1);
    k.preferenceShare = 1;
    expect(saturationFactor(s)).toBe(0.6);
  });

  it('every prestige rank makes suppliers dearer and rivals sharper, but not on Hard', () => {
    const a = newGame({ companyName: 'R', industryId: 'software', seed: 'RANK', difficulty: 'medium', prestigeLevel: 0 });
    const b = newGame({ companyName: 'R', industryId: 'software', seed: 'RANK', difficulty: 'medium', prestigeLevel: 4 });
    expect(rankCostMult(a)).toBe(1);
    expect(rankCostMult(b)).toBeCloseTo(1.06);
    expect(rivalPressure(b)).toBeGreaterThan(rivalPressure(a));
    expect(modifiersOf(b).unitCostMult).toBeGreaterThan(modifiersOf(a).unitCostMult);
    const hard = newGame({ companyName: 'R', industryId: 'software', seed: 'RANK', difficulty: 'hard', prestigeLevel: 4 });
    expect(rankCostMult(hard)).toBe(1);
  });
});

describe('rival personalities', () => {
  it('are fixed by position, so every sector and every old game has them', () => {
    expect([0, 1, 2, 3].map(rivalTrait)).toEqual(['slasher', 'snob', 'copycat', 'slasher']);
  });

  it('a snob never cuts prices; a copycat follows your price', () => {
    const s = newGame({ companyName: 'T', industryId: 'ecommerce', seed: 'TRAITS', difficulty: 'hard' });
    play(s, 40);
    s.competitors.forEach((c, i) => { if (rivalTrait(i) === 'snob') expect(c.cutMonths).toBe(0); });
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('optional modifiers', () => {
  it('are cleaned to known ids and ignored on Hard and in challenges', () => {
    expect(cleanModifiers(['slow-market', 'bogus', 'slow-market', 'inflation'])).toEqual(['slow-market', 'inflation']);
    expect(cleanModifiers('x')).toEqual([]);
    const ids = OPTIONAL_MODIFIERS.map((m) => m.id);
    const hard = newGame({ companyName: 'H', industryId: 'software', seed: 'M', difficulty: 'hard', modifiers: ids });
    expect(hard.modifiers).toBeUndefined();
    const daily = newGame({ companyName: 'D', industryId: 'software', seed: 'DAILY-2026-10-01', scenarioId: 'daily', modifiers: ids });
    expect(daily.modifiers).toBeUndefined();
  });

  it('each one bites, and pays +10% on score and Legacy points', () => {
    const base = newGame({ companyName: 'M', industryId: 'software', seed: 'MOD', difficulty: 'easy' });
    const hard = newGame({ companyName: 'M', industryId: 'software', seed: 'MOD', difficulty: 'easy', modifiers: ['aggressive-rivals', 'tight-credit', 'slow-market', 'inflation'] });
    expect(hard.modifiers).toHaveLength(4);
    expect(modifierBonus(hard.modifiers)).toBeCloseTo(1.4);
    expect(modifierBonus(undefined)).toBe(1);
    expect(rivalPressure(hard)).toBe(rivalPressure(base) * 1.5);
    expect(wageInflation(hard)).toBe(wageInflation(base) * 2);
    expect(hard.economy.demandMult).toBeCloseTo(0.9);
    expect(hard.economy.lendingAppetite).toBeCloseTo(0.6);
    expect(modifiersOf(hard).loanSpreadDelta).toBeCloseTo(modifiersOf(base).loanSpreadDelta + 0.01);
    // Same company, same score maths: the modifier multiplies the final score.
    const a = play(newGame({ companyName: 'M', industryId: 'ecommerce', seed: 'MODSCORE', difficulty: 'easy', modifiers: ['inflation'] }), 12);
    const aScore = finalScore(a).score;
    const clone = structuredClone(a);
    delete clone.modifiers;
    expect(aScore).toBe(Math.round(finalScore(clone).score * 1.1));
    expect(prestigeCheck(a).points).toBeGreaterThanOrEqual(prestigeCheck(clone).points);
  });

  it('replay to exactly the same game', () => {
    const s = play(newGame({ companyName: 'M', industryId: 'restaurant', seed: 'MODREPLAY', difficulty: 'medium', modifiers: ['tight-credit', 'slow-market'] }), 30);
    const r = replay(toSubmission(s));
    expect(r.modifiers).toEqual(s.modifiers);
    expect(r.ledger.balances).toEqual(s.ledger.balances);
  });
});
