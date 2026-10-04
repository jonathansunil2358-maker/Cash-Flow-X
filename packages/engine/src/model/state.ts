import type { Balances } from '../ledger/accounts';
import type { AwardWon } from './awards';
import type { AutoRule } from './autopilotRules';
import type { BoardState } from './board';
import type { Rumour } from './surprise';
import type { Venture } from './venture';
import type { Ledger, PeriodAccumulator } from '../ledger/journal';
import type { Pence } from '../money';
import type { DifficultyId } from './difficulty';
import type { IndustryId, RoleId } from './industries';
import type { ActiveBoost, PerkLevels } from './perks';

export const STATE_VERSION = 5;
export const GAME_MONTHS = 120;
/** Months of statement history kept in the save (older months drop off; the ledger itself is complete). */
export const MAX_HISTORY = 360;
/** Month count used for endless runs. */
export const ENDLESS = 1_000_000;
export const START_YEAR = 2027;
export const WIN_EQUITY_VALUE: Pence = 10_000_000_00;
export const STARTING_CAPITAL: Pence = 100_000_00;

export interface Competitor {
  name: string;
  quality: number;
  price: Pence;
  strength: number;
  /** Months left on a price cut aimed at winning share back from the player. */
  cutMonths: number;
  /** The price this rival drifts back to once a cut ends. */
  normalPrice: Pence;
  /** Calendar year of the last product launch (a rival launches at most once a year). */
  lastLaunchYear: number;
}

export type PayLevel = 'below' | 'market' | 'above';
export type InsuranceTier = 'none' | 'basic' | 'full';

/** A big contract on the table: a client wants a fixed volume at a fixed price. */
export interface ContractOffer {
  id: string;
  client: string;
  /** Units (or seats) a month. */
  units: number;
  /** Price per unit, fixed for the whole contract. */
  price: Pence;
  months: number;
  paymentDays: number;
  /** Penalty for each unit you cannot deliver, as a share of the price. */
  penaltyPct: number;
  expiresMonth: number;
}

/** A contract you have signed. */
export interface Contract {
  id: string;
  client: string;
  units: number;
  price: Pence;
  months: number;
  monthsLeft: number;
  paymentDays: number;
  penaltyPct: number;
}

/** What the market expects from a listed company next quarter. */
export interface Guidance {
  /** The month the quarter closes. */
  month: number;
  target: Pence;
}

/** A promotion the player is running: a temporary price discount. */
export interface Promo {
  discountPct: number;
  /** Length it was booked for, and how many months remain. */
  months: number;
  monthsLeft: number;
}

/** An R&D project in progress. */
export interface RdProject {
  id: string;
  monthsLeft: number;
}

export interface Loan {
  id: string;
  label: string;
  principal: Pence;
  original: Pence;
  /** Credit spread over base rate, fixed at drawdown. */
  spread: number;
  /** Extra margin charged after a covenant breach. */
  penalty: number;
  termMonths: number;
  monthsRemaining: number;
  startMonth: number;
  consecutiveBreaches: number;
}

export interface PpeAsset {
  id: string;
  label: string;
  cost: Pence;
  lifeMonths: number;
  accumulated: Pence;
}

/** IFRS 16 lease: right-of-use asset register and lease liability schedule. */
export interface Lease {
  id: string;
  label: string;
  cost: Pence;
  accumulated: Pence;
  liability: Pence;
  annualRate: number;
  payment: Pence;
  termMonths: number;
  monthsRemaining: number;
  startMonth: number;
}

export interface PendingEvent {
  id: string;
  title: string;
  polarity: 'good' | 'bad';
  icon: string;
  story: string;
  month: number;
  params: Record<string, number>;
  choices: { id: string; label: string; hint: string; impact: { label: string; up: boolean }[] }[];
}

/** A holding company member who invested in this company. */
export interface OutsideHolder {
  /** Server investment id (one holder entry per accepted investment). */
  id: string;
  investorId: string;
  investorName: string;
  shares: number;
  /** Cash invested. */
  invested: Pence;
  /** Dividends paid to this holder so far. */
  dividends: Pence;
  /** Paid when bought out (prestige, leaving the holding company). */
  buyout: Pence;
  status: 'active' | 'bought-out';
}

export interface AnnualCohort {
  startMonth: number;
  customers: number;
}

export type EventType =
  | 'boom'
  | 'recession'
  | 'rateRise'
  | 'rateCut'
  | 'supplyShock'
  | 'wageInflation'
  | 'creditCrunch'
  | 'competitorLaunch'
  | 'viral';

export interface EventEffects {
  demandMult?: number;
  unitCostMult?: number;
  lendingAppetite?: number;
  badDebtRate?: number;
}

export interface ActiveEvent {
  type: EventType | string;
  title: string;
  startMonth: number;
  remaining: number;
  effects: EventEffects;
}

export type LogKind = 'event' | 'notice' | 'warning' | 'milestone' | 'action';
export interface LogItem {
  month: number;
  kind: LogKind;
  title: string;
  text: string;
}

export interface Economy {
  baseRate: number;
  demandMult: number;
  unitCostMult: number;
  lendingAppetite: number;
  badDebtRate: number;
  active: ActiveEvent[];
}

export interface AcquisitionTarget {
  id: string;
  name: string;
  annualRevenue: Pence;
  reportedEbitda: Pence;
  trueEbitda: Pence;
  cash: Pence;
  receivables: Pence;
  inventory: Pence;
  ppe: Pence;
  payables: Pence;
  debt: Pence;
  heads: Record<RoleId, number>;
  /** Customers (subscription) or monthly units (unit model) brought across. */
  volume: number;
  askingPrice: Pence;
  diligenceFee: Pence;
  diligenceDone: boolean;
  expiresMonth: number;
}

export interface Acquisition {
  name: string;
  month: number;
  price: Pence;
  netAssets: Pence;
  goodwill: Pence;
}

export interface Valuation {
  ttmRevenue: Pence;
  ttmEbitda: Pence;
  ttmProfit: Pence;
  revenueGrowth: number;
  evEbitda: Pence;
  evRevenue: Pence;
  dcf: Pence;
  wacc: number;
  enterpriseValue: Pence;
  netDebt: Pence;
  equityValue: Pence;
  method: string;
  peRatio: number | null;
}

export interface MonthKpis {
  customers: number;
  newCustomers: number;
  churned: number;
  unitsSold: number;
  demand: number;
  lostSales: number;
  capacity: number;
  utilisation: number;
  marketShare: number;
  preferenceShare: number;
  reach: number;
  quality: number;
  price: Pence;
  headcount: number;
  staff: Record<RoleId, number>;
  stockUnits: number;
  overdraftLimit: Pence;
  baseRate: number;
  ownership: number;
  /** Team strain after the month (0-1). Absent in older records. */
  strain?: number;
}

/** A closed month: the source for every statement, chart and ratio. */
export interface MonthRecord {
  month: number;
  period: PeriodAccumulator;
  closing: Balances;
  loansCurrentPortion: Pence;
  leasesCurrentPortion: Pence;
  kpis: MonthKpis;
  valuation: Valuation;
}

export interface Objective {
  id: string;
  text: string;
}

export interface GameState {
  version: number;
  seed: number;
  seedLabel: string;
  rng: number;
  month: number;
  companyName: string;
  /** Business icon id chosen at onboarding (cosmetic). */
  icon: string;
  industryId: IndustryId;
  scenarioId: string;
  difficulty: DifficultyId;
  /** Founder reputation, 0-100 (50 = neutral). Nudges demand up to ±10%; moved by event decisions. */
  reputation: number;
  /** Team strain 0-1: builds while running above 95% of capacity, wears down quality and reputation. Absent in older saves. */
  strain?: number;
  /** True while the game runs itself offline: no bad news, no decisions, 25% less demand. */
  away: boolean;
  status: 'playing' | 'insolvent' | 'finished' | 'prestiged';
  endReason?: string;
  wonAtMonth: number | null;
  lastMonth: number;

  ledger: Ledger;
  history: MonthRecord[];
  integrityErrors: string[];

  staff: Record<RoleId, number>;
  salaryIndex: number;
  /** Pay relative to the market: scales the wage bill and moves morale. */
  /** Open sites, including the first (1 to MAX_SITES), and the opening months of those still being built. */
  sites: number;
  pendingSites: number[];
  insurance: InsuranceTier;
  contracts: Contract[];
  contractOffers: ContractOffer[];
  /** Stock market listing: whether listed, when, the market's mood, recent share prices and what it expects next. */
  listed: boolean;
  listedMonth: number | null;
  sentiment: number;
  priceHistory: Pence[];
  guidance: Guidance | null;
  /** The weekly event twist this company is playing under (display only; its effects are in `economy.active`). */
  twist: string | null;
  /** Optional handicaps chosen when the company was started (each pays a bonus). Missing on older saves. */
  modifiers?: string[];
  /** Quarterly board meetings (see board.ts) and annual awards won (see awards.ts). Missing on older saves. */
  board?: BoardState;
  /** Standing orders the company follows each month (see autopilot.ts). */
  rules?: AutoRule[];
  /** A rumour waiting to come true (or not): see surprise.ts. */
  rumour?: Rumour;
  /** Side ventures waiting to settle: see venture.ts. */
  ventures?: Venture[];
  /** Yearly audit results (see audit.ts). */
  /** Chosen supplier (undefined = standard) and when it was chosen, and franchises open: see suppliers.ts and franchise.ts. */
  supplier?: 'budget' | 'premium';
  supplierSince?: number;
  franchises?: number;
  /** Deals and money (acquisitions, sale, VC, crowdfunding, hedges, patents): see deals.ts. */
  deals?: import('./deals').Deals;
  /** Training, work style, innovation day and headhunting: see people.ts. */
  people?: import('./people').People;
  /** Loyalty programme, service desk, influencer and Black Friday bookkeeping: see loyalty.ts and customers.ts. */
  cust?: import('./loyalty').Cust;
  /** Subsidiaries, boons, cycle stance, green steps and giving: see strategy.ts. */
  strat?: import('./strategy').Strat;
  /** Free play: start-up cash and demand multipliers chosen at the start (never ranked). */
  sandbox?: { cash: number; demand: number };
  /** Boss round in progress, and how many have been beaten (see boss.ts). Speedrun: the month £1m of value was first reached. */
  boss?: { id: string; endMonth: number };
  bossesBeaten?: number;
  speedrunMonth?: number;
  /** Keys of once-a-year events already seen (see events.ts). Kept in the state so the server's checkpoints agree with the client. */
  done?: string[];
  /** Product design (features 0-100), the hiring-market stars, export markets, building ownership and review replies: see design.ts, stars.ts, export.ts, property.ts, reviews.ts. */
  design?: number;
  designSince?: number;
  stars?: { id: string; name: string; role: 'ops' | 'rnd' | 'sales'; skill: number }[];
  markets?: string[];
  ownsBuilding?: boolean;
  replied?: string[];
  audits?: { year: number; findings: string[]; clean: boolean }[];
  awards?: AwardWon[];
  pay: PayLevel;
  /** Monthly training budget. */
  trainingSpend: Pence;
  /** Team morale 0-100: drives productivity and turnover. */
  morale: number;
  /** The running promotion (if any), the demand dip that follows one, and the cooldown before the next. */
  promo: Promo | null;
  promoDipMonths: number;
  promoCooldown: number;
  /** R&D projects in progress, and the ids of those that succeeded. */
  projects: RdProject[];
  projectsDone: string[];
  price: Pence;
  marketingBudget: Pence;
  stockCoverMonths: number;
  customerDays: number;
  supplierDays: number;
  brand: number;
  quality: number;
  automationSpend: Pence;
  upgrades: Record<string, number>;
  rentIndex: number;
  bonusDemand: number;

  customers: number;
  annualCohorts: AnnualCohort[];
  deferredSchedule: Pence[];
  inventoryUnits: number;
  acquiredDemand: number;
  receivablesQueue: Pence[];
  payablesQueue: Pence[];
  ppeAssets: PpeAsset[];
  loans: Loan[];
  leases: Lease[];
  fundValue: Pence;
  deposit: Pence;
  shares: { total: number; owner: number };
  ownerDividends: Pence;
  lastEquityRaiseMonth: number | null;
  tax: { lossesCarriedForward: Pence; ytdBooked: Pence; due: Pence; dueMonth: number | null };

  perks: PerkLevels;
  /** Holding company perk level (0 = not in one). Set by a recorded action; the server checks it. */
  guildLevel: number;
  /** Other players who own shares in this company (holding company investments). */
  outsideHolders: OutsideHolder[];
  /** Boost activations per in-game year (anti-abuse cap). */
  boostActivations: Record<number, number>;
  /** How many times the player had prestiged when this run started (sets the next threshold). */
  prestigeLevel: number;
  /** Legacy points earned when this run was prestiged. */
  prestigeAward: number;
  /** Link to the server's copy of this run (online play). Bookkeeping only; never read by the simulation. */
  server?: { runId: string; synced: number; syncedMonth: number; flagged?: string; carry?: 'pending' | 'done' | 'failed' };
  /** How the run began, for replay verification. */
  start: { equipmentFinance: 'buy' | 'lease'; boosts: ActiveBoost[] };
  boosts: ActiveBoost[];
  pendingEvent: PendingEvent | null;
  lastEvent: { month: number; title: string; text: string; polarity: 'good' | 'bad' } | null;
  economy: Economy;
  marketSize: number;
  competitors: Competitor[];
  targets: AcquisitionTarget[];
  acquisitions: Acquisition[];

  log: LogItem[];
  actionLog: { month: number; action: unknown }[];
  nextId: number;
  objectives: Objective[];
}

export const monthOfYear = (month: number): number => month % 12;
export const yearOf = (month: number): number => START_YEAR + Math.floor(month / 12);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (month: number): string => `${MONTHS[monthOfYear(month)]} ${yearOf(month)}`;

export const headcount = (s: GameState): number => s.staff.ops + s.staff.rnd + s.staff.sales;
export const totalCustomers = (s: GameState): number =>
  s.customers + s.annualCohorts.reduce((a, c) => a + c.customers, 0);
export const loanPrincipal = (s: GameState): Pence => s.loans.reduce((a, l) => a + l.principal, 0);
export const ownership = (s: GameState): number => s.shares.owner / s.shares.total;

export function newId(s: GameState, prefix: string): string {
  return `${prefix}${s.nextId++}`;
}

export function logItem(s: GameState, kind: LogKind, title: string, text: string): void {
  s.log.push({ month: s.month, kind, title, text });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}
