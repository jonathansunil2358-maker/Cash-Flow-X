import { gbp } from '../../money';
import type { IndustryConfig } from '../industries';
import type { UpgradeDef } from '../upgrades';

/**
 * Sector: Game studio. Digital copies of a game: no physical stock, a big cut taken by the stores, long waits to be paid,
 * and sales that spike at launch and in the winter sales. Quality (review scores) is everything.
 */
export const config: IndustryConfig = {
  id: 'gamestudio',
  look: 'software',
  icon: 'laptop',
  name: 'Game studio',
  emoji: '🎮',
  tagline: 'Hit-driven, store fees, paid late, quality is everything.',
  difficulty: 'Hard',
  description:
    'Make and sell video games. Copies are digital, so there is no stock to rot, but stores keep about a third of every sale and pay you around two months late. Developers are the big cost, review scores make or break sales, and almost everything is bought in the winter sales.',
  model: 'unit',
  unitSingular: 'copy',
  unitPlural: 'copies',
  basePrice: gbp(22),
  priceElasticity: 1.4,
  unitCost: gbp(6.5),
  annualPrepaidShare: 0,
  baseChurn: 0,
  stockCoverDefault: 0.1,
  spoilage: 0,
  receivableDays: 60,
  payableDays: 30,
  marketSize: 16000,
  marketGrowth: 0.006,
  seasonality: [0.95, 0.9, 0.92, 0.9, 0.93, 1.02, 0.98, 0.95, 0.95, 1.0, 1.3, 1.2],
  roles: {
    ops: { title: 'QA testers & live-ops', salary: gbp(26000), effect: '+650 copies/month of support and server capacity each' },
    rnd: { title: 'Game developers', salary: gbp(44000), effect: 'Improve game quality (review scores and word of mouth)' },
    sales: { title: 'Publishing & PR', salary: gbp(34000), effect: 'Multiply the reach of your marketing' },
  },
  founderCapacity: 500,
  capacityPerOps: 650,
  founderQuality: 1.8,
  qualityPerRnd: 1.0,
  qualityDecay: 0.06,
  startQuality: 32,
  salesReachBoost: 0.3,
  marketingPerBrandPoint: gbp(280),
  rentBase: gbp(2200),
  rentPerHead: gbp(300),
  equipmentPerHire: gbp(2500),
  equipmentLifeMonths: 36,
  recruitmentPct: 0.1,
  startingCapex: { amount: gbp(25000), label: 'Dev kits and engine licence', lifeMonths: 48 },
  automationScale: gbp(120000),
  multiples: { evEbitda: 9, evRevenue: 2.2 },
  targetEbitdaMargin: 0.2,
  capexPctRevenue: 0.04,
  nwcPctRevenue: 0.08,
  competitors: [
    { name: 'Pixelforge', quality: 55, priceFactor: 1.15, strength: 1.1 },
    { name: 'Lootbox Labs', quality: 42, priceFactor: 0.7, strength: 1.4 },
    { name: 'Moonlit Games', quality: 62, priceFactor: 1.4, strength: 0.8 },
  ],
  benchmarks: { grossMargin: 0.68, ebitdaMargin: 0.15, currentRatio: 1.4, receivableDays: 60, inventoryDays: 3 },
};

const U = (
  id: string, name: string, description: string, icon: string, maxLevel: number, baseCostPounds: number,
  perLevel: UpgradeDef['perLevel'], requires?: { id: string; level: number },
): UpgradeDef => ({ id, name, description, icon, maxLevel, baseCost: gbp(baseCostPounds), costGrowth: 1.6, lifeMonths: 60, perLevel, requires });

export const upgrades: UpgradeDef[] = [
  U('engine', 'In-house game engine', '+0.4 game quality a month per level.', 'gear', 5, 14_000, { quality: 0.4 }),
  U('servers', 'Dedicated game servers', '+20% copies of support and server capacity per level.', 'globe', 5, 12_000, { capacity: 0.2 }),
  U('qalab', 'QA test lab', '+0.3 game quality a month per level.', 'shield', 4, 9_000, { quality: 0.3 }, { id: 'engine', level: 1 }),
  U('booth', 'Game-show booth', '+12% reach per level.', 'rocket', 4, 10_000, { reach: 0.12 }),
  U('storefront', 'Own web storefront', 'Store fees 4% lower per level.', 'key', 4, 16_000, { unitCost: -0.04 }, { id: 'servers', level: 1 }),
  U('mocap', 'Motion-capture stage', '+0.5 game quality a month per level.', 'star', 4, 22_000, { quality: 0.5 }, { id: 'engine', level: 2 }),
  U('mobiletool', 'Mobile and console toolkit', '+10% market size per level.', 'laptop', 3, 20_000, { market: 0.1 }, { id: 'engine', level: 1 }),
  U('community', 'Community hub', '+10% reach and +8% market size per level.', 'heart', 3, 15_000, { reach: 0.1, market: 0.08 }, { id: 'booth', level: 1 }),
];
