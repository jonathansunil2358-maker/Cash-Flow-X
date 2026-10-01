import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, CHOICE_EVENTS, grossPayroll, leaveChance, moraleProductivity, moraleTarget, newGame, rollLeavers,
  tickInPlace, trainingEffect, type GameState, type IndustryId, type PayLevel,
} from '../src/index';

function step(s: GameState) {
  if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
  tickInPlace(s);
}

function team(industryId: IndustryId = 'fitness', seed = 'MORALE') {
  const s = newGame({ companyName: 'M', industryId, seed, difficulty: 'easy' });
  applyActionInPlace(s, { type: 'hire', role: 'ops', count: 3 });
  applyActionInPlace(s, { type: 'hire', role: 'sales', count: 1 });
  return s;
}

describe('morale', () => {
  it('is neutral by default: market pay and no training leave morale and productivity unchanged', () => {
    const s = team();
    expect(s.morale).toBe(60);
    expect(moraleProductivity(60)).toBeCloseTo(1, 10);
    for (let i = 0; i < 4; i++) step(s); // while the company still has cash
    expect(s.morale).toBe(60);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('pay level scales the wage bill and moves where morale settles', () => {
    const s = team();
    const market = grossPayroll(s);
    s.pay = 'above';
    expect(grossPayroll(s)).toBeCloseTo(market * 1.12, -1);
    expect(moraleTarget(s)).toBe(75);
    s.pay = 'below';
    expect(grossPayroll(s)).toBeCloseTo(market * 0.9, -1);
    expect(moraleTarget(s)).toBe(45);
  });

  it('composes with wage inflation instead of replacing it', () => {
    const s = team();
    const base = grossPayroll(s);
    s.salaryIndex *= 1.06;
    s.pay = 'above';
    expect(grossPayroll(s)).toBeCloseTo(base * 1.06 * 1.12, -1);
  });

  it('moves a fifth of the way to its target each month and stays within 0-100', () => {
    const s = team();
    s.ledger.balances.cash += 5_000_000_00; // keep money worries out of this test
    applyActionInPlace(s, { type: 'setPay', level: 'above' });
    step(s);
    expect(s.morale).toBeCloseTo(60 + 15 * 0.2, 1);
    for (let i = 0; i < 3; i++) step(s);
    expect(s.morale).toBeCloseTo(60 + 15 * (1 - Math.pow(0.8, 4)), 0);
    expect(s.morale).toBeLessThanOrEqual(100);
  });

  it('is dented by money worries: an overdrawn company has a lower target', () => {
    const s = team();
    expect(moraleTarget(s)).toBe(60);
    s.ledger.balances.cash = -1;
    expect(moraleTarget(s)).toBe(52);
  });

  it('is lifted by training up to a cap, and training costs money', () => {
    const s = team();
    const payroll = grossPayroll(s);
    applyActionInPlace(s, { type: 'setTraining', amount: Math.round(payroll * 0.05 / 100) * 100 });
    const half = trainingEffect(s);
    expect(half).toBeGreaterThan(5);
    expect(half).toBeLessThan(7);
    applyActionInPlace(s, { type: 'setTraining', amount: payroll * 5 });
    expect(trainingEffect(s)).toBe(12);
    const cash = s.ledger.balances.cash;
    applyActionInPlace(s, { type: 'setTraining', amount: 100_000 });
    step(s);
    expect(s.ledger.balances.cash).toBeLessThan(cash);
    expect(() => applyActionInPlace(s, { type: 'setTraining', amount: -1 })).toThrow();
    expect(() => applyActionInPlace(s, { type: 'setTraining', amount: 1e12 })).toThrow();
  });

  it('causes no turnover at or above 60, and rising turnover below it', () => {
    const s = team();
    s.staff.ops = 100;
    s.morale = 60;
    expect(rollLeavers(s, { next: () => 0.01 })).toEqual([]);
    expect(leaveChance(60)).toBe(0);
    expect(leaveChance(30)).toBeGreaterThan(leaveChance(50));
    s.morale = 30;
    const leavers = rollLeavers(s, { next: () => 0.99 });
    expect(leavers.find((l) => l.role === 'ops')!.count).toBe(Math.floor(100 * leaveChance(30)));
  });

  it('makes people actually leave (and cost money) when morale is low, with the books still balanced', () => {
    const s = team('fitness', 'MORALE-LEAVE');
    s.staff.ops = 60;
    s.pay = 'below';
    s.morale = 25;
    const before = s.staff.ops;
    for (let i = 0; i < 3; i++) step(s);
    expect(s.staff.ops).toBeLessThan(before);
    expect(s.log.some((l) => /Staff have left/.test(l.title))).toBe(true);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('makes the poaching event likelier when morale is low and rarer when pay is above market', () => {
    const poached = CHOICE_EVENTS.find((e) => e.id === 'poached')!;
    const s = team();
    s.morale = 60;
    const normal = poached.weightOf!(s);
    s.morale = 30;
    expect(poached.weightOf!(s)).toBeGreaterThan(normal);
    s.pay = 'above';
    expect(poached.weightOf!(s)).toBeLessThan(poached.weightOf!({ ...s, pay: 'market' } as GameState));
  });

  it('rejects an unknown pay level', () => {
    const s = team();
    expect(() => applyActionInPlace(s, { type: 'setPay', level: 'lavish' as PayLevel })).toThrow(/pay/);
  });
});
