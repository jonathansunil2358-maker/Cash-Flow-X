import { gbp, type Pence } from '../money';

export type IndustryId = 'software' | 'clothing' | 'restaurant' | 'fitness' | 'ecommerce' | 'automotive';
export type RoleId = 'ops' | 'rnd' | 'sales';
export const ROLE_IDS: RoleId[] = ['ops', 'rnd', 'sales'];

export interface RoleDef {
  title: string;
  /** Annual base salary before wage inflation. */
  salary: Pence;
  effect: string;
}

/**
 * Everything that makes one industry's economics differ from another's is data. Adding an
 * industry means adding an entry here, not writing new simulation code.
 */
export interface IndustryConfig {
  id: IndustryId;
  name: string;
  emoji: string;
  tagline: string;
  difficulty: 'Standard' | 'Challenging' | 'Hard';
  description: string;
  /** 'subscription' = recurring customers with churn; 'unit' = one-off sales from inventory. */
  model: 'subscription' | 'unit';
  unitSingular: string;
  unitPlural: string;
  basePrice: Pence;
  priceElasticity: number;
  /** Subscription: monthly cost to serve one customer. Unit: purchase cost of one unit. */
  unitCost: Pence;
  annualPrepaidShare: number;
  baseChurn: number;
  stockCoverDefault: number;
  /** Fraction of closing stock spoiled or written off each month. */
  spoilage: number;
  receivableDays: number;
  payableDays: number;
  /** Potential new customers (subscription) or units (unit) per month at 100% share and reach. */
  marketSize: number;
  marketGrowth: number;
  /** Demand multiplier for each calendar month (Jan first); averages 1.0 over the year. */
  seasonality: number[];
  roles: Record<RoleId, RoleDef>;
  founderCapacity: number;
  capacityPerOps: number;
  founderQuality: number;
  qualityPerRnd: number;
  qualityDecay: number;
  startQuality: number;
  salesReachBoost: number;
  /** Marketing spend (pence) that buys one point of brand. */
  marketingPerBrandPoint: Pence;
  rentBase: Pence;
  rentPerHead: Pence;
  equipmentPerHire: Pence;
  equipmentLifeMonths: number;
  recruitmentPct: number;
  startingCapex: { amount: Pence; label: string; lifeMonths: number } | null;
  /** Automation spend at which capacity uplift reaches ~63% of its +50% maximum. */
  automationScale: Pence;
  multiples: { evEbitda: number; evRevenue: number };
  targetEbitdaMargin: number;
  capexPctRevenue: number;
  nwcPctRevenue: number;
  competitors: { name: string; quality: number; priceFactor: number; strength: number }[];
  benchmarks: { grossMargin: number; ebitdaMargin: number; currentRatio: number; receivableDays: number; inventoryDays: number };
}

export const INDUSTRIES: Record<IndustryId, IndustryConfig> = {
  software: {
    id: 'software',
    name: 'Software (SaaS)',
    difficulty: 'Standard',
    emoji: '💻',
    tagline: 'High margins, high salaries, recurring revenue.',
    description:
      'Sell a subscription product to small businesses. No inventory, ~88% gross margin, but developers are expensive and customers churn if the product falls behind. 30% of customers prepay annually, creating deferred revenue.',
    model: 'subscription',
    unitSingular: 'customer',
    unitPlural: 'customers',
    basePrice: gbp(49),
    priceElasticity: 1.2,
    unitCost: gbp(6),
    annualPrepaidShare: 0.3,
    baseChurn: 0.03,
    stockCoverDefault: 0,
    spoilage: 0,
    receivableDays: 30,
    payableDays: 30,
    marketSize: 800,
    marketGrowth: 0.006,
    seasonality: [1.02, 1.01, 1.02, 1.0, 0.99, 0.97, 0.97, 0.97, 1.01, 1.02, 1.01, 1.01],
    roles: {
      ops: { title: 'Customer success', salary: gbp(32000), effect: '+300 customers of service capacity each' },
      rnd: { title: 'Developers', salary: gbp(55000), effect: 'Improve product quality (raises share, cuts churn)' },
      sales: { title: 'Sales reps', salary: gbp(38000), effect: 'Multiply the reach of your marketing' },
    },
    founderCapacity: 150,
    capacityPerOps: 300,
    founderQuality: 1.5,
    qualityPerRnd: 0.8,
    qualityDecay: 0.05,
    startQuality: 30,
    salesReachBoost: 0.3,
    marketingPerBrandPoint: gbp(250),
    rentBase: gbp(800),
    rentPerHead: gbp(450),
    equipmentPerHire: gbp(2000),
    equipmentLifeMonths: 36,
    recruitmentPct: 0.1,
    startingCapex: null,
    automationScale: gbp(150000),
    multiples: { evEbitda: 11, evRevenue: 3.5 },
    targetEbitdaMargin: 0.28,
    capexPctRevenue: 0.03,
    nwcPctRevenue: -0.05,
    competitors: [
      { name: 'Stackly', quality: 52, priceFactor: 1.05, strength: 1.1 },
      { name: 'Ledgerly', quality: 46, priceFactor: 0.9, strength: 0.9 },
      { name: 'NimbusWorks', quality: 58, priceFactor: 1.25, strength: 1.0 },
    ],
    benchmarks: { grossMargin: 0.8, ebitdaMargin: 0.2, currentRatio: 1.5, receivableDays: 35, inventoryDays: 0 },
  },
  clothing: {
    id: 'clothing',
    name: 'Clothing brand',
    difficulty: 'Challenging',
    emoji: '👕',
    tagline: 'Inventory-heavy, wholesale credit, marketing-led.',
    description:
      'Design and sell clothing, partly through wholesale accounts on 45-day terms. You must buy stock before you sell it, and unsold stock slowly loses value. Working capital is the whole game.',
    model: 'unit',
    unitSingular: 'item',
    unitPlural: 'items',
    basePrice: gbp(40),
    priceElasticity: 1.5,
    unitCost: gbp(17),
    annualPrepaidShare: 0,
    baseChurn: 0,
    stockCoverDefault: 1.5,
    spoilage: 0.02,
    receivableDays: 45,
    payableDays: 45,
    marketSize: 12000,
    marketGrowth: 0.005,
    seasonality: [0.92, 0.94, 1.0, 1.03, 1.0, 0.97, 0.94, 0.97, 1.03, 1.03, 1.08, 1.1],
    roles: {
      ops: { title: 'Warehouse & production', salary: gbp(26000), effect: '+450 items/month of capacity each' },
      rnd: { title: 'Designers', salary: gbp(34000), effect: 'Improve collection quality' },
      sales: { title: 'Wholesale reps', salary: gbp(36000), effect: 'Multiply the reach of your marketing' },
    },
    founderCapacity: 250,
    capacityPerOps: 450,
    founderQuality: 1.5,
    qualityPerRnd: 1.0,
    qualityDecay: 0.05,
    startQuality: 30,
    salesReachBoost: 0.3,
    marketingPerBrandPoint: gbp(200),
    rentBase: gbp(2200),
    rentPerHead: gbp(250),
    equipmentPerHire: gbp(1500),
    equipmentLifeMonths: 60,
    recruitmentPct: 0.08,
    startingCapex: null,
    automationScale: gbp(120000),
    multiples: { evEbitda: 8, evRevenue: 1 },
    targetEbitdaMargin: 0.14,
    capexPctRevenue: 0.03,
    nwcPctRevenue: 0.2,
    competitors: [
      { name: 'Threadline', quality: 50, priceFactor: 1.0, strength: 1.2 },
      { name: 'Northmade', quality: 60, priceFactor: 1.35, strength: 0.9 },
      { name: 'FastFold', quality: 40, priceFactor: 0.7, strength: 1.3 },
    ],
    benchmarks: { grossMargin: 0.55, ebitdaMargin: 0.12, currentRatio: 1.8, receivableDays: 45, inventoryDays: 60 },
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    difficulty: 'Hard',
    emoji: '🍔',
    tagline: 'High fixed costs, perishable stock, paid in cash.',
    description:
      'Run a restaurant group. Customers pay immediately, but rent is heavy, food spoils fast (25% of leftover stock per month) and it is staff-intensive. High operating leverage: small changes in covers swing profit hard.',
    model: 'unit',
    unitSingular: 'cover',
    unitPlural: 'covers',
    basePrice: gbp(24),
    priceElasticity: 1.4,
    unitCost: gbp(7.5),
    annualPrepaidShare: 0,
    baseChurn: 0,
    stockCoverDefault: 0.25,
    spoilage: 0.25,
    receivableDays: 0,
    payableDays: 30,
    marketSize: 14000,
    marketGrowth: 0.006,
    seasonality: [0.9, 0.94, 0.97, 1.0, 1.03, 1.03, 1.03, 1.0, 0.97, 0.97, 1.0, 1.16],
    roles: {
      ops: { title: 'Kitchen & floor staff', salary: gbp(24000), effect: '+380 covers/month of capacity each' },
      rnd: { title: 'Chefs (menu development)', salary: gbp(36000), effect: 'Improve food quality and reviews' },
      sales: { title: 'Events & partnerships', salary: gbp(30000), effect: 'Multiply the reach of your marketing' },
    },
    founderCapacity: 350,
    capacityPerOps: 380,
    founderQuality: 2,
    qualityPerRnd: 1.2,
    qualityDecay: 0.06,
    startQuality: 35,
    salesReachBoost: 0.25,
    marketingPerBrandPoint: gbp(150),
    rentBase: gbp(5500),
    rentPerHead: gbp(80),
    equipmentPerHire: gbp(600),
    equipmentLifeMonths: 60,
    recruitmentPct: 0.05,
    startingCapex: { amount: gbp(35000), label: 'Kitchen fit-out', lifeMonths: 84 },
    automationScale: gbp(80000),
    multiples: { evEbitda: 6, evRevenue: 0.8 },
    targetEbitdaMargin: 0.14,
    capexPctRevenue: 0.04,
    nwcPctRevenue: -0.03,
    competitors: [
      { name: 'The Copper Pot', quality: 55, priceFactor: 1.2, strength: 1.0 },
      { name: 'Burger Barn', quality: 42, priceFactor: 0.75, strength: 1.4 },
      { name: 'Olive & Vine', quality: 60, priceFactor: 1.4, strength: 0.8 },
    ],
    benchmarks: { grossMargin: 0.65, ebitdaMargin: 0.12, currentRatio: 0.8, receivableDays: 2, inventoryDays: 7 },
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness club',
    difficulty: 'Challenging',
    emoji: '🏋️',
    tagline: 'Memberships, big premises, equipment capex.',
    description:
      'Open a gym. Members pay monthly by direct debit (20% prepay annually). The premises and £40k of equipment are big fixed costs, so you need members fast. Each trainer can serve about 160 members.',
    model: 'subscription',
    unitSingular: 'member',
    unitPlural: 'members',
    basePrice: gbp(38),
    priceElasticity: 1.3,
    unitCost: gbp(5),
    annualPrepaidShare: 0.2,
    baseChurn: 0.04,
    stockCoverDefault: 0,
    spoilage: 0,
    receivableDays: 0,
    payableDays: 30,
    marketSize: 1100,
    marketGrowth: 0.005,
    seasonality: [1.2, 1.1, 1.03, 1.0, 0.97, 0.94, 0.92, 0.94, 1.0, 1.0, 0.98, 0.94],
    roles: {
      ops: { title: 'Trainers & front desk', salary: gbp(24000), effect: '+160 members of capacity each' },
      rnd: { title: 'Class programme leads', salary: gbp(30000), effect: 'Improve the member experience' },
      sales: { title: 'Membership advisors', salary: gbp(26000), effect: 'Multiply the reach of your marketing' },
    },
    founderCapacity: 120,
    capacityPerOps: 160,
    founderQuality: 2,
    qualityPerRnd: 1.2,
    qualityDecay: 0.06,
    startQuality: 35,
    salesReachBoost: 0.3,
    marketingPerBrandPoint: gbp(150),
    rentBase: gbp(4500),
    rentPerHead: gbp(60),
    equipmentPerHire: gbp(500),
    equipmentLifeMonths: 60,
    recruitmentPct: 0.05,
    startingCapex: { amount: gbp(40000), label: 'Gym equipment', lifeMonths: 60 },
    automationScale: gbp(100000),
    multiples: { evEbitda: 9, evRevenue: 2 },
    targetEbitdaMargin: 0.22,
    capexPctRevenue: 0.06,
    nwcPctRevenue: -0.04,
    competitors: [
      { name: 'PureMove', quality: 45, priceFactor: 0.6, strength: 1.4 },
      { name: 'Iron Works', quality: 55, priceFactor: 1.1, strength: 1.0 },
      { name: 'Studio Nine', quality: 62, priceFactor: 1.6, strength: 0.7 },
    ],
    benchmarks: { grossMargin: 0.85, ebitdaMargin: 0.2, currentRatio: 0.9, receivableDays: 2, inventoryDays: 0 },
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce store',
    difficulty: 'Hard',
    emoji: '📦',
    tagline: 'Thin margins, fast stock turns, marketing-hungry.',
    description:
      'Sell products online. Card payments settle in 3 days and suppliers give 30 days, so fast-moving stock can fund itself. But gross margin is only ~40% and customer acquisition is expensive.',
    model: 'unit',
    unitSingular: 'order',
    unitPlural: 'orders',
    basePrice: gbp(32),
    priceElasticity: 1.8,
    unitCost: gbp(19),
    annualPrepaidShare: 0,
    baseChurn: 0,
    stockCoverDefault: 1,
    spoilage: 0.01,
    receivableDays: 3,
    payableDays: 30,
    marketSize: 25000,
    marketGrowth: 0.006,
    seasonality: [0.92, 0.9, 0.94, 0.95, 0.97, 0.95, 0.94, 0.97, 1.0, 1.06, 1.23, 1.18],
    roles: {
      ops: { title: 'Fulfilment staff', salary: gbp(24000), effect: '+900 orders/month of capacity each' },
      rnd: { title: 'Product & UX', salary: gbp(42000), effect: 'Improve range and site conversion' },
      sales: { title: 'Growth marketers', salary: gbp(40000), effect: 'Multiply the reach of your marketing' },
    },
    founderCapacity: 500,
    capacityPerOps: 900,
    founderQuality: 1.5,
    qualityPerRnd: 0.9,
    qualityDecay: 0.05,
    startQuality: 30,
    salesReachBoost: 0.35,
    marketingPerBrandPoint: gbp(300),
    rentBase: gbp(1500),
    rentPerHead: gbp(220),
    equipmentPerHire: gbp(1200),
    equipmentLifeMonths: 48,
    recruitmentPct: 0.08,
    startingCapex: null,
    automationScale: gbp(150000),
    multiples: { evEbitda: 10, evRevenue: 1.2 },
    targetEbitdaMargin: 0.1,
    capexPctRevenue: 0.02,
    nwcPctRevenue: 0.05,
    competitors: [
      { name: 'ShopSwift', quality: 50, priceFactor: 0.9, strength: 1.5 },
      { name: 'Crate & Co', quality: 58, priceFactor: 1.15, strength: 1.0 },
      { name: 'BargainBay', quality: 38, priceFactor: 0.7, strength: 1.2 },
    ],
    benchmarks: { grossMargin: 0.4, ebitdaMargin: 0.08, currentRatio: 1.3, receivableDays: 3, inventoryDays: 35 },
  },
  automotive: {
    id: 'automotive',
    name: 'Automotive (EV conversions)',
    difficulty: 'Hard',
    emoji: '🚗',
    tagline: 'Big-ticket units, long build times, heavy inventory.',
    description:
      'Convert classic cars to electric. Each vehicle sells for ~£20k and needs ~£12k of parts held in stock for two months. Dealers pay on 30 days and suppliers give 60. Capital-hungry: you will almost certainly need debt.',
    model: 'unit',
    unitSingular: 'vehicle',
    unitPlural: 'vehicles',
    basePrice: gbp(20000),
    priceElasticity: 1.6,
    unitCost: gbp(12000),
    annualPrepaidShare: 0,
    baseChurn: 0,
    stockCoverDefault: 2,
    spoilage: 0.003,
    receivableDays: 30,
    payableDays: 60,
    marketSize: 70,
    marketGrowth: 0.006,
    seasonality: [0.94, 0.95, 1.13, 1.03, 1.0, 0.99, 0.97, 0.98, 1.1, 1.0, 0.97, 0.95],
    roles: {
      ops: { title: 'Technicians', salary: gbp(40000), effect: '+1.6 vehicles/month of capacity each' },
      rnd: { title: 'Engineers', salary: gbp(52000), effect: 'Improve conversion quality and range' },
      sales: { title: 'Dealer account managers', salary: gbp(42000), effect: 'Multiply the reach of your marketing' },
    },
    founderCapacity: 0.6,
    capacityPerOps: 1.6,
    founderQuality: 1.5,
    qualityPerRnd: 1.0,
    qualityDecay: 0.05,
    startQuality: 30,
    salesReachBoost: 0.3,
    marketingPerBrandPoint: gbp(300),
    rentBase: gbp(4500),
    rentPerHead: gbp(150),
    equipmentPerHire: gbp(4000),
    equipmentLifeMonths: 60,
    recruitmentPct: 0.1,
    startingCapex: { amount: gbp(25000), label: 'Workshop tooling & lifts', lifeMonths: 84 },
    automationScale: gbp(200000),
    multiples: { evEbitda: 7, evRevenue: 0.9 },
    targetEbitdaMargin: 0.12,
    capexPctRevenue: 0.05,
    nwcPctRevenue: 0.25,
    competitors: [
      { name: 'Voltique', quality: 55, priceFactor: 1.2, strength: 1.0 },
      { name: 'ReCharge Motors', quality: 48, priceFactor: 0.9, strength: 1.1 },
      { name: 'Heritage EV', quality: 62, priceFactor: 1.5, strength: 0.8 },
    ],
    benchmarks: { grossMargin: 0.3, ebitdaMargin: 0.1, currentRatio: 1.4, receivableDays: 30, inventoryDays: 70 },
  },
};

export const INDUSTRY_IDS = Object.keys(INDUSTRIES) as IndustryId[];
export const industryOf = (s: { industryId: IndustryId }): IndustryConfig => INDUSTRIES[s.industryId];
