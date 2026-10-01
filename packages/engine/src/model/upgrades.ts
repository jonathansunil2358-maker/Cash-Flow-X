import { gbp, type Pence } from '../money';
import type { IndustryId } from './industries';

/**
 * Sector upgrades: levelled purchases that are capitalised as PP&E (capex) and depreciated.
 * Each level multiplies one lever of the business model. Prestige resets them.
 */
export interface UpgradeEffects {
  capacity?: number;
  market?: number;
  reach?: number;
  quality?: number;
  unitCost?: number;
  churn?: number;
  spoilage?: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseCost: Pence;
  costGrowth: number;
  lifeMonths: number;
  /** Per level: fractional change (+0.2 = +20%) except `quality`, which is points per month. */
  perLevel: UpgradeEffects;
  requires?: { id: string; level: number };
}

const U = (
  id: string, name: string, description: string, icon: string, maxLevel: number, baseCostPounds: number,
  perLevel: UpgradeEffects, requires?: { id: string; level: number },
): UpgradeDef => ({ id, name, description, icon, maxLevel, baseCost: gbp(baseCostPounds), costGrowth: 1.6, lifeMonths: 60, perLevel, requires });

export const UPGRADES: Record<IndustryId, UpgradeDef[]> = {
  software: [
    U('cloud', 'Cloud migration', '+20% customer capacity per level.', 'globe', 5, 12_000, { capacity: 0.2 }),
    U('crm', 'Sales CRM', '+12% reach per level.', 'chart', 5, 9_000, { reach: 0.12 }),
    U('devtools', 'Developer tooling', '+0.4 product quality a month per level.', 'gear', 5, 10_000, { quality: 0.4 }),
    U('success', 'Customer success platform', '8% less churn per level.', 'heart', 4, 8_000, { churn: -0.08 }, { id: 'crm', level: 1 }),
    U('marketplace', 'App marketplace listing', '+10% market size per level.', 'rocket', 3, 25_000, { market: 0.1 }, { id: 'crm', level: 2 }),
  ],
  clothing: [
    U('cutting', 'Cutting machines', '+20% production capacity per level.', 'gear', 5, 10_000, { capacity: 0.2 }),
    U('webshop', 'Online store', '+10% market size per level.', 'globe', 4, 12_000, { market: 0.1 }),
    U('studio', 'Design studio', '+0.4 collection quality a month per level.', 'star', 5, 8_000, { quality: 0.4 }),
    U('supplier', 'Bulk supplier deal', 'Unit costs 4% lower per level.', 'key', 4, 15_000, { unitCost: -0.04 }, { id: 'cutting', level: 1 }),
    U('warehouse', 'Warehouse system', '25% less stock written off per level.', 'parcel', 3, 9_000, { spoilage: -0.25 }, { id: 'webshop', level: 1 }),
  ],
  restaurant: [
    U('kitchen', 'Second kitchen line', '+20% covers per level.', 'flame', 5, 12_000, { capacity: 0.2 }),
    U('delivery', 'Delivery apps', '+12% reach per level.', 'rocket', 4, 6_000, { reach: 0.12 }),
    U('chefs', "Chef's table", '+0.4 food quality a month per level.', 'star', 5, 8_000, { quality: 0.4 }),
    U('fridge', 'Walk-in fridge', '25% less food spoiled per level.', 'diamond', 3, 7_000, { spoilage: -0.25 }, { id: 'kitchen', level: 1 }),
    U('truck', 'Food truck', '+10% market size per level.', 'car', 3, 20_000, { market: 0.1 }, { id: 'delivery', level: 1 }),
  ],
  fitness: [
    U('equipment', 'More equipment', '+20% member capacity per level.', 'dumbbell', 5, 10_000, { capacity: 0.2 }),
    U('classes', 'Group class studio', '+0.4 member experience a month per level.', 'music', 5, 9_000, { quality: 0.4 }),
    U('app', 'Booking app', '8% less churn per level.', 'laptop', 4, 8_000, { churn: -0.08 }),
    U('referral', 'Referral scheme', '+12% reach per level.', 'heart', 4, 6_000, { reach: 0.12 }, { id: 'app', level: 1 }),
    U('pool', 'Swimming pool', '+12% market size per level.', 'globe', 3, 35_000, { market: 0.12 }, { id: 'equipment', level: 2 }),
  ],
  ecommerce: [
    U('robots', 'Warehouse robots', '+20% order capacity per level.', 'gear', 5, 14_000, { capacity: 0.2 }),
    U('channels', 'Marketplace channels', '+10% market size per level.', 'globe', 4, 12_000, { market: 0.1 }),
    U('recs', 'Recommendation engine', '+0.4 site quality a month per level.', 'chart', 5, 10_000, { quality: 0.4 }),
    U('freight', 'Freight contract', 'Unit costs 3% lower per level.', 'parcel', 4, 15_000, { unitCost: -0.03 }, { id: 'robots', level: 1 }),
    U('ads', 'Ad optimisation', '+12% reach per level.', 'bolt', 4, 8_000, { reach: 0.12 }, { id: 'channels', level: 1 }),
  ],
  automotive: [
    U('bay', 'Second workshop bay', '+20% build capacity per level.', 'car', 5, 30_000, { capacity: 0.2 }),
    U('battery', 'Battery partnership', 'Parts costs 4% lower per level.', 'bolt', 4, 40_000, { unitCost: -0.04 }),
    U('lab', 'Engineering lab', '+0.4 conversion quality a month per level.', 'gear', 5, 25_000, { quality: 0.4 }),
    U('dealers', 'Dealer network', '+10% market size per level.', 'key', 3, 35_000, { market: 0.1 }, { id: 'bay', level: 1 }),
    U('showroom', 'Showroom', '+12% reach per level.', 'star', 3, 20_000, { reach: 0.12 }, { id: 'lab', level: 1 }),
  ],
};

export function upgradeCost(def: UpgradeDef, currentLevel: number, costMult = 1): Pence {
  return Math.round((def.baseCost * Math.pow(def.costGrowth, currentLevel) * costMult) / 100) * 100;
}

export interface UpgradeModifiers {
  capacityMult: number;
  marketMult: number;
  reachMult: number;
  qualityPerMonth: number;
  unitCostMult: number;
  churnMult: number;
  spoilageMult: number;
}

export function upgradeModifiers(industryId: IndustryId, levels: Record<string, number>): UpgradeModifiers {
  const m: UpgradeModifiers = { capacityMult: 1, marketMult: 1, reachMult: 1, qualityPerMonth: 0, unitCostMult: 1, churnMult: 1, spoilageMult: 1 };
  for (const def of UPGRADES[industryId]) {
    const n = levels[def.id] ?? 0;
    if (!n) continue;
    const e = def.perLevel;
    if (e.capacity) m.capacityMult *= 1 + e.capacity * n;
    if (e.market) m.marketMult *= 1 + e.market * n;
    if (e.reach) m.reachMult *= 1 + e.reach * n;
    if (e.quality) m.qualityPerMonth += e.quality * n;
    if (e.unitCost) m.unitCostMult *= Math.pow(1 + e.unitCost, n);
    if (e.churn) m.churnMult *= Math.pow(1 + e.churn, n);
    if (e.spoilage) m.spoilageMult *= Math.pow(1 + e.spoilage, n);
  }
  return m;
}
