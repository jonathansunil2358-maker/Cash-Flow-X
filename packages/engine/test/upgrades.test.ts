import { describe, expect, it } from 'vitest';
import { applyActionInPlace, checkIntegrity, modifiersOf, newGame, UPGRADES, upgradeModifiers, type IndustryId } from '../src/index';

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
