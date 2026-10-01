import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS, applyActionInPlace, applyBankruptcy, applyRetirement, claimDaily, createRng, dailyStatus, levelForXp, migrateProfile, missionStatus, newAchievements,
  newGame, newProfile, offlineMonthsFor, refillMissions, replay, reputationFactor, runEvents, runOffline, toSubmission, xpForLevel,
  type GameState,
} from '../src/index';
import { playPolicy } from './helpers';

describe('offline progress', () => {
  it('converts time away into months at 40 minutes each, capped at 8 hours (+2h per Night shift level)', () => {
    const s = newGame({ companyName: 'O', industryId: 'software', seed: 'OFF', difficulty: 'medium' });
    expect(offlineMonthsFor(s, 39 * 60_000)).toBe(0);
    expect(offlineMonthsFor(s, 2 * 3_600_000)).toBe(3);
    expect(offlineMonthsFor(s, 48 * 3_600_000)).toBe(12);
    const perked = newGame({ companyName: 'O', industryId: 'software', seed: 'OFF', difficulty: 'medium', perks: { fin_loans: 1, fin_cash: 1, fin_offline: 2 } });
    expect(offlineMonthsFor(perked, 48 * 3_600_000)).toBe(18);
  });

  it('runs the real engine with no bad news and no decisions, and replays exactly', () => {
    const s = playPolicy('software', 'OFFLINE', 24);
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    const sum = runOffline(s, 12);
    expect(sum.months).toBeGreaterThan(0);
    expect(s.away).toBe(false);
    expect(s.pendingEvent).toBeNull();
    expect(s.integrityErrors).toEqual([]);
    expect(sum.news.every((n) => !/Recession|rate rise|Supply chain|Wage inflation|Credit crunch|Break-in/i.test(n.title))).toBe(true);
    const r = replay(toSubmission(s));
    expect(r.ledger.balances).toEqual(s.ledger.balances);
  });

  it('while away, events are never bad and never need a decision', () => {
    const s = newGame({ companyName: 'A', industryId: 'software', seed: 'AWAY', difficulty: 'hard' });
    s.month = 24;
    s.away = true;
    const rng = createRng(s);
    for (let i = 0; i < 3000; i++) {
      s.pendingEvent = null;
      s.lastEvent = null;
      s.economy.active = [];
      runEvents(s, rng, true);
      expect((s as GameState).pendingEvent).toBeNull();
      expect((s as GameState).lastEvent?.polarity ?? 'good').toBe('good');
    }
  });
});

describe('reputation', () => {
  it('moves demand between -10% and +10%', () => {
    const s = newGame({ companyName: 'R', industryId: 'software', seed: 'REP' });
    expect(reputationFactor(s)).toBeCloseTo(1);
    s.reputation = 100;
    expect(reputationFactor(s)).toBeCloseTo(1.1);
    s.reputation = 0;
    expect(reputationFactor(s)).toBeCloseTo(0.9);
  });
});

describe('gamification', () => {
  it('XP levels: 0, 100, 300, 600, 1000', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(1000)).toBe(5);
  });

  it('awards achievements from the state, once', () => {
    const s = playPolicy('software', 'ACH', 36);
    const earned = newAchievements(s, {});
    expect(earned.map((a) => a.id)).toContain('first_sale');
    const unlocked = Object.fromEntries(earned.map((a) => [a.id, '2026-01-01']));
    expect(newAchievements(s, unlocked)).toEqual([]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('keeps three missions for the current run, none already complete, and tracks progress', () => {
    const s = playPolicy('software', 'MISSION', 12);
    const missions = refillMissions([], s, createRng({ rng: 7 }));
    expect(missions).toHaveLength(3);
    for (const m of missions) {
      const st = missionStatus(m, s);
      expect(st.done).toBe(false);
      expect(st.progress).toBeGreaterThanOrEqual(0);
      expect(st.progress).toBeLessThanOrEqual(1);
    }
    const other = newGame({ companyName: 'Other', industryId: 'clothing', seed: 'X' });
    expect(refillMissions(missions, other, createRng({ rng: 1 })).every((m) => m.runKey !== missions[0].runKey)).toBe(true);
  });

  it('daily rewards: streak continues day to day, resets after a gap, once per day', () => {
    let d = { lastClaim: null as string | null, streak: 0 };
    let r = claimDaily(d, '2026-10-01');
    expect(r.gems).toBe(10);
    d = r.daily;
    expect(dailyStatus(d, '2026-10-01').canClaim).toBe(false);
    expect(() => claimDaily(d, '2026-10-01')).toThrow();
    r = claimDaily(d, '2026-10-02');
    expect(r.gems).toBe(15);
    d = r.daily;
    r = claimDaily(d, '2026-10-05');
    expect(r.gems).toBe(10);
    expect(r.daily.streak).toBe(1);
  });

  it('migrates a version 1 profile without losing progress', () => {
    const v1 = { version: 1, legacyPoints: 4, legacyEarned: 7, prestigeCount: 2, perks: { fin_loans: 1 }, gems: 99, boosts: [], rebirthsUsed: 1, runs: [] };
    const p = migrateProfile(v1)!;
    expect(p.version).toBe(3);
    expect(p.lifetime).toEqual({ companies: 0, bankruptcies: 0, retired: 0, months: 0, bestStake: 0 });
    expect(p.legacyPoints).toBe(4);
    expect(p.gems).toBe(99);
    expect(p.xp).toBe(0);
    expect(p.daily.streak).toBe(0);
    expect(migrateProfile(newProfile())).toEqual(newProfile());
  });

  it('migrates a version 2 profile, starting lifetime totals from the runs on record', () => {
    const run = (outcome: string, months: number, ownerStake: number) => ({ companyName: 'X', industryId: 'software', difficulty: 'easy', months, outcome, ownerStake, legacy: 0 });
    const v2 = { ...newProfile(), version: 2, lifetime: undefined, runs: [run('prestiged', 60, 9_000_000), run('bankrupt', 12, 0), run('retired', 30, 4_000_000)] };
    const p = migrateProfile(v2)!;
    expect(p.version).toBe(3);
    expect(p.lifetime).toEqual({ companies: 3, bankruptcies: 1, retired: 1, months: 102, bestStake: 9_000_000 });
  });

  it('keeps lifetime totals beyond the 20 runs the history holds', () => {
    let p = newProfile();
    const s = playPolicy('software', 'LIFETIME', 12);
    s.status = 'insolvent';
    for (let i = 0; i < 25; i++) p = applyBankruptcy(p, s, false);
    expect(p.runs).toHaveLength(20);
    expect(p.lifetime.companies).toBe(25);
    expect(p.lifetime.bankruptcies).toBe(25);
    expect(p.lifetime.months).toBe(25 * s.month);
    p = applyRetirement(p, s);
    expect(p.lifetime.retired).toBe(1);
    expect(p.lifetime.bestStake).toBeGreaterThanOrEqual(0);
  });
});
