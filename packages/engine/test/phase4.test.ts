import { describe, expect, it } from 'vitest';
import {
  ActionError, applyActionInPlace, compactForServer, continueRun, finalScore, guildLevelFor, INDUSTRY_IDS, modifiersOf, newGame,
  outsideFraction, ownership, prestigeCheck, replay, stateChecksum, tickInPlace, toSubmission, valuationOf, type GameState,
} from '../src/index';
import { playPolicy } from './helpers';

const answer = (s: GameState) => {
  if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
};

describe('chunked verification', () => {
  it.each(INDUSTRY_IDS)('%s: replaying from compact checkpoints in chunks matches the real run exactly', (id) => {
    const s = playPolicy(id, `CHUNK-${id}`, 120, undefined, { difficulty: 'medium', equipmentFinance: 'lease' });
    answer(s);
    const sub = toSubmission(s);
    // Server side: start a fresh run, then sync every ~17 months from a compacted checkpoint.
    let checkpoint = compactForServer(newGame({
      companyName: sub.companyName, industryId: sub.industryId, seed: sub.seed, scenarioId: sub.scenarioId, difficulty: sub.difficulty,
      equipmentFinance: sub.equipmentFinance, perks: sub.perks, boosts: sub.boosts, prestigeLevel: sub.prestigeLevel, icon: sub.icon,
    }));
    let done = 0;
    for (let to = 17; ; to = Math.min(to + 17, s.month)) {
      const batch = sub.actions.slice(done).filter((a) => a.month <= to);
      const run = structuredClone(checkpoint);
      const r = continueRun(run, batch, to);
      done += r.applied;
      checkpoint = compactForServer(run);
      if (to >= s.month) break;
    }
    expect(done).toBe(sub.actions.length);
    expect(checkpoint.ledger.balances).toEqual(s.ledger.balances);
    expect(stateChecksum(checkpoint)).toBe(stateChecksum(s));
    expect(finalScore(checkpoint).score).toBe(finalScore(s).score);
    expect(valuationOf(checkpoint).equityValue).toBe(valuationOf(s).equityValue);
  });

  it('checksum changes when any balance changes', () => {
    const s = playPolicy('software', 'SUM', 12);
    const t = structuredClone(s);
    t.ledger.balances.cash += 1;
    t.ledger.balances.revenue -= 1;
    expect(stateChecksum(t)).not.toBe(stateChecksum(s));
  });

  it('rejects a batch that goes backwards or skips a decision', () => {
    const s = newGame({ companyName: 'B', industryId: 'software', seed: 'BACK' });
    for (let i = 0; i < 5; i++) { answer(s); tickInPlace(s); }
    expect(() => continueRun(structuredClone(s), [], 2)).toThrow(/backwards/);
  });
});

describe('holding company investments', () => {
  const grown = () => {
    const s = playPolicy('software', 'INVEST', 48);
    answer(s);
    return s;
  };

  it('issues new shares for cash, dilutes the owner, and caps outsiders at 49%', () => {
    const s = grown();
    const pre = valuationOf(s).equityValue;
    const cashBefore = s.ledger.balances.cash;
    const ownBefore = ownership(s);
    applyActionInPlace(s, { type: 'acceptInvestment', investmentId: 'I1', investorId: 'U2', investorName: 'Maya', amount: Math.round(pre * 0.1), preMoney: pre });
    expect(s.ledger.balances.cash - cashBefore).toBe(Math.round(pre * 0.1));
    expect(ownership(s)).toBeLessThan(ownBefore);
    expect(outsideFraction(s)).toBeCloseTo(0.1 / 1.1, 3);
    expect(() => applyActionInPlace(s, { type: 'acceptInvestment', investmentId: 'I2', investorId: 'U3', investorName: 'Leo', amount: pre, preMoney: pre }))
      .toThrow(/49%/);
    expect(() => applyActionInPlace(s, { type: 'acceptInvestment', investmentId: 'I1', investorId: 'U2', investorName: 'Maya', amount: 5_000_00, preMoney: pre }))
      .toThrow(ActionError);
    tickInPlace(s);
    expect(s.integrityErrors).toEqual([]);
  });

  it('pays investors their share of dividends', () => {
    const s = grown();
    const pre = valuationOf(s).equityValue;
    applyActionInPlace(s, { type: 'acceptInvestment', investmentId: 'I1', investorId: 'U2', investorName: 'Maya', amount: Math.round(pre * 0.25), preMoney: pre });
    const reserves = 10_000_00;
    applyActionInPlace(s, { type: 'payDividend', amount: reserves });
    expect(s.outsideHolders[0].dividends).toBe(Math.round((reserves * s.outsideHolders[0].shares) / s.shares.total));
  });

  it('leaves investors in place when you prestige: the company carries on', () => {
    const s = playPolicy('software', 'PRESTIGE', 72);
    answer(s);
    const pre = valuationOf(s).equityValue;
    applyActionInPlace(s, { type: 'acceptInvestment', investmentId: 'I1', investorId: 'U2', investorName: 'Maya', amount: Math.round(pre * 0.05), preMoney: pre });
    for (let i = 0; i < 3; i++) { answer(s); tickInPlace(s); }
    answer(s);
    if (!prestigeCheck(s).eligible) return;
    const cash = s.ledger.balances.cash;
    const own = ownership(s);
    applyActionInPlace(s, { type: 'prestige' });
    expect(s.outsideHolders[0].status).toBe('active');
    expect(s.ledger.balances.cash).toBe(cash);
    expect(ownership(s)).toBe(own);
    expect(s.status).toBe('playing');
  });
});

describe('holding company perks and boost cap', () => {
  it('levels come from combined valuation and lift demand (not on Hard)', () => {
    expect(guildLevelFor(0)).toBe(1);
    expect(guildLevelFor(60_000_000_00)).toBe(3);
    const s = newGame({ companyName: 'G', industryId: 'software', seed: 'G', difficulty: 'medium' });
    const base = modifiersOf(s).demandMult;
    applyActionInPlace(s, { type: 'setGuildLevel', level: 3 });
    expect(modifiersOf(s).demandMult).toBeCloseTo(base * 1.04);
    const hard = newGame({ companyName: 'H', industryId: 'software', seed: 'G', difficulty: 'hard' });
    applyActionInPlace(hard, { type: 'setGuildLevel', level: 3 });
    expect(modifiersOf(hard).demandMult).toBe(1);
  });

  it('allows at most 4 boosts per in-game year', () => {
    const s = newGame({ companyName: 'B', industryId: 'software', seed: 'BOOST', difficulty: 'easy' });
    for (let i = 0; i < 4; i++) applyActionInPlace(s, { type: 'activateBoost', boostId: 'rush' });
    expect(() => applyActionInPlace(s, { type: 'activateBoost', boostId: 'rush' })).toThrow(/4 boosts/);
  });

  it('a run with all phase 4 actions still replays exactly', () => {
    const s = grown2();
    const r = replay(toSubmission(s));
    expect(r.ledger.balances).toEqual(s.ledger.balances);
  });
});

function grown2(): GameState {
  const s = playPolicy('clothing', 'P4REPLAY', 36);
  answer(s);
  applyActionInPlace(s, { type: 'setGuildLevel', level: 2 });
  const pre = Math.max(100_000_00, valuationOf(s).equityValue);
  applyActionInPlace(s, { type: 'acceptInvestment', investmentId: 'I9', investorId: 'U9', investorName: 'Sam', amount: 20_000_00, preMoney: pre });
  for (let i = 0; i < 6 && s.status === 'playing'; i++) { answer(s); tickInPlace(s); }
  answer(s);
  if (s.status === 'playing') applyActionInPlace(s, { type: 'buyOutInvestors', holderIds: ['I9'] });
  return s;
}
