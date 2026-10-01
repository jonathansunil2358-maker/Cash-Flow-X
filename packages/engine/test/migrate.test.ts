import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, continueRun, migrateState, modifiersOf, stateChecksum, STATE_VERSION, tickInPlace, trialBalanceTotal,
  type Action, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

/** Real games saved by the previous version of the engine (state version 3). */
const fixture = (name: string): Record<string, any> => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const FIXTURES = ['state-v3-software', 'state-v3-restaurant'];

const answer = (s: GameState) => {
  if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
};

describe('upgrading saved games', () => {
  it('starts from genuine version 3 games', () => {
    for (const f of FIXTURES) {
      const raw = fixture(f);
      expect(raw.version).toBe(3);
      expect(raw.pay).toBeUndefined();
      expect(raw.ledger.balances.research).toBeUndefined();
    }
  });

  it('adds every new field with neutral defaults and keeps the books balanced', () => {
    for (const f of FIXTURES) {
      const before = fixture(f);
      const s = migrateState(fixture(f))!;
      expect(s.version).toBe(STATE_VERSION);
      expect(s.pay).toBe('market');
      expect(s.morale).toBe(60);
      expect(s.trainingSpend).toBe(0);
      expect(s.promo).toBeNull();
      expect(s.projects).toEqual([]);
      expect(s.projectsDone).toEqual([]);
      expect(s.ledger.balances.research).toBe(0);
      for (const h of s.history) expect(h.closing.research).toBe(0);
      for (const c of s.competitors) {
        expect(c.cutMonths).toBe(0);
        expect(c.normalPrice).toBe(c.price);
        expect(c.lastLaunchYear).toBe(-1);
      }
      // Nothing the player earned or owned changes.
      expect(s.month).toBe(before.month);
      expect(s.ledger.balances.cash).toBe(before.ledger.balances.cash);
      expect(s.upgrades).toEqual(before.upgrades);
      expect(s.staff).toEqual(before.staff);
      expect(trialBalanceTotal(s.ledger.balances)).toBe(0);
      expect(checkIntegrity(s)).toEqual([]);
    }
  });

  it('carries on playing under the new rules for years without a glitch', () => {
    for (const f of FIXTURES) {
      const s = migrateState(fixture(f))!;
      const month = s.month;
      for (let i = 0; i < 36 && s.status === 'playing'; i++) {
        answer(s);
        applyPolicy(s);
        answer(s);
        tickInPlace(s);
      }
      expect(s.month).toBeGreaterThan(month);
      expect(checkIntegrity(s)).toEqual([]);
      expect(Object.values(s.ledger.balances).every((v) => Number.isFinite(v))).toBe(true);
      expect(Number.isFinite(s.morale) && s.morale >= 0 && s.morale <= 100).toBe(true);
      expect(modifiersOf(s).demandMult).toBeGreaterThan(0);
    }
  });

  it('gives the new features to an old game: seasons, promotions, morale and R&D all work', () => {
    const s = migrateState(fixture('state-v3-software'))!;
    answer(s);
    applyActionInPlace(s, { type: 'startPromo', discountPct: 10, months: 1 });
    applyActionInPlace(s, { type: 'setPay', level: 'above' });
    applyActionInPlace(s, { type: 'setTraining', amount: 50_000 });
    applyActionInPlace(s, { type: 'hire', role: 'rnd', count: 3 });
    applyActionInPlace(s, { type: 'startProject', projectId: 'qualityLeap' });
    for (let i = 0; i < 6; i++) { answer(s); tickInPlace(s); }
    expect(s.morale).toBeGreaterThan(60);
    expect(s.promo).toBeNull();
    expect(s.projects.length + s.projectsDone.length).toBe(1);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('gives the same result for the full state and the server\'s compact copy, so both sides agree', () => {
    for (const f of FIXTURES) {
      const full = migrateState(fixture(f))!;
      const compact = migrateState(fixture(`${f}.compact`))!;
      expect(stateChecksum(full)).toBe(stateChecksum(compact));
    }
  });

  it('lets the server verify what the player does next: a fully synced old game continues in step', () => {
    for (const f of FIXTURES) {
      const client = migrateState(fixture(f))!;
      const server = migrateState(fixture(`${f}.compact`))!;
      const synced = client.actionLog.length;
      for (let i = 0; i < 8 && client.status === 'playing'; i++) {
        answer(client);
        applyPolicy(client);
        applyActionInPlace(client, { type: 'setPay', level: i % 2 ? 'above' : 'market' });
        answer(client);
        tickInPlace(client);
      }
      answer(client);
      const newActions = client.actionLog.slice(synced) as { month: number; action: Action }[];
      continueRun(server, newActions, client.month);
      expect(stateChecksum(server)).toBe(stateChecksum(client));
    }
  });

  it('is idempotent, leaves current games untouched, and refuses what it cannot read', () => {
    const once = migrateState(fixture('state-v3-software'))!;
    const twice = migrateState(structuredClone(once))!;
    expect(twice).toEqual(once);
    const current = once;
    expect(migrateState(current)).toBe(current);
    for (const bad of [null, undefined, 'x', 7, [], {}, { version: 99 }, { version: 2 }, { version: 1 }]) expect(migrateState(bad)).toBeNull();
  });
});
