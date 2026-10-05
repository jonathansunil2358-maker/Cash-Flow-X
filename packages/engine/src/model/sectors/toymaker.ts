import { gbp } from '../../money';
import type { IndustryConfig } from '../industries';
import type { UpgradeDef } from '../upgrades';

/** Sector: Toy maker. Seasonal, retailer-credit, hit-driven business with safety rules. */
export const config: IndustryConfig = {
  id: 'toymaker',
  look: 'clothing',
  icon: 'star',
  name: 'Toy maker',
  emoji: '🧸',
  tagline: 'One huge Christmas, slow retailers, hits and flops.',
  difficulty: 'Challenging',
  description:
    'Design and make toys sold mostly through shops on 60-day payment terms. Half your year\'s sales land between September and November, so you build stock in the summer and wait for the cash. A craze can sell out overnight, a flop sits in the warehouse, and every toy must pass child-safety testing.',
  model: 'unit',
  unitSingular: 'toy',
  unitPlural: 'toys',
  basePrice: gbp(34),
  priceElasticity: 1.3,
  unitCost: gbp(14),
  annualPrepaidShare: 0,
  baseChurn: 0,
  stockCoverDefault: 1.3,
  spoilage: 0.015,
  receivableDays: 45,
  payableDays: 45,
  marketSize: 14500,
  marketGrowth: 0.004,
  seasonality: [0.88, 0.88, 0.92, 0.92, 0.92, 0.95, 0.97, 1.04, 1.14, 1.18, 1.14, 1.06],
  roles: {
    ops: { title: 'Factory & packing staff', salary: gbp(25000), effect: '+520 toys/month of capacity each' },
    rnd: { title: 'Toy designers', salary: gbp(36000), effect: 'Improve play value, safety and reviews' },
    sales: { title: 'Retail buyers\' reps', salary: gbp(34000), effect: 'Multiply the reach of your marketing' },
  },
  founderCapacity: 300,
  capacityPerOps: 520,
  founderQuality: 1.5,
  qualityPerRnd: 1.0,
  qualityDecay: 0.05,
  startQuality: 30,
  salesReachBoost: 0.3,
  marketingPerBrandPoint: gbp(220),
  rentBase: gbp(2200),
  rentPerHead: gbp(250),
  equipmentPerHire: gbp(1800),
  equipmentLifeMonths: 60,
  recruitmentPct: 0.08,
  startingCapex: { amount: gbp(15000), label: 'Moulds and tooling', lifeMonths: 60 },
  automationScale: gbp(120000),
  multiples: { evEbitda: 8, evRevenue: 1.1 },
  targetEbitdaMargin: 0.14,
  capexPctRevenue: 0.04,
  nwcPctRevenue: 0.2,
  competitors: [
    { name: 'BrightBrick Toys', quality: 52, priceFactor: 1.15, strength: 1.2 },
    { name: 'Wobbly Oak', quality: 62, priceFactor: 1.4, strength: 0.8 },
    { name: 'ZapZoo', quality: 40, priceFactor: 0.7, strength: 1.3 },
  ],
  benchmarks: { grossMargin: 0.5, ebitdaMargin: 0.12, currentRatio: 1.7, receivableDays: 45, inventoryDays: 90 },
};

const U = (
  id: string, name: string, description: string, icon: string, maxLevel: number, baseCostPounds: number,
  perLevel: UpgradeDef['perLevel'], requires?: { id: string; level: number },
): UpgradeDef => ({ id, name, description, icon, maxLevel, baseCost: gbp(baseCostPounds), costGrowth: 1.6, lifeMonths: 60, perLevel, requires });

export const upgrades: UpgradeDef[] = [
  U('moulding', 'Injection-moulding press', '+20% production capacity per level.', 'gear', 5, 11_000, { capacity: 0.2 }),
  U('playlab', 'Play-testing lab', '+0.4 play value and safety quality a month per level.', 'star', 5, 8_000, { quality: 0.4 }),
  U('fair', 'Toy-fair stand', '+12% reach per level.', 'rocket', 4, 9_000, { reach: 0.12 }),
  U('warehouse', 'Peak-season warehouse', '25% less stock written off per level.', 'parcel', 3, 9_000, { spoilage: -0.25 }, { id: 'moulding', level: 1 }),
  U('overseas', 'Overseas factory partner', 'Unit costs 4% lower per level.', 'globe', 4, 15_000, { unitCost: -0.04 }, { id: 'moulding', level: 1 }),
  U('wood', 'Sustainable wood workshop', '+0.5 play value and safety quality a month per level.', 'leaf', 4, 13_000, { quality: 0.5 }, { id: 'playlab', level: 2 }),
  U('retail', 'Retail chain listings', '+12% market size per level.', 'key', 3, 27_000, { market: 0.12 }, { id: 'fair', level: 2 }),
  U('app', 'Companion app and collector club', '+10% market size and +5% reach per level.', 'laptop', 3, 22_000, { market: 0.1, reach: 0.05 }, { id: 'fair', level: 1 }),
];
