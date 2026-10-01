import { describe, expect, it } from 'vitest';
import {
  ActionError, applyActionInPlace, applyBankruptcy, awardPrestige, balanceSheet, buyPerk, cashFlowStatement, checkIntegrity,
  createRng, DIFFICULTIES, finalScore, legacyFor, leasesCurrentPortion, modifiersOf, newGame, newProfile, perkEffects,
  prestigeCheck, prestigeThreshold, rebirthCheck, replay, runEvents, startingCash, tickInPlace, toSubmission, upgradeOptions,
  type GameState,
} from '../src/index';
import { playPolicy, playUntil } from './helpers';

describe('difficulty', () => {
  it('sets starting cash: £100k / £50k / £25k', () => {
    for (const [d, cash] of [['easy', 100_000_00], ['medium', 50_000_00], ['hard', 25_000_00]] as const) {
      const s = newGame({ companyName: 'D', industryId: 'software', seed: 'DIFF', difficulty: d });
      expect(s.ledger.balances.cash).toBe(cash);
      expect(checkIntegrity(s)).toEqual([]);
    }
  });

  it('applies the Family money perk, except on Hard', () => {
    expect(startingCash('medium', { fin_cash: 2 })).toBe(Math.round((50_000_00 * 1.21) / 100_000) * 100_000);
    expect(startingCash('hard', { fin_cash: 2 })).toBe(25_000_00);
    const hard = newGame({ companyName: 'H', industryId: 'software', seed: 'H', difficulty: 'hard', perks: { ops_capacity: 3 }, boosts: [{ id: 'rush', monthsRemaining: 6 }] });
    expect(hard.perks).toEqual({});
    expect(hard.boosts).toEqual([]);
  });

  it('draws good and bad news in the configured proportions', () => {
    for (const d of ['easy', 'hard'] as const) {
      const s = newGame({ companyName: 'E', industryId: 'software', seed: `ODDS-${d}`, difficulty: d });
      s.month = 24;
      const rng = createRng(s);
      let good = 0;
      let total = 0;
      for (let i = 0; i < 6000; i++) {
        s.pendingEvent = null;
        s.lastEvent = null;
        s.economy.active = [];
        runEvents(s, rng, true);
        const polarity = (s as GameState).pendingEvent?.polarity ?? (s as GameState).lastEvent?.polarity;
        if (!polarity) continue;
        total += 1;
        if (polarity === 'good') good += 1;
      }
      expect(total).toBeGreaterThan(800);
      expect(good / total).toBeCloseTo(DIFFICULTIES[d].positiveShare, 1);
    }
  });

  it('the Lucky charm boost blocks bad news', () => {
    const s = newGame({ companyName: 'L', industryId: 'software', seed: 'SHIELD', difficulty: 'hard' });
    s.difficulty = 'medium'; // boosts only work where perks apply
    s.boosts = [{ id: 'shield', monthsRemaining: 999 }];
    s.month = 24;
    const rng = createRng(s);
    for (let i = 0; i < 2000; i++) {
      s.pendingEvent = null;
      s.lastEvent = null;
      s.economy.active = [];
      runEvents(s, rng, true);
      expect((s as GameState).pendingEvent?.polarity ?? (s as GameState).lastEvent?.polarity ?? 'good').toBe('good');
    }
  });
});

describe('choice events', () => {
  function withPendingEvent(): GameState {
    for (let k = 0; k < 50; k++) {
      const s = newGame({ companyName: 'C', industryId: 'software', seed: `CHOICE-${k}`, difficulty: 'easy' });
      applyActionInPlace(s, { type: 'setMarketing', amount: 3_000_00 });
      for (let i = 0; i < 60 && s.status === 'playing'; i++) {
        tickInPlace(s);
        if (s.pendingEvent) return s;
      }
    }
    throw new Error('no choice event found');
  }

  it('pause the game until resolved, then apply the choice', () => {
    const s = withPendingEvent();
    expect(() => tickInPlace(s)).toThrow(/pending event/);
    const choice = s.pendingEvent!.choices[s.pendingEvent!.choices.length - 1];
    applyActionInPlace(s, { type: 'resolveEvent', choiceId: choice.id });
    expect(s.pendingEvent).toBeNull();
    tickInPlace(s);
    expect(s.integrityErrors).toEqual([]);
  });

  it('reject unknown choices', () => {
    const s = withPendingEvent();
    expect(() => applyActionInPlace(s, { type: 'resolveEvent', choiceId: 'nope' })).toThrow(ActionError);
  });
});

describe('sector upgrades', () => {
  it('are capitalised as PP&E, level up with rising costs, and respect prerequisites', () => {
    const s = newGame({ companyName: 'U', industryId: 'software', seed: 'UPG', difficulty: 'easy' });
    const cloud = upgradeOptions(s).find((o) => o.def.id === 'cloud')!;
    const ppeBefore = s.ledger.balances.ppe;
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'cloud' });
    expect(s.upgrades.cloud).toBe(1);
    expect(s.ledger.balances.ppe - ppeBefore).toBe(cloud.cost);
    const next = upgradeOptions(s).find((o) => o.def.id === 'cloud')!;
    expect(next.cost).toBeGreaterThan(cloud.cost);
    expect(modifiersOf(s).capacityMult).toBeCloseTo(1.2);
    expect(() => applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'marketplace' })).toThrow(/Needs Sales CRM level 2/);
    expect(s.ledger.period.investing['Purchase of property, plant & equipment']).toBe(-cloud.cost);
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('IFRS 16 leasing', () => {
  it('recognises a right-of-use asset and liability without moving cash', () => {
    const s = newGame({ companyName: 'Gym', industryId: 'fitness', seed: 'LEASE', difficulty: 'hard', equipmentFinance: 'lease' });
    expect(s.ledger.balances.cash).toBe(25_000_00);
    expect(s.ledger.balances.rightOfUse).toBe(40_000_00);
    expect(s.ledger.balances.leaseLiability).toBe(-40_000_00);
    const bs = balanceSheet(s.ledger.balances, 0, leasesCurrentPortion(s.leases));
    expect(bs.difference).toBe(0);
    expect(bs.leaseLiabilitiesCurrent).toBeGreaterThan(0);
    expect(bs.leaseLiabilitiesCurrent + bs.leaseLiabilitiesNonCurrent).toBe(40_000_00);
  });

  it('splits payments into interest (operating) and principal (financing) and runs off to zero', () => {
    const s = newGame({ companyName: 'Gym', industryId: 'fitness', seed: 'LEASE2', difficulty: 'easy', equipmentFinance: 'lease' });
    const lease = s.leases[0];
    tickInPlace(s);
    const r = s.history[0];
    const cf = cashFlowStatement(r.period, r.closing.cash);
    expect(cf.financing.find((l) => l.label === 'Repayment of lease liabilities')!.amount).toBeLessThan(0);
    expect(cf.adjustments.find((l) => l.label === 'Depreciation of right-of-use assets')!.amount).toBe(Math.round(lease.cost / lease.termMonths));
    for (let i = 1; i < lease.termMonths && s.status === 'playing'; i++) {
      if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
      tickInPlace(s);
    }
    if (s.status === 'playing') {
      expect(s.leases).toHaveLength(0);
      expect(s.ledger.balances.leaseLiability).toBe(0);
      expect(s.ledger.balances.rightOfUse).toBe(0);
    }
    expect(s.integrityErrors).toEqual([]);
  });
});

describe('prestige and rebirth', () => {
  it('Legacy points are floor(√(stake ÷ £1m)) and thresholds grow 2.5x', () => {
    expect(legacyFor(12_400_000_00)).toBe(3);
    expect(legacyFor(16_000_000_00)).toBe(4);
    expect(prestigeThreshold(0)).toBe(10_000_000_00);
    expect(prestigeThreshold(1)).toBe(25_000_000_00);
  });

  it('cannot prestige below the threshold or on Hard', () => {
    const s = newGame({ companyName: 'P', industryId: 'software', seed: 'P', difficulty: 'easy' });
    expect(() => applyActionInPlace(s, { type: 'prestige' })).toThrow(ActionError);
    const hard = newGame({ companyName: 'P', industryId: 'software', seed: 'P', difficulty: 'hard' });
    expect(prestigeCheck(hard).reason).toMatch(/Hard/);
  });

  it('a successful software run can prestige, and the profile banks points, gems and perks', () => {
    // Prestige takes years now that the early sprint is valued realistically; play until the stake qualifies.
    const s = playUntil('software', 'PRESTIGE', 240, (g) => prestigeCheck(g).eligible);
    const check = prestigeCheck(s);
    expect(check.eligible).toBe(true);
    const cash = s.ledger.balances.cash;
    const staff = { ...s.staff };
    const month = s.month;
    applyActionInPlace(s, { type: 'prestige' });
    // The company carries on: nothing resets, the rank rises and the next target moves up.
    expect(s.status).toBe('playing');
    expect(s.ledger.balances.cash).toBe(cash);
    expect(s.staff).toEqual(staff);
    expect(s.month).toBe(month);
    expect(s.prestigeLevel).toBe(1);
    expect(prestigeCheck(s).threshold).toBe(prestigeThreshold(1));
    let profile = awardPrestige({ ...newProfile(), rebirthsUsed: 2 }, s.prestigeAward, check.stake);
    expect(profile.legacyPoints).toBe(check.points);
    expect(profile.prestigeCount).toBe(1);
    expect(profile.rebirthsUsed).toBe(0);
    expect(profile.gems).toBe(50 + 25 * check.points);
    profile = buyPerk(profile, 'fin_loans');
    expect(profile.perks.fin_loans).toBe(1);
    expect(() => buyPerk(profile, 'ops_capacity')).toThrow(/Talent network/);
    expect(perkEffects(profile.perks).loanSpreadDelta).toBeCloseTo(-0.003);
    // The replay of a run that prestiged reproduces its score.
    expect(finalScore(replay(toSubmission(s))).score).toBe(finalScore(s).score);
  });

  it('rebirths: unlimited on Easy, 3 per prestige on Medium, none on Hard', () => {
    const bust = (d: 'easy' | 'medium' | 'hard') => {
      const s = newGame({ companyName: 'B', industryId: 'software', seed: 'B', difficulty: d });
      s.status = 'insolvent';
      return s;
    };
    let p = newProfile();
    for (let i = 0; i < 10; i++) p = applyBankruptcy(p, bust('easy'), true);
    expect(rebirthCheck(p, bust('easy')).allowed).toBe(true);
    p = newProfile();
    for (let i = 0; i < 3; i++) p = applyBankruptcy(p, bust('medium'), true);
    expect(rebirthCheck(p, bust('medium')).allowed).toBe(false);
    expect(() => applyBankruptcy(p, bust('medium'), true)).toThrow();
    expect(rebirthCheck(newProfile(), bust('hard')).allowed).toBe(false);
  });
});

describe('replay with phase 2 systems', () => {
  it('reproduces a leased, upgraded, boosted run exactly', () => {
    const s = newGame({
      companyName: 'R', industryId: 'restaurant', seed: 'REPLAY2', difficulty: 'medium', equipmentFinance: 'lease',
      perks: { gro_brand: 2, fin_loans: 1 }, boosts: [{ id: 'megaphone', monthsRemaining: 4 }],
    });
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 2 });
    applyActionInPlace(s, { type: 'setMarketing', amount: 2_000_00 });
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'delivery' });
    applyActionInPlace(s, { type: 'activateBoost', boostId: 'rush' });
    for (let i = 0; i < 30 && s.status === 'playing'; i++) {
      if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
      tickInPlace(s);
    }
    if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
    const r = replay(toSubmission(s));
    expect(r.ledger.balances).toEqual(s.ledger.balances);
    expect(r.integrityErrors).toEqual([]);
  });
});
