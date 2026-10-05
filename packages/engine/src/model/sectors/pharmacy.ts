import { gbp } from '../../money';
import type { IndustryConfig } from '../industries';
import type { UpgradeDef } from '../upgrades';

/** Sector: Pharmacy. Dispensing is high volume and low margin; stock is expensive, expires, and is bought on wholesaler credit. */
export const config: IndustryConfig = {
  id: 'pharmacy',
  look: 'ecommerce',
  icon: 'heart',
  name: 'Pharmacy',
  emoji: '💊',
  tagline: 'Steady demand, thin margins, strict rules, expiring stock.',
  difficulty: 'Challenging',
  description:
    'Run a community pharmacy. Most income is dispensing fees and medicine reimbursements from the health system, paid about 30 days in arrears, while the wholesaler wants paying in 45. Gross margin is only ~35%, medicines expire on the shelf, winter is the busy season, and a pharmacist must always be on duty.',
  model: 'unit',
  unitSingular: 'item',
  unitPlural: 'items',
  basePrice: gbp(14),
  priceElasticity: 1.0,
  unitCost: gbp(8.8),
  annualPrepaidShare: 0,
  baseChurn: 0,
  stockCoverDefault: 1,
  spoilage: 0.03,
  receivableDays: 30,
  payableDays: 45,
  marketSize: 26000,
  marketGrowth: 0.005,
  seasonality: [1.1, 1.05, 1.0, 0.96, 0.95, 0.92, 0.9, 0.92, 1.0, 1.04, 1.04, 1.12],
  roles: {
    ops: { title: 'Dispensing technicians', salary: gbp(21000), effect: '+1,800 items/month of capacity each' },
    rnd: { title: 'Clinical pharmacists', salary: gbp(42000), effect: 'Improve accuracy, advice and trust' },
    sales: { title: 'Community outreach', salary: gbp(24000), effect: 'Multiply the reach of your marketing' },
  },
  founderCapacity: 2800,
  capacityPerOps: 1800,
  founderQuality: 2,
  qualityPerRnd: 1.0,
  qualityDecay: 0.05,
  startQuality: 40,
  salesReachBoost: 0.25,
  marketingPerBrandPoint: gbp(200),
  rentBase: gbp(2600),
  rentPerHead: gbp(150),
  equipmentPerHire: gbp(900),
  equipmentLifeMonths: 60,
  recruitmentPct: 0.1,
  startingCapex: { amount: gbp(30000), label: 'Dispensary fit-out and fridge', lifeMonths: 84 },
  automationScale: gbp(90000),
  multiples: { evEbitda: 7, evRevenue: 0.5 },
  targetEbitdaMargin: 0.08,
  capexPctRevenue: 0.02,
  nwcPctRevenue: 0.08,
  competitors: [
    { name: 'Boots & Bridge Chemists', quality: 55, priceFactor: 1.1, strength: 1.2 },
    { name: 'SuperSave Pharmacy', quality: 42, priceFactor: 0.85, strength: 1.4 },
    { name: 'Greenleaf Health', quality: 60, priceFactor: 1.2, strength: 0.8 },
  ],
  benchmarks: { grossMargin: 0.3, ebitdaMargin: 0.06, currentRatio: 1.3, receivableDays: 30, inventoryDays: 40 },
};

const U = (
  id: string, name: string, description: string, icon: string, maxLevel: number, baseCostPounds: number,
  perLevel: UpgradeDef['perLevel'], requires?: { id: string; level: number },
): UpgradeDef => ({ id, name, description, icon, maxLevel, baseCost: gbp(baseCostPounds), costGrowth: 1.6, lifeMonths: 60, perLevel, requires });

export const upgrades: UpgradeDef[] = [
  U('robot', 'Dispensing robot', '+20% dispensing capacity per level.', 'gear', 5, 14_000, { capacity: 0.2 }),
  U('fridge', 'Medical fridges', '25% less stock expired per level.', 'diamond', 3, 6_000, { spoilage: -0.25 }),
  U('pmr', 'Patient records system', '+0.4 accuracy and trust a month per level.', 'laptop', 5, 9_000, { quality: 0.4 }),
  U('app', 'Repeat-prescription app', '+12% reach per level.', 'rocket', 4, 8_000, { reach: 0.12 }, { id: 'pmr', level: 1 }),
  U('carehome', 'Care-home delivery van', '+10% market size per level.', 'car', 3, 18_000, { market: 0.1 }, { id: 'robot', level: 1 }),
  U('consult', 'Consultation room', '+0.5 accuracy and trust a month per level.', 'heart', 4, 12_000, { quality: 0.5 }, { id: 'pmr', level: 2 }),
  U('buying', 'Buying group membership', 'Unit costs 3% lower per level.', 'key', 4, 10_000, { unitCost: -0.03 }, { id: 'fridge', level: 1 }),
  U('loyalty', 'Health-club loyalty card', '+8% reach and 5% less churn per level.', 'star', 3, 7_000, { reach: 0.08, churn: -0.05 }, { id: 'app', level: 1 }),
];
