import { describe, expect, it } from 'vitest';
import {
  advanceAwards, advanceBoard, applyActionInPlace, AWARDS, boardTarget, checkIntegrity, CHOICE_EVENTS, moodOf, newGame, replay, rosterOf, tickInPlace, TITLE_IDS,
  toSubmission, type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => {
  for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); }
  return s;
};
const fresh = (id: IndustryId = 'ecommerce', seed = 'FUN') => newGame({ companyName: 'F', industryId: id, seed, difficulty: 'easy' });

describe('board meetings', () => {
  it('start at month 3, judge each quarter, and keep a streak', () => {
    const s = fresh();
    expect(s.board).toBeUndefined();
    play(s, 4);
    expect(s.board).toBeDefined();
    expect(s.board!.due).toBe(6);
    play(s, 20);
    const b = s.board!;
    expect(b.hits + b.misses).toBeGreaterThanOrEqual(5);
    expect(b.streak).toBeLessThanOrEqual(b.hits);
    expect(s.reputation).toBeGreaterThanOrEqual(0);
    expect(s.reputation).toBeLessThanOrEqual(100);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('hit: reputation and morale rise; miss: they fall; target is 5% above last quarter', () => {
    const s = play(fresh('software'), 9);
    const before = { rep: s.reputation, morale: s.morale };
    s.board = { target: -1_000_000_00_00, due: s.month, hits: 0, misses: 0, streak: 3, last: null, lastActual: 0 };
    s.month = 9;
    advanceBoard(s, true);
    expect(s.board!.last).toBe('hit');
    expect(s.board!.streak).toBe(4);
    expect(s.reputation).toBeGreaterThan(before.rep);
    s.board = { target: 1_000_000_00_00, due: s.month, hits: 0, misses: 0, streak: 3, last: null, lastActual: 0 };
    const rep = s.reputation;
    advanceBoard(s, true);
    expect(s.board!.last).toBe('miss');
    expect(s.board!.streak).toBe(0);
    expect(s.reputation).toBeLessThan(rep);
    expect(boardTarget(s)).toBeTypeOf('number');
  });
});

describe('annual awards', () => {
  it('have six categories, are given at year start, and never touch the books', () => {
    expect(AWARDS).toHaveLength(6);
    const s = play(fresh('software', 'AWARDS'), 26);
    for (const a of s.awards ?? []) expect(AWARDS.some((d) => d.id === a.id)).toBe(true);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('are won when the conditions are met', () => {
    const s = play(fresh('ecommerce', 'AW2'), 12);
    s.month = 24;
    s.morale = 90;
    s.reputation = 80;
    advanceAwards(s, true);
    const ids = (s.awards ?? []).map((a) => a.id);
    expect(ids).toContain('employer');
    expect(ids).toContain('favourite');
  });
});

describe('the team', () => {
  it('has a stable name and personality for every hire, from the seed alone', () => {
    const s = fresh('software', 'TEAM');
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 3 });
    applyActionInPlace(s, { type: 'hire', role: 'sales', count: 2 });
    const a = rosterOf(s);
    expect(a).toHaveLength(5);
    expect(new Set(a.map((p) => p.id)).size).toBe(5);
    expect(rosterOf(structuredClone(s))).toEqual(a);
    applyActionInPlace(s, { type: 'fire', role: 'ops', count: 1 });
    expect(rosterOf(s).slice(0, 2)).toEqual(a.slice(0, 2));
    expect(rosterOf(s)).toHaveLength(4);
    expect(moodOf(80).label).toBe('Buzzing');
    expect(moodOf(20).label).toBe('Unhappy');
  });

  it('staff requests are a friendly decision with four ways to answer', () => {
    const def = CHOICE_EVENTS.find((e) => e.id === 'staffAsk')!;
    expect(def.polarity).toBe('good');
    const s = fresh('software', 'ASK');
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 3 });
    s.month = 8;
    const setup = def.setup(s, { next: () => 0.5 });
    expect(setup.choices.map((c) => c.id)).toEqual(['raise', 'bonus', 'timeoff', 'decline']);
    expect(setup.story).toMatch(/asks to talk/);
  });
});

describe('everything replays', () => {
  it('a run with board meetings, awards and requests replays to the same game', () => {
    const s = play(fresh('restaurant', 'FUNREPLAY'), 40);
    const r = replay(toSubmission(s));
    expect(r.board).toEqual(s.board);
    expect(r.awards).toEqual(s.awards);
    expect(r.ledger.balances).toEqual(s.ledger.balances);
    expect(TITLE_IDS).toContain('award_first');
  });
});
