import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, buyDecor, DECOR, decorOf, DEFAULT_LOGO, logoOf, LOGO_COLOURS, migrateProfile, newGame, newProfile, setLogo, tickInPlace, toggleDecor, yearReview,
  type GameState, type Profile,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const play = (s: GameState, months: number) => {
  for (let i = 0; i < months && s.status === 'playing'; i++) {
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    applyPolicy(s);
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    tickInPlace(s);
  }
  return s;
};

describe('island decorations', () => {
  it('has eight island items and three on extra land, with unique spots and ids', () => {
    expect(DECOR).toHaveLength(11);
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(11);
    expect(new Set(DECOR.map((d) => d.at.join(','))).size).toBe(11);
    for (const d of DECOR.filter((x) => !x.land)) { expect(Math.abs(d.at[0])).toBeLessThanOrEqual(8); expect(Math.abs(d.at[1])).toBeLessThanOrEqual(8); }
    expect(DECOR.filter((x) => x.land)).toHaveLength(3);
  });

  it('are bought once with gems, placed at once, and can be switched off and on', () => {
    const price = DECOR.find((x) => x.id === 'fountain')!.gems;
    let p: Profile = { ...newProfile(), gems: price + 10 };
    p = buyDecor(p, 'fountain');
    expect(p.gems).toBe(10);
    expect(decorOf(p)).toEqual({ owned: ['fountain'], placed: ['fountain'] });
    expect(() => buyDecor(p, 'fountain')).toThrow(/already/);
    expect(() => buyDecor(p, 'nope')).toThrow();
    expect(() => buyDecor({ ...newProfile(), gems: 1 }, 'statue')).toThrow(/gems/);
    p = toggleDecor(p, 'fountain');
    expect(decorOf(p).placed).toEqual([]);
    p = toggleDecor(p, 'fountain');
    expect(decorOf(p).placed).toEqual(['fountain']);
    expect(() => toggleDecor(p, 'statue')).toThrow();
  });

  it('old and odd saves load unchanged', () => {
    expect(decorOf(newProfile())).toEqual({ owned: [], placed: [] });
    expect(decorOf({ decor: { owned: ['bogus', 'bench'], placed: ['bench', 'statue'] } })).toEqual({ owned: ['bench'], placed: ['bench'] });
    const p = migrateProfile({ ...newProfile() })!;
    expect(decorOf(p).owned).toEqual([]);
  });
});

describe('company logo', () => {
  it('falls back to the default for anything unknown, and only accepts known shapes and colours', () => {
    expect(logoOf(newProfile())).toEqual(DEFAULT_LOGO);
    expect(logoOf({ logo: { shape: 'blob' as never, bg: '#123456', fg: LOGO_COLOURS[1] } })).toEqual({ ...DEFAULT_LOGO, fg: LOGO_COLOURS[1] });
    const p = setLogo(newProfile(), { shape: 'hex', bg: LOGO_COLOURS[3] });
    expect(logoOf(p)).toEqual({ shape: 'hex', bg: LOGO_COLOURS[3], fg: DEFAULT_LOGO.fg });
    expect(() => setLogo(newProfile(), { bg: '#abcdef' })).toThrow();
    expect(() => setLogo(newProfile(), { shape: 'star' as never })).toThrow();
  });
});

describe('year in review', () => {
  it('appears only at a year start and summarises the year just finished', () => {
    const s = play(newGame({ companyName: 'Rev', industryId: 'ecommerce', seed: 'REVIEW', difficulty: 'easy' }), 11);
    expect(yearReview(s)).toBeNull();
    play(s, 1);
    expect(s.month).toBe(12);
    const r = yearReview(s)!;
    expect(r.companyName).toBe('Rev');
    expect(r.lines.length).toBeGreaterThanOrEqual(4);
    expect(r.best!.revenue).toBeGreaterThan(0);
    expect(r.growth).toBeNull();
    play(s, 1);
    expect(yearReview(s)).toBeNull();
    play(s, 11);
    const r2 = yearReview(s)!;
    expect(r2.growth).not.toBeNull();
    expect(r2.year).toBe(r.year + 1);
  });
});
