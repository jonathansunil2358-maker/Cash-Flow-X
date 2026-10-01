import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, lifetimeStats, newProfile, type RunSummary } from '../src/index';

const run = (industryId: RunSummary['industryId'], outcome: RunSummary['outcome'], ownerStake: number, months = 24): RunSummary =>
  ({ companyName: `${industryId} ${outcome}`, industryId, difficulty: 'medium', months, outcome, ownerStake, legacy: 0 });

describe('lifetime stats', () => {
  it('are empty and finite for a brand-new profile', () => {
    const s = lifetimeStats(newProfile());
    expect(s.companies).toBe(0);
    expect(s.survivalRate).toBe(0);
    expect(s.bestRun).toBeNull();
    expect(s.favouriteIndustry).toBeNull();
    expect(s.achievementsEarned).toBe(0);
    expect(s.achievementsTotal).toBe(ACHIEVEMENTS.length);
    expect(s.founderLevel).toBeGreaterThanOrEqual(1);
  });

  it('use the lifetime totals, not just the 20 runs on record', () => {
    const p = newProfile();
    p.runs = [run('software', 'prestiged', 10_000_000_00), run('software', 'bankrupt', 0), run('fitness', 'retired', 2_000_000_00)];
    p.lifetime = { companies: 40, bankruptcies: 10, retired: 5, months: 600, bestStake: 50_000_000_00 };
    p.prestigeCount = 8;
    const s = lifetimeStats(p);
    expect(s.companies).toBe(40);
    expect(s.bankruptcies).toBe(10);
    expect(s.survivalRate).toBeCloseTo(0.75);
    expect(s.yearsPlayed).toBe(50);
    expect(s.prestiges).toBe(8);
    expect(s.bestStake).toBe(50_000_000_00);
  });

  it('pick the best company, the best per industry and the favourite sector', () => {
    const p = newProfile();
    p.runs = [run('software', 'prestiged', 5_000_00), run('software', 'prestiged', 9_000_00), run('fitness', 'retired', 7_000_00)];
    p.lifetime = { companies: 3, bankruptcies: 0, retired: 1, months: 72, bestStake: 9_000_00 };
    const s = lifetimeStats(p);
    expect(s.bestRun?.ownerStake).toBe(9_000_00);
    expect(s.bestByIndustry.software?.ownerStake).toBe(9_000_00);
    expect(s.bestByIndustry.fitness?.ownerStake).toBe(7_000_00);
    expect(s.bestByIndustry.clothing).toBeUndefined();
    expect(s.favouriteIndustry).toBe('software');
  });

  it('count achievements and missions', () => {
    const p = newProfile();
    p.achievements = { first_upgrade: '2027-01-01', max_upgrade: '2027-02-01' };
    p.missionsCompleted = 7;
    const s = lifetimeStats(p);
    expect(s.achievementsEarned).toBe(2);
    expect(s.missionsCompleted).toBe(7);
  });
});
