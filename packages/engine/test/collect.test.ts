import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS, buyDecor, buyLand, buyTrack, claimTrail, DECOR, landOf, LAND, museumOf, newProfile, selectTrack, SOUNDTRACKS, TRAILS, trailProgress, trailsClaimed, tracksOf,
} from '../src/index';

describe('land and the decorations that need it', () => {
  it('land costs gems, is bought once, and land decor needs the land first', () => {
    let p = { ...newProfile(), gems: 500 };
    expect(() => buyLand({ ...p, gems: 1 }, 'west')).toThrow(/gems/);
    expect(() => buyLand(p, 'moon')).toThrow(/Unknown/);
    expect(() => buyDecor(p, 'playground')).toThrow(/land/);
    p = buyLand(p, 'west');
    expect(landOf(p)).toEqual(['west']);
    expect(() => buyLand(p, 'west')).toThrow(/already/);
    p = buyDecor(p, 'playground');
    expect(p.decor!.owned).toContain('playground');
    expect(() => buyDecor(p, 'skatepark')).toThrow(/land/);
    // Every land decoration stands on the land it needs.
    for (const d of DECOR.filter((x) => x.land)) { const l = LAND.find((x) => x.id === d.land)!; expect(d.at).toEqual(l.at); }
  });
});

describe('trails', () => {
  it('only use real achievements and can be claimed once, when finished', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const t of TRAILS) for (const s of t.steps) expect(ids.has(s), `${t.id}:${s}`).toBe(true);
    let p = { ...newProfile(), gems: 0 };
    const t = TRAILS[0];
    expect(trailProgress(p, t)).toMatchObject({ done: 0, complete: false });
    expect(() => claimTrail(p, t.id)).toThrow(/every step/);
    p = { ...p, achievements: Object.fromEntries(t.steps.map((s) => [s, '2026-10-01'])) };
    expect(trailProgress(p, t).complete).toBe(true);
    p = claimTrail(p, t.id);
    expect(p.gems).toBe(t.gems);
    expect(trailsClaimed(p)).toEqual([t.id]);
    expect(() => claimTrail(p, t.id)).toThrow(/Already/);
    expect(() => claimTrail(p, 'nope')).toThrow(/Unknown/);
  });
});

describe('soundtracks', () => {
  it('you always own the gentle one, buy others, and pick only what you own', () => {
    let p = { ...newProfile(), gems: 1000 };
    expect(tracksOf(p)).toEqual({ owned: ['gentle'], selected: 'gentle' });
    expect(() => selectTrack(p, 'jazz')).toThrow(/own/);
    p = buyTrack(p, 'jazz');
    expect(tracksOf(p).selected).toBe('jazz');
    p = selectTrack(p, 'gentle');
    expect(tracksOf(p).selected).toBe('gentle');
    expect(() => buyTrack(p, 'jazz')).toThrow(/already/);
    expect(() => buyTrack({ ...p, gems: 0 }, 'dreamy')).toThrow(/gems/);
    expect(tracksOf({ tracks: { owned: ['junk'], selected: 'junk' } })).toEqual({ owned: ['gentle'], selected: 'gentle' });
    expect(SOUNDTRACKS.length).toBe(4);
  });
});

describe('museum', () => {
  it('turns past companies into cups by how well they did', () => {
    const run = (ownerStake: number, outcome: 'prestiged' | 'bankrupt' | 'retired') => ({ companyName: 'X', industryId: 'software' as const, difficulty: 'medium' as const, months: 30, outcome, ownerStake, legacy: 1 });
    const m = museumOf({ ...newProfile(), runs: [run(20_000_000_00, 'prestiged'), run(2_000_000_00, 'retired'), run(100_000_00, 'retired'), run(0, 'bankrupt')] });
    expect(m.map((e) => e.tier)).toEqual(['gold', 'silver', 'bronze', 'ruin']);
    expect(museumOf(newProfile())).toEqual([]);
  });
});
