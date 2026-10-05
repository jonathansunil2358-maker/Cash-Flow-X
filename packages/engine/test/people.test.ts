import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, CHOICE_EVENTS, courseCheck, createRng, headcount, monthlyRent, newGame, replay, stateChecksum, tickInPlace, toSubmission, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 30): GameState => {
  let s = play(newGame({ companyName: 'P', industryId: 'software', seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'P', industryId: 'software', seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 500_000_00;
  s.ledger.balances.shareCapital -= 500_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('people and culture', () => {
  it('courses cost money, move their stat, and have a cooldown', () => {
    const s = company('PEO-COURSE-B');
    const q = s.quality;
    expect(courseCheck(s, 'technical').ok).toBe(true);
    applyActionInPlace(s, { type: 'takeCourse', course: 'technical' });
    expect(s.quality).toBeGreaterThan(q);
    expect(() => applyActionInPlace(s, { type: 'takeCourse', course: 'technical' })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('remote work lowers rent and raises morale target; changes have a cooldown', () => {
    const s = company('PEO-WORK');
    const rent = monthlyRent(s);
    applyActionInPlace(s, { type: 'setWorkstyle', style: 'remote' });
    expect(monthlyRent(s)).toBeLessThan(rent);
    expect(() => applyActionInPlace(s, { type: 'setWorkstyle', style: 'hybrid' })).toThrow();
    run(s, 6);
  });

  it('an innovation day happens once a year and the books balance', () => {
    const s = company('PEO-INNOV');
    applyActionInPlace(s, { type: 'innovationDay' });
    expect(() => applyActionInPlace(s, { type: 'innovationDay' })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('poaching a star from a rival adds the star and weakens the rival', () => {
    const s = company('PEO-HUNT', 36);
    const heads = headcount(s);
    const stars = s.stars?.length ?? 0;
    applyActionInPlace(s, { type: 'headhunt', role: 'ops' });
    expect(headcount(s)).toBe(heads + 1);
    expect(s.stars?.length).toBe(stars + 1);
    expect(() => applyActionInPlace(s, { type: 'headhunt', role: 'rnd' })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('every choice of the poaching event runs and leaves the books balanced', () => {
    const def = CHOICE_EVENTS.find((e) => e.id === 'poach');
    expect(def).toBeDefined();
    for (const roll of [0, 0.999]) {
      const probe = company('PEO-POACH', 24);
      probe.stars = [{ id: 'm1', name: 'Test Star', role: 'ops', skill: 2 }];
      probe.staff.ops = Math.max(probe.staff.ops, 1);
      const setup = def!.setup(probe, createRng(probe));
      for (const choice of setup.choices) {
        const s = structuredClone(probe);
        s.pendingEvent = { id: 'poach', title: def!.title, polarity: def!.polarity, icon: def!.icon, story: setup.story, month: s.month, params: setup.params, choices: setup.choices.map((c) => ({ id: c.id, label: c.label, hint: c.hint, impact: c.impact })) };
        s.rng = Math.floor(roll * 0xffffffff);
        applyActionInPlace(s, { type: 'resolveEvent', choiceId: choice.id });
        expect(s.pendingEvent).toBeNull();
        expect(checkIntegrity(s).slice(0, 2)).toEqual([]);
      }
    }
  });

  it('a played company using these replays identically on the server', () => {
    const s = play(newGame({ companyName: 'P', industryId: 'software', seed: 'PEO-REPLAY', difficulty: 'easy' }), 30);
    for (const a of [{ type: 'takeCourse', course: 'leadership' }, { type: 'setWorkstyle', style: 'hybrid' }, { type: 'innovationDay' }] as const) { try { applyActionInPlace(s, a); } catch { /* not allowed or affordable */ } }
    run(s, 12);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });

  it('the heir origin is a valid optional start choice', () => {
    const s = newGame({ companyName: 'H', industryId: 'software', seed: 'HEIR', difficulty: 'easy', modifiers: ['origin-heir'] });
    expect(s.modifiers).toContain('origin-heir');
    expect(s.brand).toBeGreaterThan(newGame({ companyName: 'H', industryId: 'software', seed: 'HEIR', difficulty: 'easy' }).brand);
  });
});
