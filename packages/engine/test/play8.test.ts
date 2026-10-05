import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, newGame, replay, stateChecksum, tickInPlace, toSubmission, CHOICE_EVENTS, startNamedEvent, createRng, EVENTS8, POLICIES, optionOf, policiesFor,
  play8Demand, play8Cost, runningPct, initiativesFor, type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 40, industryId: IndustryId = 'software'): GameState => {
  let s = play(newGame({ companyName: 'P', industryId, seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'P', industryId, seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 2_000_000_00;
  s.ledger.balances.shareCapital -= 2_000_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('business policies and events', () => {
  it('has at least 50 policies and 30 events, all with unique ids', () => {
    expect(POLICIES.length).toBeGreaterThanOrEqual(50);
    expect(EVENTS8.length).toBeGreaterThanOrEqual(30);
    expect(new Set(POLICIES.map((p) => p.id)).size).toBe(POLICIES.length);
    expect(new Set(EVENTS8.map((e) => e.id)).size).toBe(EVENTS8.length);
    for (const p of POLICIES) { expect(p.options.length).toBeGreaterThanOrEqual(2); expect(Object.keys(p.options[0].eff)).toHaveLength(p.id === 'safety' ? 1 : 0); }
    for (const e of EVENTS8) expect(CHOICE_EVENTS.some((c) => c.id === e.id), e.id).toBe(true);
  });

  it('every choice of every event runs under several dice and leaves the books balanced', { timeout: 300_000 }, () => {
    const bases: Record<string, GameState> = {};
    const baseFor = (id: IndustryId): GameState => (bases[id] ??= company(`P8-EVENTS-${id}`, 24, id));
    for (const e of EVENTS8) {
      for (const c of e.choices) {
        for (const rng of [3, 99]) {
          const s = structuredClone(baseFor((e.sector as IndustryId | undefined) ?? (e.gate === 'stock' ? 'ecommerce' : 'software')));
          s.pendingEvent = null;
          startNamedEvent(s, e.id, createRng({ rng }));
          expect((s.pendingEvent as { id: string } | null)?.id, e.id).toBe(e.id);
          const before = s.ledger.balances.cash;
          applyActionInPlace(s, { type: 'resolveEvent', choiceId: c.id });
          expect(checkIntegrity(s), `${e.id}.${c.id}`).toEqual([]);
          if (c.income) expect(s.ledger.balances.cash).toBeGreaterThan(before);
          run(s, 3);
        }
      }
    }
  });

  it('every policy option can be set, costs what it says, and the books balance', { timeout: 120_000 }, () => {
    for (const ind of ['software', 'clothing', 'restaurant', 'fitness', 'ecommerce', 'automotive'] as const) {
      const s = company(`P8-POL-${ind}`, 40, ind);
      for (const p of policiesFor(s)) {
        for (let o = 1; o < p.options.length; o++) {
          const c = structuredClone(s);
          applyActionInPlace(c, { type: 'policy', id: p.id, option: o });
          expect(optionOf(c, p.id)).toBe(o);
          expect(() => applyActionInPlace(c, { type: 'policy', id: p.id, option: o })).toThrow();
          expect(checkIntegrity(c), p.id).toEqual([]);
          run(c, 6);
          applyActionInPlace(c, { type: 'policy', id: p.id, option: 0 });
          expect(optionOf(c, p.id)).toBe(0);
        }
      }
    }
  });

  it('every initiative can be started, reports after its months, and the books balance', { timeout: 120_000 }, () => {
    for (const ind of ['software', 'clothing', 'restaurant', 'fitness', 'ecommerce', 'automotive'] as const) {
    const base = company(`P8-INIT-${ind}`, 40, ind);
    let won = 0; let lost = 0;
    for (const p of initiativesFor(base)) {
      const s = structuredClone(base);
      applyActionInPlace(s, { type: 'initiative', id: p.id });
      expect(() => applyActionInPlace(s, { type: 'initiative', id: p.id })).toThrow();
      run(s, p.months + 1);
      const d = s.play8?.proj?.done[p.id];
      expect(d, p.id).toBeTruthy();
      if (d!.result === 'won') won++; else lost++;
      expect(checkIntegrity(s), p.id).toEqual([]);
    }
    expect(won + lost).toBe(initiativesFor(base).length);
    }
  });

  it('stock-only policies are refused for businesses without stock, and a cooldown applies', () => {
    const s = company('P8-SOFT');
    expect(() => applyActionInPlace(s, { type: 'policy', id: 'subbox', option: 1 })).toThrow();
    expect(() => applyActionInPlace(s, { type: 'policy', id: 'nope', option: 1 })).toThrow();
    expect(() => applyActionInPlace(s, { type: 'policy', id: 'energy', option: 9 })).toThrow();
    applyActionInPlace(s, { type: 'policy', id: 'sponsor', option: 1 });
    expect(() => applyActionInPlace(s, { type: 'policy', id: 'sponsor', option: 0 })).toThrow();
    run(s, 3);
    applyActionInPlace(s, { type: 'policy', id: 'sponsor', option: 0 });
  });

  it('effects flow into the numbers', () => {
    const s = company('P8-EFF');
    expect(play8Demand(s)).toBe(1);
    applyActionInPlace(s, { type: 'policy', id: 'ambassadors', option: 1 });
    expect(play8Demand(s)).toBeGreaterThan(1);
    applyActionInPlace(s, { type: 'policy', id: 'tiers', option: 2 });
    expect(play8Cost(s)).toBeGreaterThan(1);
    expect(runningPct(s)).toBeGreaterThan(0);
  });

  it('events come up in a long game and it replays', () => {
    const seen = new Set<string>();
    const s = newGame({ companyName: 'P', industryId: 'ecommerce', seed: 'P8-LONG', difficulty: 'easy' });
    for (let i = 0; i < 120 && s.status === 'playing'; i++) { if (s.pendingEvent) seen.add(s.pendingEvent.id); answer(s); applyPolicy(s); answer(s); tickInPlace(s); }
    expect([...seen].some((x) => x.startsWith('e8_'))).toBe(true);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });

  it('a played game that sets many policies replays identically', () => {
    const g = play(newGame({ companyName: 'P', industryId: 'ecommerce', seed: 'P8-REPLAY', difficulty: 'easy' }), 38);
    for (const p of policiesFor(g).slice(0, 25)) { try { applyActionInPlace(g, { type: 'policy', id: p.id, option: 1 }); } catch { /* not affordable: fine */ } }
    run(g, 24);
    expect(stateChecksum(replay(toSubmission(g)))).toBe(stateChecksum(g));
  });
});
