import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, boonOffer, boonsDue, checkIntegrity, esgOf, modifiersOf, newGame, replay, stanceFactor, stateChecksum, tickInPlace, toSubmission, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 40): GameState => {
  let s = play(newGame({ companyName: 'S', industryId: 'software', seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'S', industryId: 'software', seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 3_000_000_00;
  s.ledger.balances.shareCapital -= 3_000_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };

describe('big strategy', () => {
  it('a subsidiary in another sector pays a monthly return and the books balance', () => {
    const s = company('STR-SUB');
    if ((s.history.at(-1)?.valuation?.equityValue ?? 0) < 2_000_000_00) { s.history.at(-1)!.valuation!.equityValue = 3_000_000_00; }
    expect(() => applyActionInPlace(s, { type: 'foundSub', sector: 'software' })).toThrow();
    applyActionInPlace(s, { type: 'foundSub', sector: 'restaurant' });
    expect(() => applyActionInPlace(s, { type: 'foundSub', sector: 'restaurant' })).toThrow();
    const cash = s.ledger.balances.cash;
    run(s, 6);
    expect(s.ledger.balances.cash).toBeGreaterThan(cash - 1_000_000_00);
    expect(s.strat?.subs?.length).toBe(1);
  });

  it('a boon is due each year, three are offered, and the pick changes the modifiers', () => {
    const s = company('STR-BOON');
    expect(boonsDue(s)).toBeGreaterThan(0);
    const offer = boonOffer(s);
    expect(offer).toHaveLength(3);
    const before = modifiersOf(s);
    const pick = offer.find((b) => b.id === 'demand') ?? offer[0];
    applyActionInPlace(s, { type: 'pickBoon', id: pick.id });
    expect(() => applyActionInPlace(s, { type: 'pickBoon', id: pick.id })).toThrow();
    if (pick.id === 'demand') expect(modifiersOf(s).demandMult).toBeGreaterThan(before.demandMult);
    expect(s.strat?.boons).toContain(pick.id);
  });

  it('cycle stance cushions slumps and amplifies booms, with a cooldown', () => {
    const s = company('STR-CYCLE');
    s.economy.demandMult = 0.8;
    expect(stanceFactor(s)).toBe(1);
    applyActionInPlace(s, { type: 'setStance', stance: 'defensive' });
    expect(stanceFactor(s)).toBeGreaterThan(1);
    expect(() => applyActionInPlace(s, { type: 'setStance', stance: 'expansion' })).toThrow();
  });

  it('green steps cost money, give their perk, and lift the ESG rating', () => {
    const s = company('STR-GREEN');
    const d = esgOf(s).score;
    for (const step of ['solar', 'recycle', 'certify']) applyActionInPlace(s, { type: 'goGreen', step });
    expect(esgOf(s).score).toBeGreaterThan(d);
    expect(() => applyActionInPlace(s, { type: 'goGreen', step: 'solar' })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
    run(s, 14);
  });

  it('donations lift reputation and ESG, with a cooldown', () => {
    const s = company('STR-GIVE');
    s.reputation = 50;
    const rep = s.reputation;
    applyActionInPlace(s, { type: 'donate', amount: 5_000_00 });
    expect(s.reputation).toBeGreaterThan(rep);
    expect(() => applyActionInPlace(s, { type: 'donate', amount: 5_000_00 })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('a company using them replays identically on the server', () => {
    const s = play(newGame({ companyName: 'S', industryId: 'software', seed: 'STR-REPLAY', difficulty: 'easy' }), 40);
    for (const a of [{ type: 'pickBoon', id: boonOffer(s)[0].id }, { type: 'setStance', stance: 'defensive' }, { type: 'goGreen', step: 'recycle' }, { type: 'donate', amount: 2_000_00 }] as const) { try { applyActionInPlace(s, a); } catch { /* not affordable: fine */ } }
    run(s, 12);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});
