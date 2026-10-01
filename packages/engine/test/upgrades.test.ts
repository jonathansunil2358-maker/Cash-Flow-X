import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, effectiveLevels, incomeScale, modifiersOf, newGame, UPGRADES, upgradeCost, upgradeModifiers, upgradeOptions, type IndustryId,
} from '../src/index';

const INDUSTRY_IDS = Object.keys(UPGRADES) as IndustryId[];

describe('upgrade catalogue', () => {
  it('has eight upgrades per industry with unique ids', () => {
    for (const id of INDUSTRY_IDS) {
      const ids = UPGRADES[id].map((u) => u.id);
      expect(ids.length, id).toBe(8);
      expect(new Set(ids).size, id).toBe(ids.length);
    }
  });

  it('only requires upgrades that exist in the same industry, at reachable levels, with no cycles', () => {
    for (const id of INDUSTRY_IDS) {
      const byId = new Map(UPGRADES[id].map((u) => [u.id, u]));
      for (const u of UPGRADES[id]) {
        const seen = new Set([u.id]);
        let cur = u;
        while (cur.requires) {
          const req = byId.get(cur.requires.id);
          expect(req, `${id}/${cur.id} requires unknown ${cur.requires.id}`).toBeDefined();
          expect(cur.requires.level, `${id}/${cur.id}`).toBeLessThanOrEqual(req!.maxLevel);
          expect(seen.has(req!.id), `${id}/${u.id} has a requirement cycle`).toBe(false);
          seen.add(req!.id);
          cur = req!;
        }
      }
    }
  });

  it('gives every upgrade a real effect on the business', () => {
    for (const id of INDUSTRY_IDS) {
      for (const u of UPGRADES[id]) {
        const m = upgradeModifiers(id, { [u.id]: 1 });
        const neutral = upgradeModifiers(id, {});
        expect(m, `${id}/${u.id}`).not.toEqual(neutral);
      }
    }
  });

  it('only uses levers that matter for the industry model (churn needs subscriptions)', () => {
    for (const id of ['clothing', 'restaurant', 'ecommerce', 'automotive'] as const) {
      for (const u of UPGRADES[id]) expect(u.perLevel.churn, `${id}/${u.id}`).toBeUndefined();
    }
  });
});

describe('new upgrades in play', () => {
  it('Reliability engineering stacks capacity and lower churn, after Cloud migration level 2', () => {
    const s = newGame({ companyName: 'U', industryId: 'software', seed: 'UPG8', difficulty: 'easy' });
    expect(() => applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'sre' })).toThrow(/Needs Cloud migration level 2/);
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'cloud' });
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'cloud' });
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'sre' });
    expect(s.upgrades.sre).toBe(1);
    expect(modifiersOf(s).capacityMult).toBeCloseTo(1.4 * 1.1);
    expect(modifiersOf(s).churnMult).toBeCloseTo(0.94);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('Enterprise sales team needs Sales CRM level 3', () => {
    const s = newGame({ companyName: 'U', industryId: 'software', seed: 'UPG9', difficulty: 'easy' });
    expect(() => applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'enterprise' })).toThrow(/Needs Sales CRM level 3/);
  });

  it('Local suppliers lowers both unit cost and spoilage in a restaurant', () => {
    const s = newGame({ companyName: 'R', industryId: 'restaurant', seed: 'UPG10', difficulty: 'easy' });
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'kitchen' });
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'fridge' });
    const before = modifiersOf(s);
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'local' });
    const after = modifiersOf(s);
    expect(after.unitCostMult).toBeLessThan(before.unitCostMult);
    expect(after.spoilageMult).toBeLessThan(before.spoilageMult);
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('income-scaled, uncapped upgrades', () => {
  it('cost the list price for a small business and more as income grows', () => {
    expect(incomeScale(0)).toBe(1);
    expect(incomeScale(400_000_00)).toBe(1);
    expect(incomeScale(5_000_000_00)).toBeCloseTo(Math.pow(10, 0.6), 5);
    expect(incomeScale(50_000_000_00)).toBeGreaterThan(incomeScale(5_000_000_00) * 3);
    const def = UPGRADES.software[0];
    expect(upgradeCost(def, 0, 1, incomeScale(0))).toBe(upgradeCost(def, 0));
    expect(upgradeCost(def, 0, 1, 3)).toBe(Math.round((def.baseCost * 3) / 100) * 100);
  });

  it('keep getting dearer past the old top level, and add less each time', () => {
    const def = UPGRADES.software[0];
    const top = def.maxLevel;
    expect(upgradeCost(def, top)).toBeGreaterThan(upgradeCost(def, top - 1) * 1.5);
    expect(upgradeCost(def, top + 1)).toBeGreaterThan(upgradeCost(def, top) * 1.9);
    expect(effectiveLevels(top, top)).toBe(top);
    const gain = (n: number) => effectiveLevels(n + 1, top) - effectiveLevels(n, top);
    expect(gain(top)).toBeCloseTo(0.7);
    expect(gain(top + 1)).toBeLessThan(gain(top));
    expect(effectiveLevels(top + 30, top)).toBeLessThan(top + 2.4);
  });

  it('can be bought beyond the old top level, with the cost rising with the company\'s income', () => {
    const s = newGame({ companyName: 'U', industryId: 'software', seed: 'UPG', difficulty: 'easy' });
    s.ledger.balances.cash += 5_000_000_00;
    s.ledger.balances.shareCapital -= 5_000_000_00;
    s.upgrades.cloud = UPGRADES.software[0].maxLevel;
    const before = upgradeOptions(s).find((o) => o.def.id === 'cloud')!;
    expect(before.maxed).toBe(false);
    expect(before.scale).toBe(1);
    applyActionInPlace(s, { type: 'buyUpgrade', upgradeId: 'cloud' });
    expect(s.upgrades.cloud).toBe(UPGRADES.software[0].maxLevel + 1);
    expect(upgradeModifiers('software', s.upgrades).capacityMult).toBeGreaterThan(upgradeModifiers('software', { cloud: 5 }).capacityMult);
  });
});
