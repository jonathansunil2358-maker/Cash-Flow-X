import { describe, expect, it } from 'vitest';
import {
  adoptPet, applyActionInPlace, PETS, buildingNames, buyHat, canNameEom, cleanName, diaryOf, diaryShareText, eomOf, headlineOf, HATS, MAX_NAMES, nameEom, newGame, newProfile, petMood, petOf,
  rosterOf, setBuildingName, stateChecksum, tickInPlace, upgradeIdsFor, wardrobeOf, wearHat, writeDiary, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = () => newGame({ companyName: 'Per Ltd', industryId: 'ecommerce', seed: 'PERS', difficulty: 'easy' });

describe('personality never touches the company', () => {
  it('reading headlines, moods and rosters leaves the simulation byte-for-byte alone', () => {
    const s = play(fresh(), 14);
    const sum = stateChecksum(s);
    headlineOf(s); petMood(s); rosterOf(s);
    expect(stateChecksum(s)).toBe(sum);
  });
});

describe('pet', () => {
  it('costs gems, you get one, names are cleaned', () => {
    let p = { ...newProfile(), gems: 1000 };
    expect(() => adoptPet({ ...p, gems: 1 }, 'dog', 'Rex', '2026-10-01')).toThrow(/gems/);
    expect(() => adoptPet(p, 'dragon', 'Rex', '2026-10-01')).toThrow(/Unknown/);
    p = adoptPet(p, 'dog', '  <b>Rex</b> the very long named dog ', '2026-10-01');
    expect(p.gems).toBe(1000 - PETS.find((k) => k.id === 'dog')!.gems);
    expect(petOf(p)!.name.length).toBeLessThanOrEqual(16);
    expect(petOf(p)!.name).not.toMatch(/[<>]/);
    expect(() => adoptPet(p, 'cat', 'Tom', '2026-10-02')).toThrow(/already/);
    expect(cleanName('a\u0000b')).toBe('ab');
  });
  it('has a mood for every company state', () => {
    const s = play(fresh(), 10);
    expect(petMood(s).text.length).toBeGreaterThan(5);
    s.ledger.balances.cash = -1;
    expect(petMood(s).face).toBe('😟');
  });
});

describe('employee of the month', () => {
  it('names one person a month from your real team', () => {
    const s = play(fresh(), 6);
    const who = rosterOf(s)[0];
    let p = newProfile();
    expect(() => nameEom(p, s, 'nobody')).toThrow();
    p = nameEom(p, s, who.id);
    expect(eomOf(p)[0].name).toBe(who.name);
    expect(canNameEom(p, s.month)).toBe(false);
    expect(() => nameEom(p, s, who.id)).toThrow(/already/);
  });
});

describe('building names, diary and hats', () => {
  it('names are cleaned, capped and removable', () => {
    let p = newProfile();
    const ids = upgradeIdsFor('ecommerce');
    p = setBuildingName(p, ids[0], '  The <Big> Shed ');
    expect(buildingNames(p)[ids[0]]).toBe('The Big Shed');
    p = setBuildingName(p, ids[0], '');
    expect(buildingNames(p)[ids[0]]).toBeUndefined();
    const many: Record<string, string> = {};
    for (let i = 0; i < MAX_NAMES + 5; i++) many[`b${i}`] = 'x';
    expect(Object.keys(buildingNames({ names: many }))).toHaveLength(MAX_NAMES);
    expect(buildingNames({ names: { 'bad key!': 'x' } })).toEqual({});
  });

  it('the diary keeps one entry a year per company, is capped, and shares as text', () => {
    let p = newProfile();
    expect(() => writeDiary(p, { year: 2027, company: 'A', note: '   ', facts: '' })).toThrow();
    p = writeDiary(p, { year: 2027, company: 'A', note: 'First year!', facts: 'Revenue £1m' });
    p = writeDiary(p, { year: 2027, company: 'A', note: 'Better note', facts: 'Revenue £1m' });
    expect(diaryOf(p)).toHaveLength(1);
    expect(diaryOf(p)[0].note).toBe('Better note');
    expect(diaryShareText(diaryOf(p)[0])).toContain('Better note');
    for (let y = 0; y < 50; y++) p = writeDiary(p, { year: 2030 + y, company: 'A', note: 'x', facts: '' });
    expect(diaryOf(p).length).toBeLessThanOrEqual(30);
  });

  it('hats cost gems, you wear one at a time and cannot wear what you do not own', () => {
    let p = { ...newProfile(), gems: 1000 };
    expect(() => buyHat({ ...p, gems: 1 }, 'crown')).toThrow(/gems/);
    expect(() => wearHat(p, 'crown')).toThrow(/own/);
    p = buyHat(p, 'cap');
    p = buyHat(p, 'party');
    expect(wardrobeOf(p).equipped).toBe('party');
    p = wearHat(p, 'cap');
    expect(wardrobeOf(p).equipped).toBe('cap');
    p = wearHat(p, null);
    expect(wardrobeOf(p).equipped).toBeNull();
    expect(() => buyHat(p, 'cap')).toThrow(/already/);
    expect(HATS.length).toBe(4);
    expect(wardrobeOf({ wardrobe: { owned: ['junk', 'cap'], equipped: 'junk' } })).toEqual({ owned: ['cap'], equipped: null });
  });
});

describe('newspaper', () => {
  it('always has a headline, and good and bad news read differently', () => {
    const s = fresh();
    expect(headlineOf(s).headline).toContain('opens its doors');
    play(s, 12);
    const f = headlineOf(s);
    expect(f.paper).toMatch(/Gazette/);
    expect(f.headline.length).toBeGreaterThan(5);
    s.ledger.balances.cash = -1000;
    expect(headlineOf(s).mood).toBe('bad');
  });
});
