import { describe, expect, it } from 'vitest';
import { applyActionInPlace, checkIntegrity, headcount, INDUSTRIES, monthlyRent, newGame, nextStrain, premisesMove, premisesTier, tickInPlace } from '../src/index';

describe('growing pains', () => {
  it('a hire that crosses a staff threshold moves the business to bigger premises, capitalised and balanced', () => {
    const s = newGame({ companyName: 'G', industryId: 'software', seed: 'GROW-1', difficulty: 'easy' });
    s.ledger.balances.cash += 500_000_00;
    s.ledger.balances.shareCapital -= 500_000_00;
    const ind = INDUSTRIES.software;
    const rentBefore = monthlyRent(s);
    const need = 10 - headcount(s);
    expect(premisesMove(s, ind, need)?.toTier).toBe(1);
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: need });
    expect(premisesTier(headcount(s))).toBe(1);
    expect(s.ppeAssets.some((a) => a.label === 'Premises fit-out')).toBe(true);
    expect(monthlyRent(s)).toBeGreaterThan(rentBefore);
    expect(checkIntegrity(s)).toEqual([]);
    tickInPlace(s);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('strain builds while running flat out and eases off when there is slack', () => {
    expect(nextStrain(0, 0.99)).toBeGreaterThan(0);
    expect(nextStrain(0.5, 0.5)).toBeLessThan(0.5);
    expect(nextStrain(1, 1)).toBe(1);
  });
});
