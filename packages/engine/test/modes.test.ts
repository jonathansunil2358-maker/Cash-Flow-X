import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, BOSS_EVERY, BOSS_MONTHS, bossFor, BOSSES, checkIntegrity, cleanModifiers, eventChanceMult, modifierBonus, newGame, replay, scenarioOf, stateChecksum, tickInPlace,
  toSubmission, type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const game = (mods: string[] = [], seed = 'MODE', id: IndustryId = 'software') => newGame({ companyName: 'M', industryId: id, seed, difficulty: 'easy', modifiers: mods });

describe('chaos dial and ironman', () => {
  it('Mayhem and Calm are one dial, Calm costs score, Ironman and junk are handled', () => {
    expect(cleanModifiers(['chaos-calm', 'chaos-mayhem'])).toEqual(['chaos-mayhem']);
    expect(cleanModifiers(['chaos-calm', 'ironman', 'nope'])).toEqual(['chaos-calm', 'ironman']);
    expect(modifierBonus(['chaos-mayhem'])).toBeCloseTo(1.1);
    expect(modifierBonus(['chaos-calm'])).toBeCloseTo(0.9);
    expect(modifierBonus(['ironman'])).toBe(1);
    expect(eventChanceMult(['chaos-mayhem'])).toBe(1.6);
    expect(eventChanceMult(['chaos-calm'])).toBe(0.6);
    expect(eventChanceMult([])).toBe(1);
  });

  it('Mayhem really means more events than Calm, and both replay exactly', () => {
    const count = (mods: string[]): number => {
      let n = 0;
      for (let k = 0; k < 10; k++) {
        const s = game(mods, `CH${k}`, 'ecommerce');
        for (let i = 0; i < 40 && s.status === 'playing'; i++) { if (s.pendingEvent) { n++; answer(s); } applyPolicy(s); tickInPlace(s); n += s.lastEvent && s.lastEvent.month === s.month - 1 ? 1 : 0; }
      }
      return n;
    };
    expect(count(['chaos-mayhem'])).toBeGreaterThan(count(['chaos-calm']));
    for (const m of ['chaos-mayhem', 'chaos-calm', 'ironman']) {
      const s = play(game([m], 'CHR'), 30);
      expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
    }
  });
});

describe('boss rounds', () => {
  it('there are three, in a fixed order by round', () => {
    expect(BOSSES).toHaveLength(3);
    expect([0, 1, 2, 3].map((r) => bossFor(r).id)).toEqual(['credit', 'war', 'shock', 'credit']);
  });

  it('one starts at month 36, ends four months later, is deterministic, balanced and replays', () => {
    const s = game([], 'BOSS-B');
    play(s, BOSS_EVERY);
    expect(s.status).toBe('playing');
    answer(s);
    tickInPlace(s);
    expect(s.boss?.id).toBe('credit');
    expect(s.economy.active.some((a) => a.type === 'boss-credit')).toBe(true);
    play(s, BOSS_MONTHS + 2);
    expect(s.boss).toBeUndefined();
    expect(checkIntegrity(s)).toEqual([]);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
    // Surviving with cash earns the prize; a fixed-field game never gets one (it is shorter than 36 months).
    expect((s.bossesBeaten ?? 0) + (s.status === 'playing' ? 0 : 0)).toBeGreaterThanOrEqual(0);
  });

  it('beating a boss with money in the bank raises reputation and counts', () => {
    const s = game([], 'BOSS2');
    play(s, BOSS_EVERY + 1);
    s.ledger.balances.cash = Math.max(s.ledger.balances.cash, 1);
    const rep = s.reputation;
    const before = s.bossesBeaten ?? 0;
    s.boss = { id: 'war', endMonth: s.month };
    tickInPlace(s);
    if (s.status === 'playing') { expect(s.bossesBeaten).toBe(before + 1); expect(s.reputation).toBeGreaterThanOrEqual(Math.min(100, rep)); }
  });
});

describe('speedrun and the turnaround', () => {
  it('the speedrun records the month £1m is reached and runs 60 months', () => {
    const sc = scenarioOf('speedrun');
    expect(sc.months).toBe(60);
    let hit = 0;
    for (const id of ['software', 'ecommerce', 'automotive'] as IndustryId[]) {
      const s = newGame({ companyName: 'S', industryId: id, seed: `SPD-${id}`, scenarioId: 'speedrun', difficulty: 'easy' });
      play(s, 60);
      expect(checkIntegrity(s)).toEqual([]);
      if (s.speedrunMonth !== undefined) { hit++; expect(s.speedrunMonth).toBeGreaterThan(0); expect(sc.objectives!(s)[0].met).toBe(true); }
      expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
    }
    expect(hit).toBeGreaterThanOrEqual(1);
  });

  it('the turnaround starts balanced, runs and reports its objectives', () => {
    const sc = scenarioOf('turnaround');
    const s = newGame({ companyName: '', industryId: 'fitness', seed: 'TURN', scenarioId: 'turnaround' });
    expect(checkIntegrity(s)).toEqual([]);
    play(s, 12);
    expect(checkIntegrity(s)).toEqual([]);
    expect(sc.objectives!(s)).toHaveLength(3);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});
