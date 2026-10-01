import { describe, expect, it } from 'vitest';
import { INDUSTRIES, neutralRng, newGame, RIVAL_PRICE_FLOOR, updateCompetitors, type GameState, type Rng } from '../src/index';
import { playPolicy } from './helpers';

/** An RNG that always rolls low: every chance() succeeds and ranges sit at their minimum. */
const lowRng: Rng = { next: () => 0.01 };

function withShareHistory(s: GameState, shares: number[]) {
  for (const marketShare of shares) s.history.push({ kpis: { marketShare } } as never);
}

describe('reactive rivals', () => {
  it('cut prices when the player gains share quickly, bounded by a floor, then recover', () => {
    const s = newGame({ companyName: 'R', industryId: 'ecommerce', seed: 'RIVAL-1', difficulty: 'medium' });
    const ind = INDUSTRIES.ecommerce;
    withShareHistory(s, [0.1, 0.12, 0.2]);
    const before = s.competitors.map((c) => c.price);
    updateCompetitors(s, ind, lowRng, 0.2);
    const cutters = s.competitors.filter((c) => c.cutMonths > 0);
    expect(cutters).toHaveLength(1);
    const c = cutters[0];
    expect(c.price).toBeLessThan(before[s.competitors.indexOf(c)]);
    expect(c.price).toBeGreaterThanOrEqual(Math.round(c.normalPrice * RIVAL_PRICE_FLOOR) - 1);
    expect(c.cutMonths).toBeGreaterThanOrEqual(3);
    expect(c.cutMonths).toBeLessThanOrEqual(6);
    expect(s.log.some((l) => /cuts prices/.test(l.title))).toBe(true);

    // Held for the cut, then it drifts back towards the normal price.
    const cutPrice = c.price;
    for (let i = 0; i < 12; i++) updateCompetitors(s, ind, neutralRng, 0.2);
    expect(c.cutMonths).toBe(0);
    expect(c.price).toBeGreaterThan(cutPrice);
    expect(Math.abs(c.price - c.normalPrice)).toBeLessThan(ind.basePrice * 0.1);
  });

  it('stay put when the player is not a threat', () => {
    const s = newGame({ companyName: 'R', industryId: 'ecommerce', seed: 'RIVAL-2', difficulty: 'medium' });
    withShareHistory(s, [0.1, 0.1, 0.1]);
    updateCompetitors(s, INDUSTRIES.ecommerce, { next: () => 0.99 }, 0.1);
    expect(s.competitors.every((c) => c.cutMonths === 0)).toBe(true);
  });

  it('launch a better product at most once a year each', () => {
    const s = newGame({ companyName: 'R', industryId: 'software', seed: 'RIVAL-3', difficulty: 'hard' });
    const q = s.competitors.map((c) => c.quality);
    updateCompetitors(s, INDUSTRIES.software, lowRng, 0);
    const after = s.competitors.map((c) => c.quality);
    expect(after.every((v, i) => v > q[i])).toBe(true);
    expect(s.log.filter((l) => /launches a new product/.test(l.title)).length).toBe(s.competitors.length);
    const logged = s.log.length;
    updateCompetitors(s, INDUSTRIES.software, lowRng, 0);
    expect(s.log.filter((l) => /launches a new product/.test(l.title)).length).toBe(s.competitors.length);
    expect(s.log.length).toBeGreaterThanOrEqual(logged);
  });

  it('are deterministic: the same seed gives the same rival behaviour', () => {
    const a = playPolicy('ecommerce', 'RIVAL-DET', 36);
    const b = playPolicy('ecommerce', 'RIVAL-DET', 36);
    expect(a.competitors).toEqual(b.competitors);
  });

  it('react less on easy than on hard', () => {
    const run = (difficulty: 'easy' | 'hard') => {
      const s = newGame({ companyName: 'R', industryId: 'fitness', seed: 'RIVAL-4', difficulty });
      withShareHistory(s, [0.1, 0.1, 0.3]);
      // A roll of 0.4 clears the trigger on hard (0.5 x 1.4 = 0.7) but not on easy (0.5 x 0.6 = 0.3).
      updateCompetitors(s, INDUSTRIES.fitness, { next: () => 0.4 }, 0.3);
      return s.competitors.some((c) => c.cutMonths > 0);
    };
    expect(run('hard')).toBe(true);
    expect(run('easy')).toBe(false);
  });
});
