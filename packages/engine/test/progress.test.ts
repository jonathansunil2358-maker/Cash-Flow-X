import { describe, expect, it } from 'vitest';
import { cr, dr, post } from '../src/ledger/journal';
import {
  addPassPoints, applyActionInPlace, checkIntegrity, claimPass, cleanModifiers, CULTURES, cultureOf, forecastMonthsOf, learnSkill, masteryOf, modifierBonus, modifiersOf,
  newGame, newProfile, PASS_POINTS_PER_TIER, passOf, passTier, planSlotsOf, replay, reputationTier, skillPoints, stateChecksum, tickInPlace, toSubmission,
  ventureCheck, VENTURES, xpForLevel, type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = (modifiers?: string[], id: IndustryId = 'ecommerce') => newGame({ companyName: 'P', industryId: id, seed: 'PROG', difficulty: 'medium', modifiers });

describe('company culture', () => {
  it('keeps at most one culture, pays no score bonus and is cleaned like other modifiers', () => {
    expect(cleanModifiers(['culture-bold', 'culture-frugal', 'slow-market', 'junk'])).toEqual(['slow-market', 'culture-frugal']);
    expect(cultureOf(['slow-market', 'culture-steady'])).toBe('culture-steady');
    expect(modifierBonus(['culture-bold'])).toBe(1);
    expect(modifierBonus(['slow-market', 'culture-bold'])).toBeCloseTo(1.1);
  });

  it('changes the numbers a little, in different directions, and the books stay balanced', () => {
    const base = modifiersOf(fresh());
    for (const c of CULTURES) {
      const s = fresh([c.id]);
      expect(s.modifiers).toEqual([c.id]);
      const m = modifiersOf(s);
      expect(JSON.stringify(m)).not.toBe(JSON.stringify(base));
      play(s, 18);
      expect(checkIntegrity(s)).toEqual([]);
    }
  });

  it('the server replays a culture exactly', () => {
    const s = play(fresh(['culture-bold']), 14);
    const copy = replay(toSubmission(s));
    expect(stateChecksum(copy)).toBe(stateChecksum(s));
  });
});

describe('side ventures', () => {
  const rich = (): GameState => { const s = fresh(); play(s, 3); return s; };

  it('are validated: size, count and a quarter-of-cash cap', () => {
    const s = rich();
    const cash = s.ledger.balances.cash;
    expect(ventureCheck(s, 'nope', 5_000_00).ok).toBe(false);
    expect(ventureCheck(s, 'safe', 10).ok).toBe(false);
    expect(ventureCheck(s, 'safe', cash).ok).toBe(false);
    expect(() => applyActionInPlace(s, { type: 'startVenture', kind: 'safe', amount: cash })).toThrow();
  });

  it('tie up the stake in the books and settle with the books balanced, in all three kinds', () => {
    for (const v of VENTURES.filter((d) => !d.minValue)) {
      const s = rich();
      s.ledger.balances.cash; // touch
      const stake = Math.min(Math.floor(s.ledger.balances.cash * 0.2), 5_000_00);
      if (stake < 1_000_00) continue;
      const before = s.ledger.balances.cash;
      applyActionInPlace(s, { type: 'startVenture', kind: v.id, amount: stake });
      expect(s.ledger.balances.cash).toBe(before - stake);
      expect(s.ventures).toHaveLength(1);
      expect(checkIntegrity(s)).toEqual([]);
      for (let i = 0; i < v.months + 1 && s.status === 'playing'; i++) { answer(s); tickInPlace(s); expect(checkIntegrity(s)).toEqual([]); }
      expect(s.ventures).toBeUndefined();
    }
  });

  it('survive a replay: starting one is an ordinary action', () => {
    const s = rich();
    const stake = Math.min(Math.floor(s.ledger.balances.cash * 0.2), 3_000_00);
    applyActionInPlace(s, { type: 'startVenture', kind: 'growth', amount: stake });
    play(s, 12);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});

describe('reputation tiers, skills, season pass and mastery', () => {
  it('names reputation tiers', () => {
    expect(reputationTier(0).name).toBe('Struggling name');
    expect(reputationTier(50).name).toBe('Local favourite');
    expect(reputationTier(100).name).toBe('National brand');
    expect(reputationTier(100).next).toBeNull();
    expect(reputationTier(10).next?.at).toBe(30);
  });

  it('gives one skill point per founder level above 1, and each skill once', () => {
    let p = newProfile();
    expect(skillPoints(p)).toBe(0);
    expect(learnSkill(p, 'longForecast')).toBe(p);
    p = { ...p, xp: xpForLevel(3) };
    expect(skillPoints(p)).toBe(2);
    p = learnSkill(p, 'longForecast');
    expect(skillPoints(p)).toBe(1);
    expect(learnSkill(p, 'longForecast')).toBe(p);
    expect(learnSkill(p, 'nonsense')).toBe(p);
    expect(forecastMonthsOf(p)).toBe(24);
    expect(planSlotsOf(p)).toBe(3);
    p = learnSkill(p, 'planSlots');
    expect(planSlotsOf(p)).toBe(6);
  });

  it('a season pass fills with points, pays each tier once, and starts afresh next month', () => {
    const now = new Date('2026-10-05T10:00:00Z');
    let p = newProfile();
    expect(claimPass(p, now)).toBeNull();
    p = addPassPoints(p, PASS_POINTS_PER_TIER * 3, now);
    expect(passTier(passOf(p, now))).toBe(3);
    const rewards: string[] = [];
    for (let r = claimPass(p, now); r; r = claimPass(p, now)) { rewards.push(r.reward.kind); p = r.profile; }
    expect(rewards).toHaveLength(3);
    expect(claimPass(p, now)).toBeNull();
    p = addPassPoints(p, 10_000, now);
    expect(passTier(passOf(p, now))).toBe(10);
    const next = new Date('2026-11-01T00:00:00Z');
    expect(passOf(p, next)).toEqual({ season: '2026-11', points: 0, claimed: [] });
  });

  it('mastery counts finished companies of a sector that ran at least a year', () => {
    const run = (industryId: IndustryId, months: number) => ({ companyName: 'x', industryId, difficulty: 'medium' as const, months, outcome: 'prestiged' as const, ownerStake: 100, legacy: 1 });
    const p = { ...newProfile(), runs: [run('ecommerce', 24), run('ecommerce', 6), run('ecommerce', 36), run('ecommerce', 12), run('software', 30)] };
    expect(masteryOf(p, 'ecommerce')).toMatchObject({ finished: 3, tier: 2, tierName: 'Silver', next: 6 });
    expect(masteryOf(p, 'software')).toMatchObject({ finished: 1, tier: 1, tierName: 'Bronze' });
    expect(masteryOf(p, 'restaurant').tierName).toBeNull();
  });
});

describe('team size', () => {
  it('has no cap: a company can employ far more than 400 people in a role, and the books stay balanced', () => {
    const s = fresh(undefined, 'software');
    // Give the company the cash to hire a very large team, booked as a proper share issue.
    const topUp = 5_000_000_00;
    post(s.ledger, s.month, 'Test share issue', [dr('cash', topUp), cr('shareCapital', topUp)], { cf: 'financing' });
    for (let i = 0; i < 6; i++) applyActionInPlace(s, { type: 'hire', role: 'ops', count: 100 });
    expect(s.staff.ops).toBeGreaterThan(400);
    expect(() => applyActionInPlace(s, { type: 'hire', role: 'ops', count: 1001 })).toThrow(/at a time/);
    expect(checkIntegrity(s)).toEqual([]);
    for (let i = 0; i < 3 && s.status === 'playing'; i++) { answer(s); tickInPlace(s); }
    expect(checkIntegrity(s)).toEqual([]);
  });
});
