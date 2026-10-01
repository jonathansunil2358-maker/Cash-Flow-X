import { describe, expect, it } from 'vitest';
import {
  advanceProjects, applyActionInPlace, checkIntegrity, mergePeriods, modifiersOf, monthlyProjectCost, newGame, plSummary, projectDef,
  projectSlots, projectSuccessChance, PROJECTS, tickInPlace, type GameState, type Rng,
} from '../src/index';

const win: Rng = { next: () => 0.01 };
const lose: Rng = { next: () => 0.99 };
const noPost = () => undefined;

function step(s: GameState) {
  if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
  tickInPlace(s);
}

function lab(rnd = 3, seed = 'RND') {
  const s = newGame({ companyName: 'R', industryId: 'software', seed, difficulty: 'easy' });
  applyActionInPlace(s, { type: 'hire', role: 'rnd', count: rnd });
  return s;
}

/** Finish a project instantly with a chosen roll, without waiting for the months to pass. */
function finish(s: GameState, rng: Rng) {
  for (const p of s.projects) p.monthsLeft = 1;
  advanceProjects(s, rng, noPost, true);
}

describe('R&D projects', () => {
  it('need three R&D staff per project running at once', () => {
    const none = lab(2);
    expect(projectSlots(none)).toBe(0);
    expect(() => applyActionInPlace(none, { type: 'startProject', projectId: 'qualityLeap' })).toThrow(/at least 3 R&D staff/);

    const one = lab(3);
    applyActionInPlace(one, { type: 'startProject', projectId: 'qualityLeap' });
    expect(() => applyActionInPlace(one, { type: 'startProject', projectId: 'costCutting' })).toThrow(/fully booked/);
    applyActionInPlace(one, { type: 'hire', role: 'rnd', count: 3 });
    expect(() => applyActionInPlace(one, { type: 'startProject', projectId: 'costCutting' })).not.toThrow();
    expect(() => applyActionInPlace(one, { type: 'startProject', projectId: 'qualityLeap' })).toThrow(/already under way/);
    expect(() => applyActionInPlace(one, { type: 'startProject', projectId: 'nope' })).toThrow(/Unknown/);
  });

  it('cost a little every month, shown as R&D in the P&L, with balanced books', () => {
    const s = lab();
    const def = projectDef('qualityLeap')!;
    applyActionInPlace(s, { type: 'startProject', projectId: 'qualityLeap' });
    for (let i = 0; i < def.months; i++) step(s);
    const research = plSummary(mergePeriods(s.history.map((h) => h.period)).pl).research;
    expect(research).toBe(monthlyProjectCost(def) * def.months);
    expect(checkIntegrity(s)).toEqual([]);
    expect(s.projects).toHaveLength(0);
  });

  it('on success pay off permanently through the modifiers (and the cache notices)', () => {
    const s = lab(6);
    const before = modifiersOf(s);
    applyActionInPlace(s, { type: 'startProject', projectId: 'costCutting' });
    applyActionInPlace(s, { type: 'startProject', projectId: 'productLine' });
    finish(s, win);
    expect(s.projectsDone).toEqual(expect.arrayContaining(['costCutting', 'productLine']));
    const after = modifiersOf(s);
    expect(after.unitCostMult).toBeCloseTo(before.unitCostMult * 0.95);
    expect(after.marketMult).toBeCloseTo(before.marketMult * 1.1);
    expect(() => applyActionInPlace(s, { type: 'startProject', projectId: 'costCutting' })).toThrow(/already complete/);
  });

  it('give a quality leap its +8 quality at once', () => {
    const s = lab();
    const q = s.quality;
    applyActionInPlace(s, { type: 'startProject', projectId: 'qualityLeap' });
    finish(s, win);
    expect(s.quality).toBe(Math.min(100, q + 8));
  });

  it('can fail: the money is gone, morale drops, and the project can be retried', () => {
    const s = lab();
    applyActionInPlace(s, { type: 'startProject', projectId: 'costCutting' });
    const morale = s.morale;
    finish(s, lose);
    expect(s.projectsDone).toEqual([]);
    expect(s.morale).toBe(morale - 5);
    expect(() => applyActionInPlace(s, { type: 'startProject', projectId: 'costCutting' })).not.toThrow();
  });

  it('can be cancelled without a refund, freeing the team', () => {
    const s = lab();
    applyActionInPlace(s, { type: 'startProject', projectId: 'qualityLeap' });
    const cash = s.ledger.balances.cash;
    applyActionInPlace(s, { type: 'cancelProject', projectId: 'qualityLeap' });
    expect(s.ledger.balances.cash).toBe(cash);
    expect(s.projects).toHaveLength(0);
    expect(() => applyActionInPlace(s, { type: 'cancelProject', projectId: 'qualityLeap' })).toThrow(/not running/);
  });

  it('stall, free of charge, while the team is too small for them', () => {
    const s = lab(3);
    applyActionInPlace(s, { type: 'startProject', projectId: 'qualityLeap' });
    applyActionInPlace(s, { type: 'fire', role: 'rnd', count: 1 });
    const left = s.projects[0].monthsLeft;
    const cash = s.ledger.balances.cash;
    advanceProjects(s, win, (memo, lines) => { throw new Error(`unexpected posting: ${memo} ${lines.length}`); }, true);
    expect(s.projects[0].monthsLeft).toBe(left);
    expect(s.ledger.balances.cash).toBe(cash);
  });

  it('succeed more often with a happy team and a strong product, never above 92%', () => {
    const s = lab();
    s.morale = 60; s.quality = 40;
    const base = projectSuccessChance(s);
    expect(base).toBe(0.75);
    s.morale = 90; s.quality = 70;
    expect(projectSuccessChance(s)).toBeGreaterThan(base);
    s.morale = 100; s.quality = 100;
    expect(projectSuccessChance(s)).toBe(0.92);
  });

  it('have sensible definitions', () => {
    for (const p of PROJECTS) {
      expect(p.months).toBeGreaterThan(0);
      expect(monthlyProjectCost(p)).toBeGreaterThan(0);
      expect(p.market || p.unitCost || p.quality).toBeTruthy();
    }
  });
});
