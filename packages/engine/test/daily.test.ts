import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, DAILY_MONTHS, dailyChallenge, finalScore, CORE_INDUSTRY_IDS as INDUSTRY_IDS, isValidDay, modifiersOf, msUntilNextDaily, newGame, ownerStakeOf,
  prestigeCheck, replay, tickInPlace, toSubmission, utcDay,
} from '../src/index';

describe('daily challenge', () => {
  it('is the same for everyone on a given day, and differs across days', () => {
    expect(dailyChallenge('2027-03-14')).toEqual(dailyChallenge('2027-03-14'));
    const sectors = new Set(Array.from({ length: 60 }, (_, i) => dailyChallenge(utcDay(new Date(Date.UTC(2027, 0, 1 + i)))).industryId));
    expect(sectors.size).toBe(INDUSTRY_IDS.length);
    expect(dailyChallenge('2027-03-14').seed).not.toBe(dailyChallenge('2027-03-15').seed);
  });

  it('validates days strictly', () => {
    expect(isValidDay('2027-02-28')).toBe(true);
    expect(isValidDay('2027-02-30')).toBe(false);
    expect(isValidDay('27-1-1')).toBe(false);
    expect(isValidDay(20270101)).toBe(false);
    expect(() => dailyChallenge('nope')).toThrow();
  });

  it('counts down to UTC midnight', () => {
    expect(msUntilNextDaily(new Date('2027-03-14T23:59:59.000Z'))).toBe(1000);
    expect(msUntilNextDaily(new Date('2027-03-14T00:00:00.000Z'))).toBe(24 * 3600 * 1000);
  });

  it('runs for 24 months with no perks, boosts or prestige bonus, whatever the player owns', () => {
    const c = dailyChallenge('2027-05-05');
    const s = newGame({
      companyName: c.companyName, industryId: c.industryId, seed: c.seed, scenarioId: c.scenarioId,
      perks: { ops_capacity: 3 }, boosts: [{ id: 'rush', monthsRemaining: 12 }], prestigeLevel: 9, difficulty: 'hard',
    });
    expect(s.difficulty).toBe('medium');
    expect(s.lastMonth).toBe(DAILY_MONTHS);
    expect(s.perks).toEqual({});
    expect(s.boosts).toEqual([]);
    expect(s.prestigeLevel).toBe(0);
    expect(modifiersOf(s).demandMult).toBe(1);
  });

  it('cannot be prestiged', () => {
    const c = dailyChallenge('2027-05-05');
    const s = newGame({ companyName: 'D', industryId: c.industryId, seed: c.seed, scenarioId: 'daily' });
    expect(prestigeCheck(s).eligible).toBe(false);
    expect(prestigeCheck(s).reason).toMatch(/Challenge companies/);
  });

  it('plays to the end, finishes at month 24 and replays to the same score', () => {
    const c = dailyChallenge('2027-05-05');
    const s = newGame({ companyName: c.companyName, industryId: c.industryId, seed: c.seed, scenarioId: c.scenarioId });
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 1 });
    applyActionInPlace(s, { type: 'setMarketing', amount: 100_000 });
    while (s.status === 'playing') {
      if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
      tickInPlace(s);
    }
    expect(['finished', 'insolvent']).toContain(s.status);
    if (s.status === 'finished') expect(s.month).toBe(DAILY_MONTHS);
    const replayed = replay(toSubmission(s));
    expect(ownerStakeOf(replayed)).toBe(ownerStakeOf(s));
    expect(finalScore(replayed).score).toBe(finalScore(s).score);
  });
});
