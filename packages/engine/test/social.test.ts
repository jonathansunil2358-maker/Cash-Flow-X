import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS, applyActionInPlace, buySkin, challengeField, checkIntegrity, cosmeticsOf, equipSkin, isoWeek, isTitleId, isValidChallengeCode, isValidWeek,
  migrateProfile, msUntilNextWeek, newGame, newProfile, prestigeCheck, SKINS, tickInPlace, TITLE_IDS, titleText, twistOf, weeklyChallenge, WEEKLY_TWISTS,
  type Profile,
} from '../src/index';

describe('ISO weeks', () => {
  it('follow ISO 8601, including the year boundary', () => {
    expect(isoWeek(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01');
    expect(isoWeek(new Date('2026-12-31T12:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(new Date('2027-01-03T12:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(new Date('2027-01-04T00:00:00Z'))).toBe('2027-W01');
    expect(isoWeek(new Date('2026-10-04T23:59:59Z'))).toBe('2026-W40');
    expect(isoWeek(new Date('2026-10-05T00:00:00Z'))).toBe('2026-W41');
  });
  it('validates keys', () => {
    for (const ok of ['2026-W40', '2026-W53', '2027-W01']) expect(isValidWeek(ok), ok).toBe(true);
    for (const bad of ['2026-W00', '2026-W54', '2027-W53', '26-W01', 'x', 7, null, '2026-40']) expect(isValidWeek(bad), String(bad)).toBe(false);
  });
  it('counts down to Monday midnight UTC', () => {
    const ms = msUntilNextWeek(new Date('2026-10-04T23:00:00Z'));
    expect(ms).toBe(3_600_000);
    expect(msUntilNextWeek(new Date('2026-10-05T00:00:00Z'))).toBe(7 * 86_400_000);
  });
});

describe('weekly event', () => {
  it('is a pure function of the week, with one of six twists', () => {
    const a = weeklyChallenge('2026-W40');
    expect(weeklyChallenge('2026-W40')).toEqual(a);
    expect(WEEKLY_TWISTS.length).toBe(6);
    const seen = new Set<string>();
    for (let w = 1; w <= 52; w++) seen.add(weeklyChallenge(`2026-W${String(w).padStart(2, '0')}`).twist.id);
    expect(seen.size).toBeGreaterThanOrEqual(4);
    expect(() => weeklyChallenge('nope')).toThrow();
  });
  it('applies the twist to the whole game, with no perks, and stays balanced', () => {
    const w = weeklyChallenge('2026-W40');
    const s = newGame({ companyName: w.companyName, industryId: w.industryId, seed: w.seed, scenarioId: 'weekly', perks: { startingCash: 3 } as never, difficulty: 'hard' });
    expect(s.twist).toBe(w.twist.id);
    expect(s.perks).toEqual({});
    expect(s.difficulty).toBe('medium');
    expect(s.lastMonth).toBe(24);
    expect(s.economy.active.some((a) => a.type === 'weekly-twist')).toBe(true);
    for (let i = 0; i < 30 && s.status === 'playing'; i++) {
      if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
      tickInPlace(s);
    }
    expect(s.status).not.toBe('playing');
    expect(s.economy.active.some((a) => a.type === 'weekly-twist')).toBe(true);
    expect(checkIntegrity(s)).toEqual([]);
    expect(twistOf(w.twist.id)).toBeDefined();
  });
  it('really changes the economy: a boom lifts demand and a supply shock lifts costs', () => {
    const boom = WEEKLY_TWISTS.find((t) => t.id === 'boom')!;
    const shock = WEEKLY_TWISTS.find((t) => t.id === 'supply-shock')!;
    expect(boom.effects.demandMult).toBeGreaterThan(1);
    expect(shock.effects.unitCostMult).toBeGreaterThan(1);
  });
  it('cannot prestige', () => {
    const s = newGame({ companyName: 'W', industryId: 'software', seed: 'WEEKLY-2026-W40', scenarioId: 'weekly' });
    expect(prestigeCheck(s).eligible).toBe(false);
  });
});

describe('friend challenges', () => {
  it('derive the company from the code alone', () => {
    const a = challengeField('ABCDEF');
    expect(challengeField('ABCDEF')).toEqual(a);
    expect(a.seed).toBe('CH-ABCDEF');
    expect(challengeField('ABCDEG').seed).not.toBe(a.seed);
    expect(isValidChallengeCode('ABCDEF')).toBe(true);
    for (const bad of ['abcdef', 'ABCDE', 'ABCDEFG', 'ABCDE0', 'ABCDEI', 'AB CDE', '', null, 4]) expect(isValidChallengeCode(bad), String(bad)).toBe(false);
    expect(() => challengeField('bad')).toThrow();
  });
  it('are a level field: no perks, no prestige', () => {
    const c = challengeField('XYZ234');
    const s = newGame({ companyName: c.companyName, industryId: c.industryId, seed: c.seed, scenarioId: 'challenge', perks: { startingCash: 3 } as never });
    expect(s.perks).toEqual({});
    expect(prestigeCheck(s).eligible).toBe(false);
    expect(s.lastMonth).toBe(24);
  });
});

describe('titles', () => {
  it('come only from achievements, and are validated against a fixed list', () => {
    expect(TITLE_IDS.length).toBeGreaterThanOrEqual(12);
    for (const id of TITLE_IDS) {
      expect(ACHIEVEMENTS.find((a) => a.id === id)?.title).toBeTruthy();
      expect(titleText(id)).toBeTruthy();
      expect(isTitleId(id)).toBe(true);
    }
    for (const bad of ['', 'first_sale', 'admin', '<script>', null, 4, undefined]) expect(isTitleId(bad), String(bad)).toBe(false);
    expect(titleText('nonsense')).toBeNull();
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('cosmetics shop', () => {
  const rich = (): Profile => ({ ...newProfile(), gems: 500 });
  it('every skin has a full palette and the default is free', () => {
    expect(SKINS[0].gems).toBe(0);
    for (const s of SKINS) {
      expect(s.palette.leaf.length).toBe(4);
      for (const v of Object.values(s.palette).flat()) expect(typeof v).toBe('string');
    }
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
  });
  it('buy once, spend the gems, equip anything you own, nothing else', () => {
    let p = rich();
    expect(cosmeticsOf(p)).toEqual({ owned: ['default'], skin: 'default' });
    p = buySkin(p, 'autumn');
    expect(p.gems).toBe(500 - SKINS.find((s) => s.id === 'autumn')!.gems);
    expect(cosmeticsOf(p).skin).toBe('autumn');
    expect(() => buySkin(p, 'autumn')).toThrow();
    expect(() => buySkin(p, 'nope')).toThrow();
    expect(() => equipSkin(p, 'snow')).toThrow();
    p = equipSkin(p, 'default');
    expect(cosmeticsOf(p).skin).toBe('default');
    expect(cosmeticsOf(p).owned).toEqual(['default', 'autumn']);
    expect(() => buySkin({ ...newProfile(), gems: 1 }, 'neon')).toThrow();
  });
  it('old saves load unchanged and bad data is ignored', () => {
    const old = { ...newProfile() } as Partial<Profile>;
    delete old.cosmetics;
    const migrated = migrateProfile(old)!;
    expect(cosmeticsOf(migrated)).toEqual({ owned: ['default'], skin: 'default' });
    expect(cosmeticsOf({ cosmetics: { owned: ['snow', 'bogus'], skin: 'bogus' } })).toEqual({ owned: ['default', 'snow'], skin: 'default' });
    expect(cosmeticsOf({ cosmetics: { owned: [], skin: 'neon' } }).skin).toBe('default');
  });
});
