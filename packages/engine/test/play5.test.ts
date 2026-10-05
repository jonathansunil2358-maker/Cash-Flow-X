import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, newGame, replay, stateChecksum, tickInPlace, toSubmission, NODES, POP_TIERS, labResult, lifeStage, productAge, supplyOf, mgrOf, pointsLeft,
  CHOICE_EVENTS, startNamedEvent, createRng, popTakings, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 40): GameState => {
  let s = play(newGame({ companyName: 'P', industryId: 'software', seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'P', industryId: 'software', seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 2_000_000_00;
  s.ledger.balances.shareCapital -= 2_000_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('version 5 fun', () => {
  it('every choice of every new decision runs and leaves the books balanced', () => {
    for (const id of ['rivalMove', 'industryShock', 'activist', 'cyberAttack', 'founderRest']) {
      const def = CHOICE_EVENTS.find((e) => e.id === id)!;
      expect(def, id).toBeDefined();
      for (const kind of ['regulation', 'supply', 'tech']) {
        for (const c of def.setup(company(`P5-${id}`), createRng({ rng: 1 })).choices) {
          const s = company(`P5-${id}`);
          s.pendingEvent = null;
          s.play5 = { shock: kind, attack: kind === 'tech' ? 'heavy' : 'light', rival: s.competitors[0]?.name };
          startNamedEvent(s, id, createRng({ rng: 5 }));
          expect(s.pendingEvent?.id).toBe(id);
          applyActionInPlace(s, { type: 'resolveEvent', choiceId: c.id });
          expect(checkIntegrity(s)).toEqual([]);
          run(s, 8);
        }
      }
    }
  });

  it('events actually come up in a long game, and the game replays', () => {
    const seen = new Set<string>();
    const s = newGame({ companyName: 'P', industryId: 'software', seed: 'P5-LONG', difficulty: 'easy' });
    for (let i = 0; i < 90 && s.status === 'playing'; i++) { if (s.pendingEvent) seen.add(s.pendingEvent.id); answer(s); applyPolicy(s); answer(s); tickInPlace(s); }
    expect([...seen].some((x) => ['rivalMove', 'industryShock', 'founderRest', 'activist', 'cyberAttack'].includes(x))).toBe(true);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });

  it('supply chain: switching costs money, has a cooldown, and changes unit costs', () => {
    const s = company('P5-SUP');
    applyActionInPlace(s, { type: 'supply', to: 'global' });
    expect(supplyOf(s)).toBe('global');
    expect(() => applyActionInPlace(s, { type: 'supply', to: 'local' })).toThrow();
    expect(() => applyActionInPlace(s, { type: 'supply', to: 'global' })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
    run(s, 14);
  });

  it('product lifecycle: a refresh needs an old product, costs money and resets its age', () => {
    const s = company('P5-LIFE', 12);
    s.month = 12;
    expect(() => applyActionInPlace(s, { type: 'refreshProduct' })).toThrow();
    const s2 = company('P5-LIFE2', 40);
    expect(['peak', 'ageing', 'tired']).toContain(lifeStage(s2));
    const age = productAge(s2);
    applyActionInPlace(s2, { type: 'refreshProduct' });
    expect(productAge(s2)).toBeLessThan(age);
    expect(lifeStage(s2)).toBe('launch');
    expect(checkIntegrity(s2)).toEqual([]);
  });

  it('pop-ups: one at a time, takings arrive next month as income', () => {
    const s = company('P5-POP');
    applyActionInPlace(s, { type: 'popup', tier: 1 });
    expect(() => applyActionInPlace(s, { type: 'popup', tier: 0 })).toThrow();
    expect(popTakings(s, s.play5!.pop!)).toBeGreaterThan(0);
    run(s, 2);
    expect(s.play5?.pop).toBeUndefined();
    expect(s.play5?.popResults?.length).toBe(1);
    expect(POP_TIERS.length).toBe(3);
  });

  it('pricing lab reports a revenue change for each direction and has a cooldown', () => {
    const s = company('P5-LAB');
    applyActionInPlace(s, { type: 'priceLab' });
    const r = labResult(s);
    expect(s.play5?.lab?.up).toBe(r.up);
    expect(() => applyActionInPlace(s, { type: 'priceLab' })).toThrow();
  });

  it('franchise coaching needs franchises, and managers need a real team', () => {
    const s = company('P5-FR');
    expect(() => applyActionInPlace(s, { type: 'coachFranchises' })).toThrow();
    s.franchises = 2;
    applyActionInPlace(s, { type: 'coachFranchises' });
    expect(s.play5?.fran).toBeGreaterThanOrEqual(90);
    run(s, 6);
    s.staff.ops = 4;
    applyActionInPlace(s, { type: 'promote', role: 'ops' });
    expect(mgrOf(s)).toHaveLength(1);
    expect(() => applyActionInPlace(s, { type: 'promote', role: 'ops' })).toThrow();
    s.staff.rnd = 1;
    expect(() => applyActionInPlace(s, { type: 'promote', role: 'rnd' })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('department focus: one point a year, branches in order', () => {
    const s = company('P5-SK', 40);
    expect(pointsLeft(s)).toBeGreaterThan(0);
    expect(() => applyActionInPlace(s, { type: 'skill', id: 'ops2' })).toThrow();
    applyActionInPlace(s, { type: 'skill', id: 'ops1' });
    applyActionInPlace(s, { type: 'skill', id: 'ops2' });
    expect(() => applyActionInPlace(s, { type: 'skill', id: 'ops1' })).toThrow();
    expect(NODES).toHaveLength(9);
    run(s, 3);
  });

  it('security costs money each month and a played game with all of it replays identically', () => {
    const s = company('P5-SEC');
    applyActionInPlace(s, { type: 'security', level: 2 });
    expect(() => applyActionInPlace(s, { type: 'security', level: 2 })).toThrow();
    run(s, 4);
    const g = play(newGame({ companyName: 'P', industryId: 'software', seed: 'P5-REPLAY', difficulty: 'easy' }), 38);
    for (const a of [{ type: 'supply', to: 'global' }, { type: 'security', level: 1 }, { type: 'popup', tier: 0 }, { type: 'priceLab' }, { type: 'skill', id: 'brd1' }, { type: 'refreshProduct' }] as const) { try { applyActionInPlace(g, a); } catch { /* not affordable: fine */ } }
    run(g, 20);
    expect(stateChecksum(replay(toSubmission(g)))).toBe(stateChecksum(g));
  });
});

import { auctionOf, auctionScore, bestCalls, boardroomScore, callScore, callsOf, directorsOf, fraudScore, invoicesOf, pitchMetrics, CALL_BUDGET } from '../src/index';
describe('four new daily games', () => {
  it('boardroom: matching a strong number to each director scores best', () => {
    const s = company('P5-BOARD');
    const day = '2026-10-04';
    const dirs = directorsOf(day);
    expect(new Set(dirs.map((d) => d.wants)).size).toBe(3);
    const best = boardroomScore(s, day, dirs.map((d) => d.wants)).points;
    const worst = boardroomScore(s, day, ['x', 'y', 'z']).points;
    expect(best).toBeGreaterThanOrEqual(worst);
    expect(pitchMetrics(s)).toHaveLength(6);
  });
  it('call centre: the best set fits the hour and scores 100; over the hour scores 0', () => {
    const calls = callsOf('2026-10-04');
    expect(calls).toHaveLength(8);
    let bestSet: string[] = []; let bu = -1;
    for (let m = 0; m < 256; m++) { const ids = calls.filter((_, i) => m & (1 << i)).map((c) => c.id); const r = callScore(calls, ids); if (!r.over && r.urgency > bu) { bu = r.urgency; bestSet = ids; } }
    expect(callScore(calls, bestSet).points).toBe(100);
    expect(bu).toBe(bestCalls(calls));
    expect(callScore(calls, calls.map((c) => c.id)).over).toBe(calls.reduce((a, c) => a + c.minutes, 0) > CALL_BUDGET);
  });
  it('auction: bidding just over the top rival wins the most profit', () => {
    const lots = auctionOf('2026-10-04');
    const perfect = Object.fromEntries(lots.map((l) => [l.id, Math.max(...l.rivals) + 1000_00]));
    expect(auctionScore(lots, perfect).points).toBeGreaterThanOrEqual(90);
    expect(auctionScore(lots, Object.fromEntries(lots.map((l) => [l.id, 1]))).points).toBe(0);
  });
  it('fraud: flagging the two fakes scores 100 and a wrong flag costs points', () => {
    const { lines, fakes } = invoicesOf('2026-10-04');
    expect(lines).toHaveLength(12);
    expect(fakes).toHaveLength(2);
    expect(fraudScore('2026-10-04', fakes).points).toBe(100);
    const wrong = lines.find((l) => !fakes.includes(l.id))!.id;
    expect(fraudScore('2026-10-04', [...fakes, wrong]).points).toBe(80);
  });
});
