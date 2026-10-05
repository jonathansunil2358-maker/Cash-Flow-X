import { gbp } from '../../money';
import type { IndustryConfig } from '../industries';
import type { UpgradeDef } from '../upgrades';

/** Sector: Construction firm. Thin margins, slow-paying clients, stage payments and retention money, strong seasons. */
export const config: IndustryConfig = {
  id: 'construction',
  look: 'automotive',
  icon: 'gear',
  name: 'Construction firm',
  emoji: '🏗️',
  tagline: 'Thin margins, slow payers, and the weather has a vote.',
  difficulty: 'Hard',
  description:
    'Win and build home extensions, refurbishments and small commercial jobs at about £10k each. Materials and subcontractors eat ~72% of the price, clients pay on 60-day terms (and hold back retention money), while suppliers want paying in 45. Winters are quiet, summers are packed, and one bad job can wipe out several good ones.',
  model: 'unit',
  unitSingular: 'job',
  unitPlural: 'jobs',
  basePrice: gbp(10000),
  priceElasticity: 1.7,
  unitCost: gbp(7200),
  annualPrepaidShare: 0,
  baseChurn: 0,
  stockCoverDefault: 0.5,
  spoilage: 0.012,
  receivableDays: 45,
  payableDays: 50,
  marketSize: 150,
  marketGrowth: 0.005,
  seasonality: [0.86, 0.9, 0.98, 1.03, 1.06, 1.08, 1.07, 1.05, 1.04, 1.02, 0.97, 0.94],
  roles: {
    ops: { title: 'Site crews (bricklayers, carpenters)', salary: gbp(32000), effect: '+4 jobs/month of capacity each' },
    rnd: { title: 'Site managers and surveyors', salary: gbp(46000), effect: 'Improve build quality and finish on time' },
    sales: { title: 'Estimators and bid managers', salary: gbp(40000), effect: 'Multiply the reach of your marketing (more bids won)' },
  },
  founderCapacity: 1.5,
  capacityPerOps: 4.0,
  founderQuality: 1.4,
  qualityPerRnd: 1.0,
  qualityDecay: 0.05,
  startQuality: 32,
  salesReachBoost: 0.3,
  marketingPerBrandPoint: gbp(300),
  rentBase: gbp(2500),
  rentPerHead: gbp(120),
  equipmentPerHire: gbp(3000),
  equipmentLifeMonths: 48,
  recruitmentPct: 0.08,
  startingCapex: { amount: gbp(30000), label: 'Vans, scaffolding & power tools', lifeMonths: 72 },
  automationScale: gbp(180000),
  multiples: { evEbitda: 5.5, evRevenue: 0.5 },
  targetEbitdaMargin: 0.08,
  capexPctRevenue: 0.03,
  nwcPctRevenue: 0.12,
  competitors: [
    { name: 'Brickwell & Sons', quality: 50, priceFactor: 1.0, strength: 1.1 },
    { name: 'CheapCrane Builders', quality: 40, priceFactor: 0.8, strength: 1.3 },
    { name: 'Keystone Projects', quality: 62, priceFactor: 1.3, strength: 0.8 },
  ],
  benchmarks: { grossMargin: 0.25, ebitdaMargin: 0.06, currentRatio: 1.3, receivableDays: 45, inventoryDays: 15 },
};

const U = (
  id: string, name: string, description: string, icon: string, maxLevel: number, baseCostPounds: number,
  perLevel: UpgradeDef['perLevel'], requires?: UpgradeDef['requires'],
): UpgradeDef => ({ id, name, description, icon, maxLevel, baseCost: gbp(baseCostPounds), costGrowth: 1.6, lifeMonths: 60, perLevel, requires });

export const upgrades: UpgradeDef[] = [
  U('plant', 'Owned plant and diggers', '+20% build capacity per level.', 'gear', 5, 28_000, { capacity: 0.2 }),
  U('estimating', 'Estimating software', '+12% reach per level (more accurate bids win more work).', 'laptop', 4, 9_000, { reach: 0.12 }),
  U('qa', 'Quality inspection regime', '+0.4 build quality a month per level.', 'shield', 5, 12_000, { quality: 0.4 }),
  U('yard', 'Materials yard and buying club', 'Materials costs 3% lower per level.', 'parcel', 4, 22_000, { unitCost: -0.03 }, { id: 'plant', level: 1 }),
  U('prefab', 'Prefab factory', '+12% build capacity and materials 2% lower per level.', 'bolt', 4, 40_000, { capacity: 0.12, unitCost: -0.02 }, { id: 'yard', level: 1 }),
  U('tender', 'Public tender team', '+10% market size per level.', 'crown', 3, 30_000, { market: 0.1 }, { id: 'estimating', level: 2 }),
  U('green', 'Green-building certification', '+0.5 build quality a month per level.', 'leaf', 4, 20_000, { quality: 0.5 }, { id: 'qa', level: 2 }),
  U('developer', 'Property developer partner', '+12% market size per level.', 'key', 3, 45_000, { market: 0.12 }, { id: 'tender', level: 1 }),
];
