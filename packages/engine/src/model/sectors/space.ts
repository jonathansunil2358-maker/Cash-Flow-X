import { gbp } from '../../money';
import type { IndustryConfig } from '../industries';
import type { UpgradeDef } from '../upgrades';

/** Sector: Space launch startup. Few, very expensive units (a payload slot on a rocket), government-style slow payment, heavy engineering payroll and a launch pad to pay for. */
export const config: IndustryConfig = {
  id: 'space',
  look: 'software',
  icon: 'rocket',
  name: 'Space launch startup',
  difficulty: 'Hard',
  emoji: '🚀',
  tagline: 'Few huge contracts, slow payers, and rockets that sometimes explode.',
  description:
    'Sell payload slots on small rockets to satellite makers and space agencies. Each slot sells for about £48k and costs ~£32k in fuel, metal and range fees. Customers (often governments) pay on 60-day terms, you have a launch pad to rent, engineers are expensive, and hardware that fails a test is scrapped. Few customers, big lumps of cash.',
  model: 'unit',
  unitSingular: 'payload slot',
  unitPlural: 'payload slots',
  basePrice: gbp(48000),
  priceElasticity: 1.3,
  unitCost: gbp(32200),
  annualPrepaidShare: 0,
  baseChurn: 0,
  stockCoverDefault: 1.5,
  spoilage: 0.02,
  receivableDays: 60,
  payableDays: 45,
  marketSize: 32,
  marketGrowth: 0.008,
  // Launch windows bunch up in spring and autumn; winter weather and holidays slow things.
  seasonality: [0.88, 0.92, 1.05, 1.1, 1.08, 0.98, 0.95, 0.92, 1.05, 1.1, 0.98, 0.99],
  roles: {
    ops: { title: 'Launch & mission-control crew', salary: gbp(42000), effect: '+2 payload slots/month of capacity each' },
    rnd: { title: 'Propulsion engineers', salary: gbp(62000), effect: 'Improve rocket reliability (raises share and customer trust)' },
    sales: { title: 'Contract & agency liaisons', salary: gbp(48000), effect: 'Multiply the reach of your marketing' },
  },
  founderCapacity: 1.2,
  capacityPerOps: 2,
  founderQuality: 1.5,
  qualityPerRnd: 1.0,
  qualityDecay: 0.05,
  startQuality: 30,
  salesReachBoost: 0.3,
  marketingPerBrandPoint: gbp(350),
  rentBase: gbp(8000),
  rentPerHead: gbp(250),
  equipmentPerHire: gbp(4500),
  equipmentLifeMonths: 60,
  recruitmentPct: 0.12,
  startingCapex: { amount: gbp(60000), label: 'Launch pad and test stand', lifeMonths: 96 },
  automationScale: gbp(250000),
  multiples: { evEbitda: 12, evRevenue: 3 },
  targetEbitdaMargin: 0.12,
  capexPctRevenue: 0.06,
  nwcPctRevenue: 0.2,
  competitors: [
    { name: 'Orbital Forge', quality: 56, priceFactor: 1.15, strength: 1.0 },
    { name: 'Kestrel Launch', quality: 46, priceFactor: 0.85, strength: 1.2 },
    { name: 'Polaris Heavy', quality: 62, priceFactor: 1.45, strength: 0.8 },
  ],
  benchmarks: { grossMargin: 0.33, ebitdaMargin: 0.1, currentRatio: 1.5, receivableDays: 60, inventoryDays: 60 },
};

export const upgrades: UpgradeDef[] = [
  { id: 'pad', name: 'Second launch pad', description: '+20% launch capacity per level.', icon: 'rocket', maxLevel: 5, baseCost: gbp(40_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { capacity: 0.2 } },
  { id: 'testbed', name: 'Engine test stand', description: '+0.4 rocket reliability a month per level.', icon: 'gear', maxLevel: 5, baseCost: gbp(30_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { quality: 0.4 } },
  { id: 'groundnet', name: 'Ground-station network', description: '+10% reach per level.', icon: 'globe', maxLevel: 4, baseCost: gbp(20_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { reach: 0.1 }, requires: { id: 'pad', level: 1 } },
  { id: 'reuse', name: 'Reusable boosters', description: 'Materials and fuel cost 4% less per level.', icon: 'bolt', maxLevel: 4, baseCost: gbp(60_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { unitCost: -0.04 }, requires: { id: 'testbed', level: 2 } },
  { id: 'cleanroom', name: 'Clean room and QA', description: '25% less hardware scrapped per level.', icon: 'shield', maxLevel: 3, baseCost: gbp(25_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { spoilage: -0.25 }, requires: { id: 'testbed', level: 1 } },
  { id: 'rideshare', name: 'Rideshare adapter', description: '+10% market size per level.', icon: 'parcel', maxLevel: 3, baseCost: gbp(45_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { market: 0.1 }, requires: { id: 'groundnet', level: 1 } },
  { id: 'guidance', name: 'Precision guidance computer', description: '+0.5 reliability a month and +8% capacity per level.', icon: 'laptop', maxLevel: 4, baseCost: gbp(50_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { quality: 0.5, capacity: 0.08 }, requires: { id: 'testbed', level: 2 } },
  { id: 'agency', name: 'Space-agency framework deal', description: '+12% market size per level.', icon: 'crown', maxLevel: 3, baseCost: gbp(70_000), costGrowth: 1.6, lifeMonths: 60, perLevel: { market: 0.12 }, requires: { id: 'rideshare', level: 1 } },
];
