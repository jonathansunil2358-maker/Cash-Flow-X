import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ActionError, applyActionInPlace, INDUSTRY_IDS, newGame, tickInPlace, type Action, type GameState, type RoleId,
} from '../src/index';

const role = fc.constantFrom<RoleId>('ops', 'rnd', 'sales');
const pounds = (min: number, max: number) => fc.integer({ min, max }).map((p) => p * 100);

/** Arbitrary player actions, many of them invalid on purpose: invalid ones must be rejected cleanly. */
const actionArb: fc.Arbitrary<Action | { type: 'loanRepay' } | { type: 'targetPick'; n: number; buy: boolean }> = fc.oneof(
  fc.record({ type: fc.constant('hire' as const), role, count: fc.integer({ min: 1, max: 6 }) }),
  fc.record({ type: fc.constant('fire' as const), role, count: fc.integer({ min: 1, max: 3 }) }),
  fc.record({ type: fc.constant('setPrice' as const), price: pounds(1, 40000) }),
  fc.record({ type: fc.constant('setMarketing' as const), amount: pounds(0, 40000) }),
  fc.record({ type: fc.constant('setStockCover' as const), months: fc.double({ min: 0, max: 6, noNaN: true }) }),
  fc.record({ type: fc.constant('setCreditTerms' as const), customerDays: fc.integer({ min: 0, max: 120 }), supplierDays: fc.integer({ min: 0, max: 120 }) }),
  fc.record({ type: fc.constant('takeLoan' as const), amount: pounds(1000, 200000), termMonths: fc.integer({ min: 6, max: 90 }) }),
  fc.record({ type: fc.constant('raiseEquity' as const), amount: pounds(10000, 500000) }),
  fc.record({ type: fc.constant('payDividend' as const), amount: pounds(1, 100000) }),
  fc.record({ type: fc.constant('invest' as const), product: fc.constantFrom('deposit' as const, 'fund' as const), amount: pounds(1, 80000) }),
  fc.record({ type: fc.constant('withdraw' as const), product: fc.constantFrom('deposit' as const, 'fund' as const), amount: pounds(1, 80000) }),
  fc.record({ type: fc.constant('buyAutomation' as const), amount: pounds(1000, 100000) }),
  fc.record({ type: fc.constant('buyUpgrade' as const), upgradeId: fc.constantFrom('cloud', 'crm', 'devtools', 'success', 'cutting', 'kitchen', 'equipment', 'robots', 'bay', 'nope') }),
  fc.record({ type: fc.constant('activateBoost' as const), boostId: fc.constantFrom('rush' as const, 'shield' as const, 'megaphone' as const) }),
  fc.constant({ type: 'prestige' as const }),
  fc.constant({ type: 'loanRepay' as const }),
  fc.record({ type: fc.constant('targetPick' as const), n: fc.nat(2), buy: fc.boolean() }),
);

function resolve(s: GameState, a: Action | { type: 'loanRepay' } | { type: 'targetPick'; n: number; buy: boolean }): Action | null {
  if (a.type === 'loanRepay') {
    const l = s.loans[0];
    return l ? { type: 'repayLoan', loanId: l.id, amount: Math.max(1, Math.round(l.principal / 2)) } : null;
  }
  if (a.type === 'targetPick') {
    const t = s.targets[a.n];
    return t ? { type: a.buy ? 'acquire' : 'diligence', targetId: t.id } : null;
  }
  return a;
}

describe('ledger invariants under random play (property-based)', () => {
  it('no sequence of actions and months can unbalance the books', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INDUSTRY_IDS),
        fc.string({ minLength: 1, maxLength: 8 }),
        fc.array(fc.array(actionArb, { maxLength: 4 }), { minLength: 6, maxLength: 30 }),
        fc.constantFrom('easy' as const, 'medium' as const, 'hard' as const),
        fc.constantFrom('buy' as const, 'lease' as const),
        fc.nat(),
        (industryId, seed, months, difficulty, equipmentFinance, pickSeed) => {
          const s = newGame({ companyName: 'Prop', industryId, seed, difficulty, equipmentFinance, perks: { ops_capacity: 1, gro_brand: 2 } });
          for (const monthActions of months) {
            if (s.status !== 'playing') break;
            for (const raw of monthActions) {
              const a = resolve(s, raw);
              if (!a) continue;
              try {
                applyActionInPlace(s, a);
              } catch (e) {
                if (!(e instanceof ActionError)) throw e;
              }
            }
            if (s.status !== 'playing') break;
            if (s.pendingEvent) {
              const choices = s.pendingEvent.choices;
              applyActionInPlace(s, { type: 'resolveEvent', choiceId: choices[pickSeed % choices.length].id });
            }
            tickInPlace(s);
            expect(s.integrityErrors).toEqual([]);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('rejected actions leave the state untouched', () => {
    const s = newGame({ companyName: 'X', industryId: 'software', seed: 'REJECT' });
    const before = JSON.stringify(s);
    expect(() => applyActionInPlace(s, { type: 'payDividend', amount: 5_000_00 })).toThrow(ActionError);
    expect(() => applyActionInPlace(s, { type: 'takeLoan', amount: 10_000_000_00, termMonths: 36 })).toThrow(ActionError);
    expect(() => applyActionInPlace(s, { type: 'setStockCover', months: 2 })).toThrow(ActionError);
    expect(JSON.stringify(s)).toBe(before);
  });
});
