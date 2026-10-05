import { gbp, type Pence } from '../money';
import type { CoreIndustryId, IndustryId } from './industries';
import { EXTRA_META, EXTRA_MODULES } from './sectors';

/**
 * Sector upgrades: levelled purchases that are capitalised as PP&E (capex) and depreciated.
 * Each level multiplies one lever of the business model. They never run out: past the old top level each extra level is dearer and adds less.
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

const CORE_UPGRADES: Record<CoreIndustryId, UpgradeDef[]> = {
  software: [
    U('cloud', 'Cloud migration', '+20% customer capacity per level.', 'globe', 5, 12_000, { capacity: 0.2 }),
    U('crm', 'Sales CRM', '+12% reach per level.', 'chart', 5, 9_000, { reach: 0.12 }),
    U('devtools', 'Developer tooling', '+0.4 product quality a month per level.', 'gear', 5, 10_000, { quality: 0.4 }),
    U('success', 'Customer success platform', '8% less churn per level.', 'heart', 4, 8_000, { churn: -0.08 }, { id: 'crm', level: 1 }),
    U('marketplace', 'App marketplace listing', '+10% market size per level.', 'rocket', 3, 25_000, { market: 0.1 }, { id: 'crm', level: 2 }),
    U('ai', 'AI assistant', '+0.5 product quality a month per level.', 'bolt', 4, 30_000, { quality: 0.5 }, { id: 'devtools', level: 2 }),
    U('sre', 'Reliability engineering', '+10% customer capacity and 6% less churn per level.', 'shield', 4, 18_000, { capacity: 0.1, churn: -0.06 }, { id: 'cloud', level: 2 }),
    U('enterprise', 'Enterprise sales team', '+12% market size per level.', 'crown', 3, 40_000, { market: 0.12 }, { id: 'crm', level: 3 }),
  ],
  clothing: [
    U('cutting', 'Cutting machines', '+20% production capacity per level.', 'gear', 5, 10_000, { capacity: 0.2 }),
    U('webshop', 'Online store', '+10% market size per level.', 'globe', 4, 12_000, { market: 0.1 }),
    U('studio', 'Design studio', '+0.4 collection quality a month per level.', 'star', 5, 8_000, { quality: 0.4 }),
    U('supplier', 'Bulk supplier deal', 'Unit costs 4% lower per level.', 'key', 4, 15_000, { unitCost: -0.04 }, { id: 'cutting', level: 1 }),
    U('warehouse', 'Warehouse system', '25% less stock written off per level.', 'parcel', 3, 9_000, { spoilage: -0.25 }, { id: 'webshop', level: 1 }),
    U('sustain', 'Sustainable fabrics', '+0.5 collection quality a month per level.', 'leaf', 4, 14_000, { quality: 0.5 }, { id: 'studio', level: 2 }),
    U('automation', 'Automated sewing line', '+15% production capacity and unit costs 2% lower per level.', 'bolt', 4, 24_000, { capacity: 0.15, unitCost: -0.02 }, { id: 'cutting', level: 2 }),
    U('wholesale', 'Wholesale accounts', '+12% market size per level.', 'tshirt', 3, 28_000, { market: 0.12 }, { id: 'webshop', level: 2 }),
  ],
  restaurant: [
    U('kitchen', 'Second kitchen line', '+20% covers per level.', 'flame', 5, 12_000, { capacity: 0.2 }),
    U('delivery', 'Delivery apps', '+12% reach per level.', 'rocket', 4, 6_000, { reach: 0.12 }),
    U('chefs', "Chef's table", '+0.4 food quality a month per level.', 'star', 5, 8_000, { quality: 0.4 }),
    U('fridge', 'Walk-in fridge', '25% less food spoiled per level.', 'diamond', 3, 7_000, { spoilage: -0.25 }, { id: 'kitchen', level: 1 }),
    U('truck', 'Food truck', '+10% market size per level.', 'car', 3, 20_000, { market: 0.1 }, { id: 'delivery', level: 1 }),
    U('loyalty', 'Loyalty card', '+10% reach per level.', 'heart', 4, 7_000, { reach: 0.1 }, { id: 'delivery', level: 2 }),
    U('local', 'Local suppliers', 'Unit costs 3% lower and 15% less food spoiled per level.', 'leaf', 4, 12_000, { unitCost: -0.03, spoilage: -0.15 }, { id: 'fridge', level: 1 }),
    U('catering', 'Catering contracts', '+12% market size per level.', 'coffee', 3, 26_000, { market: 0.12 }, { id: 'truck', level: 1 }),
  ],
  fitness: [
    U('equipment', 'More equipment', '+20% member capacity per level.', 'dumbbell', 5, 10_000, { capacity: 0.2 }),
    U('classes', 'Group class studio', '+0.4 member experience a month per level.', 'music', 5, 9_000, { quality: 0.4 }),
    U('app', 'Booking app', '8% less churn per level.', 'laptop', 4, 8_000, { churn: -0.08 }),
    U('referral', 'Referral scheme', '+12% reach per level.', 'heart', 4, 6_000, { reach: 0.12 }, { id: 'app', level: 1 }),
    U('pool', 'Swimming pool', '+12% market size per level.', 'globe', 3, 35_000, { market: 0.12 }, { id: 'equipment', level: 2 }),
    U('trainers', 'Personal training', '+0.5 member experience a month per level.', 'star', 4, 14_000, { quality: 0.5 }, { id: 'classes', level: 2 }),
    U('community', 'Community events', '+10% reach and 5% less churn per level.', 'flame', 4, 9_000, { reach: 0.1, churn: -0.05 }, { id: 'referral', level: 1 }),
    U('spa', 'Spa and sauna', '+10% market size per level.', 'diamond', 3, 32_000, { market: 0.1 }, { id: 'pool', level: 1 }),
  ],
  ecommerce: [
    U('robots', 'Warehouse robots', '+20% order capacity per level.', 'gear', 5, 14_000, { capacity: 0.2 }),
    U('channels', 'Marketplace channels', '+10% market size per level.', 'globe', 4, 12_000, { market: 0.1 }),
    U('recs', 'Recommendation engine', '+0.4 site quality a month per level.', 'chart', 5, 10_000, { quality: 0.4 }),
    U('freight', 'Freight contract', 'Unit costs 3% lower per level.', 'parcel', 4, 15_000, { unitCost: -0.03 }, { id: 'robots', level: 1 }),
    U('ads', 'Ad optimisation', '+12% reach per level.', 'bolt', 4, 8_000, { reach: 0.12 }, { id: 'channels', level: 1 }),
    U('sameday', 'Same-day fulfilment', '+12% order capacity and +0.2 site quality a month per level.', 'rocket', 4, 20_000, { capacity: 0.12, quality: 0.2 }, { id: 'robots', level: 2 }),
    U('dropship', 'Dropship partners', 'Unit costs 3% lower per level.', 'key', 4, 18_000, { unitCost: -0.03 }, { id: 'freight', level: 1 }),
    U('subscribe', 'Subscribe and save', '+10% market size and +5% reach per level.', 'star', 3, 24_000, { market: 0.1, reach: 0.05 }, { id: 'channels', level: 2 }),
  ],
  automotive: [
    U('bay', 'Second workshop bay', '+20% build capacity per level.', 'car', 5, 30_000, { capacity: 0.2 }),
    U('battery', 'Battery partnership', 'Parts costs 4% lower per level.', 'bolt', 4, 40_000, { unitCost: -0.04 }),
    U('lab', 'Engineering lab', '+0.4 conversion quality a month per level.', 'gear', 5, 25_000, { quality: 0.4 }),
    U('dealers', 'Dealer network', '+10% market size per level.', 'key', 3, 35_000, { market: 0.1 }, { id: 'bay', level: 1 }),
    U('showroom', 'Showroom', '+12% reach per level.', 'star', 3, 20_000, { reach: 0.12 }, { id: 'lab', level: 1 }),
    U('paint', 'Custom paint shop', '+0.4 conversion quality a month per level.', 'diamond', 4, 18_000, { quality: 0.4 }, { id: 'lab', level: 1 }),
    U('tooling', 'Precision tooling', '+12% build capacity and parts costs 3% lower per level.', 'gear', 4, 35_000, { capacity: 0.12, unitCost: -0.03 }, { id: 'bay', level: 2 }),
    U('fleet', 'Fleet contracts', '+12% market size per level.', 'parcel', 3, 45_000, { market: 0.12 }, { id: 'dealers', level: 1 }),
  ],
};

/** Sectors added later use their own upgrades if they have written them, otherwise those of the sector they look like. */
export const UPGRADES: Record<IndustryId, UpgradeDef[]> = {
  ...CORE_UPGRADES,
  ...(Object.fromEntries(EXTRA_META.map((m) => [m.id, EXTRA_MODULES[m.id].upgrades ?? CORE_UPGRADES[m.look]])) as Record<IndustryId, UpgradeDef[]>),
};

/** Levels never run out, but there is a ceiling so numbers stay sane. */
export const UPGRADE_CEILING = 40;
/** Cost growth per level beyond the old top level: steeper, so each extra level really costs more. */
export const BEYOND_COST_GROWTH = 2.0;
/** Each level beyond the old top level adds this share of the one before it. */
export const BEYOND_EFFECT_DECAY = 0.7;
/** Annual revenue at which upgrades start costing more than their list price. */
export const INCOME_SCALE_REFERENCE: Pence = gbp(500_000);
export const INCOME_SCALE_EXPONENT = 0.6;

/** Upgrades cost more as the business earns more: x1 up to £500k a year of revenue, then (revenue / £500k)^0.6. */
export const incomeScale = (annualRevenue: Pence): number =>
  Math.max(1, Math.pow(Math.max(0, annualRevenue) / INCOME_SCALE_REFERENCE, INCOME_SCALE_EXPONENT));

/** The levels that count for effects: full strength up to the old top level, then fading returns. */
export function effectiveLevels(level: number, maxLevel: number): number {
  if (level <= maxLevel) return level;
  let extra = 0;
  for (let k = 1; k <= level - maxLevel; k++) extra += Math.pow(BEYOND_EFFECT_DECAY, k);
  return maxLevel + extra;
}

export function upgradeCost(def: UpgradeDef, currentLevel: number, costMult = 1, scale = 1): Pence {
  const base = def.baseCost * Math.pow(def.costGrowth, Math.min(currentLevel, def.maxLevel))
    * Math.pow(BEYOND_COST_GROWTH, Math.max(0, currentLevel - def.maxLevel));
  return Math.round((base * costMult * scale) / 100) * 100;
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
    const raw = levels[def.id] ?? 0;
    if (!raw) continue;
    const n = effectiveLevels(raw, def.maxLevel);
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
