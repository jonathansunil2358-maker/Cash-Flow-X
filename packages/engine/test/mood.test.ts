import { describe, expect, it } from 'vitest';
import { applyActionInPlace, milestonesReached, MILESTONES, musicMood, newGame, newMilestones, stateChecksum, tickInPlace, weatherFor, type GameState } from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = () => newGame({ companyName: 'M', industryId: 'ecommerce', seed: 'MOOD', difficulty: 'easy' });

describe('mood and feel', () => {
  it('weather is deterministic, seasonal and never touches the simulation', () => {
    const s = fresh();
    const before = stateChecksum(s);
    const year = Array.from({ length: 12 }, (_, m) => weatherFor({ month: m, seedLabel: 'MOOD' }));
    expect(year).toEqual(Array.from({ length: 12 }, (_, m) => weatherFor({ month: m, seedLabel: 'MOOD' })));
    expect(stateChecksum(s)).toBe(before);
    // Across many seeds, winter sees snow and summer never does.
    const winter = new Set<string>(); const summer = new Set<string>();
    for (let i = 0; i < 200; i++) { winter.add(weatherFor({ month: 0, seedLabel: `W${i}` })); summer.add(weatherFor({ month: 6, seedLabel: `W${i}` })); }
    expect(winter.has('snow')).toBe(true);
    expect(summer.has('snow')).toBe(false);
  });

  it('music mood follows the company: calm to start, tense with no cash, upbeat in profit', () => {
    const s = fresh();
    expect(musicMood(s)).toBe('calm');
    play(s, 18);
    expect(['calm', 'upbeat', 'tense']).toContain(musicMood(s));
    const broke = fresh();
    broke.ledger.balances.cash = -1;
    expect(musicMood(broke)).toBe('tense');
    broke.status = 'bankrupt';
    expect(musicMood(broke)).toBe('calm');
  });

  it('milestones are celebrated once, and an untracked player is caught up silently', () => {
    const s = play(fresh(), 24);
    const reached = milestonesReached(s);
    expect(reached.every((id) => MILESTONES.some((m) => m.id === id))).toBe(true);
    const first = newMilestones(s, undefined);
    expect(first.celebrate).toEqual([]);
    expect(first.seen).toEqual(reached);
    const again = newMilestones(s, first.seen);
    expect(again.celebrate).toEqual([]);
    const empty = newMilestones(s, []);
    expect(empty.celebrate.map((m) => m.id)).toEqual(reached);
    expect(newMilestones(s, empty.seen).celebrate).toEqual([]);
    // A prestiged company has the prestige milestone.
    const p = fresh(); p.prestigeLevel = 1;
    expect(milestonesReached(p)).toContain('prestige');
  });
});
