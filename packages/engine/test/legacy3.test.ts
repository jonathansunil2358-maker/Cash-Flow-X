import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, challengesFor, challengesDone, CHALLENGE_GEMS, checkIntegrity, claimableGenerations, claimInheritance, dynastyOf, INHERITANCE_GEMS, MASTERY_CHALLENGES, newGame, newlyMet,
  newProfile, tickInPlace, ventureCheck, VENTURES, type GameState, type Profile, type RunSummary,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const run = (i: number, stake = 1_000_000_00): RunSummary => ({ companyName: `Co ${i}`, industryId: 'software', difficulty: 'medium', months: 30, outcome: 'prestiged', ownerStake: stake, legacy: 1 });

describe('dynasty', () => {
  it('groups companies five to a generation and pays an inheritance for each complete one, once', () => {
    let p: Profile = { ...newProfile(), gems: 0, runs: Array.from({ length: 7 }, (_, i) => run(i, (i + 1) * 100_000_00)) };
    const g = dynastyOf(p);
    expect(g).toHaveLength(2);
    expect(g[0].companies).toHaveLength(5);
    expect(g[1].companies).toHaveLength(2);
    expect(g[0].best).toBe(500_000_00);
    expect(claimableGenerations(p)).toBe(1);
    p = claimInheritance(p);
    expect(p.gems).toBe(INHERITANCE_GEMS);
    expect(claimableGenerations(p)).toBe(0);
    expect(() => claimInheritance(p)).toThrow(/complete/);
    p = { ...p, runs: [...p.runs, run(8), run(9), run(10)] };
    expect(claimableGenerations(p)).toBe(1);
    expect(dynastyOf(newProfile())).toEqual([]);
  });
});

describe('mastery challenges', () => {
  it('have unique ids, apply to the right sectors, and are met once and paid once', () => {
    expect(new Set(MASTERY_CHALLENGES.map((c) => c.id)).size).toBe(MASTERY_CHALLENGES.length);
    expect(challengesFor('software').some((c) => c.id === 'soft-saas')).toBe(true);
    expect(challengesFor('software').some((c) => c.id === 'rest-full')).toBe(false);
    const s = play(newGame({ companyName: 'M', industryId: 'software', seed: 'MC', difficulty: 'easy' }), 30);
    const p = newProfile();
    const met = newlyMet(s, p);
    for (const c of met) expect(challengesFor('software')).toContain(c);
    const paid = { ...p, mchallenges: met.map((c) => c.id) };
    expect(newlyMet(s, paid)).toEqual([]);
    expect(challengesDone(paid)).toEqual(met.map((c) => c.id));
    expect(challengesDone({ mchallenges: ['junk'] })).toEqual([]);
    expect(CHALLENGE_GEMS).toBeGreaterThan(0);
    // Forced: a trusted name challenge is met by high reputation.
    s.reputation = 90;
    expect(newlyMet(s, p).some((c) => c.id === 'trusted')).toBe(true);
  });
});

describe('the empire venture', () => {
  it('is only for £100m companies, and settles with the books balanced', () => {
    const empire = VENTURES.find((v) => v.id === 'empire')!;
    expect(empire.minValue).toBeGreaterThan(0);
    const s = play(newGame({ companyName: 'E', industryId: 'software', seed: 'EMP', difficulty: 'easy' }), 8);
    s.ledger.balances.cash += 2_000_000_000_00; s.ledger.balances.shareCapital -= 2_000_000_000_00;
    expect(ventureCheck(s, 'empire', 10_000_000_00).ok).toBe(false);
    const rec = s.history.at(-1)!;
    rec.valuation = { ...rec.valuation, equityValue: 200_000_000_00 };
    expect(ventureCheck(s, 'empire', 10_000_000_00).ok).toBe(true);
    applyActionInPlace(s, { type: 'startVenture', kind: 'empire', amount: 10_000_000_00 });
    expect(checkIntegrity(s)).toEqual([]);
    for (let i = 0; i < 26 && s.status === 'playing'; i++) { answer(s); tickInPlace(s); }
    expect(s.ventures).toBeUndefined();
    expect(checkIntegrity(s)).toEqual([]);
  });
});
