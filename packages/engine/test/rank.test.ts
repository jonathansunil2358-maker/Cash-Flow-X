import { describe, expect, it } from 'vitest';
import { applyActionInPlace, modifiersOf, newGame, prestigeBonus, prestigeTitle, PRESTIGE_BONUS_CAP, PRESTIGE_BONUS_MAX_RANK, replay, tickInPlace, toSubmission } from '../src/index';

describe('prestige rank bonus', () => {
  it('grows two percent per rank, up to a cap', () => {
    expect(prestigeBonus(0)).toBe(0);
    expect(prestigeBonus(3)).toBeCloseTo(0.06);
    expect(prestigeBonus(PRESTIGE_BONUS_MAX_RANK)).toBeCloseTo(PRESTIGE_BONUS_CAP);
    expect(prestigeBonus(500)).toBe(PRESTIGE_BONUS_CAP);
    expect(prestigeBonus(-4)).toBe(0);
  });

  it('has a title for every rank, with the last one repeating', () => {
    expect(prestigeTitle(0)).toBe('Founder');
    expect(prestigeTitle(1)).toBe('Operator');
    expect(prestigeTitle(99)).toBe('Legend');
  });

  it('lifts demand on Easy and Medium from the very first month of a new company', () => {
    const base = newGame({ companyName: 'A', industryId: 'software', seed: 'RANK', difficulty: 'medium', prestigeLevel: 0 });
    const ranked = newGame({ companyName: 'A', industryId: 'software', seed: 'RANK', difficulty: 'medium', prestigeLevel: 5 });
    expect(modifiersOf(ranked).demandMult).toBeCloseTo(modifiersOf(base).demandMult * 1.1);
  });

  it('is not available on Hard (no prestige, no perks)', () => {
    const hard = newGame({ companyName: 'H', industryId: 'software', seed: 'RANK', difficulty: 'hard', prestigeLevel: 5 });
    expect(modifiersOf(hard).demandMult).toBe(1);
  });

  it('is part of the replayed game, so a verified run reproduces it exactly', () => {
    const s = newGame({ companyName: 'A', industryId: 'ecommerce', seed: 'RANK-R', difficulty: 'easy', prestigeLevel: 4 });
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 1 });
    for (let i = 0; i < 8; i++) { if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); tickInPlace(s); }
    const replayed = replay(toSubmission(s));
    expect(replayed.ledger.balances).toEqual(s.ledger.balances);
    const noRank = replay({ ...toSubmission(s), prestigeLevel: 0 });
    expect(noRank.ledger.balances.cash).not.toBe(s.ledger.balances.cash);
  });
});
