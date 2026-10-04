import { describe, expect, it } from 'vitest';
import { applyActionInPlace, bulletinOf, buyHat, checkIntegrity, claimFestival, festivalOn, modifiersOf, newGame, newProfile, tickInPlace, type GameState } from '../src/index';
import { applyPolicy } from '../scripts/policy';

const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); applyPolicy(s); if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); tickInPlace(s); } return s; };

describe('feel, v4', () => {
  it('free play lets you scale start-up cash and demand, and the books balance', () => {
    const base = newGame({ companyName: 'F', industryId: 'software', seed: 'FREE', difficulty: 'medium', scenarioId: 'freeplay' });
    const rich = newGame({ companyName: 'F', industryId: 'software', seed: 'FREE', difficulty: 'medium', scenarioId: 'freeplay', sandbox: { cash: 4, demand: 1.5 } });
    expect(rich.ledger.balances.cash).toBeGreaterThan(base.ledger.balances.cash * 2);
    expect(modifiersOf(rich).demandMult).toBeGreaterThan(modifiersOf(base).demandMult * 1.4);
    expect(rich.sandbox).toEqual({ cash: 4, demand: 1.5 });
    play(rich, 12);
    expect(checkIntegrity(rich)).toEqual([]);
  });
  it('sandbox values are clamped, and ignored outside free play', () => {
    const wild = newGame({ companyName: 'F', industryId: 'software', seed: 'FREE2', difficulty: 'medium', scenarioId: 'freeplay', sandbox: { cash: 999, demand: -5 } });
    expect(wild.sandbox).toEqual({ cash: 5, demand: 0.5 });
    const std = newGame({ companyName: 'F', industryId: 'software', seed: 'FREE2', difficulty: 'medium', sandbox: { cash: 4, demand: 2 } });
    expect(std.sandbox).toBeUndefined();
  });

  it('festivals run on fixed dates, give a treat once a year, and their hats are only sold in season', () => {
    expect(festivalOn(new Date('2026-10-31T12:00:00Z'))?.id).toBe('halloween');
    expect(festivalOn(new Date('2026-12-25T12:00:00Z'))?.id).toBe('winter');
    expect(festivalOn(new Date('2027-01-02T12:00:00Z'))?.id).toBe('winter');
    expect(festivalOn(new Date('2026-06-01T12:00:00Z'))).toBeNull();
    const p = { ...newProfile(), gems: 500 };
    const day = new Date('2026-10-31T12:00:00Z');
    const got = claimFestival(p, day);
    expect(got.gems).toBeGreaterThan(p.gems);
    expect(() => claimFestival(got, day)).toThrow();
    expect(() => claimFestival(p, new Date('2026-06-01T12:00:00Z'))).toThrow();
    expect(buyHat(p, 'pumpkin', day).wardrobe?.owned).toContain('pumpkin');
    expect(() => buyHat(p, 'pumpkin', new Date('2026-06-01T12:00:00Z'))).toThrow();
    expect(() => buyHat(p, 'santa', day)).toThrow();
  });

  it('the radio bulletin is built from real numbers and always has an ad for your brand', () => {
    const s = play(newGame({ companyName: 'Radio Co', industryId: 'restaurant', seed: 'RADIO', difficulty: 'easy' }), 6);
    const b = bulletinOf(s);
    expect(b.lines.length).toBeGreaterThan(1);
    expect(b.ad).toContain('Radio Co');
    expect(b.headline.length).toBeGreaterThan(5);
  });
});
