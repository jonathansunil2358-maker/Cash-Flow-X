import { chance, pick, type Rng } from '../rng';
import { plSummary } from '../ledger/statements';
import { DIFFICULTIES } from './difficulty';
import { seasonalFactor, type IndustryConfig } from './industries';
import { modifiersOf } from './modifiers';
import { logItem, type Competitor, type GameState } from './state';

/**
 * Demand model (every term is shown to the player in the UI):
 *   demand = market potential x season x economy x preference share x reach x credit-terms effect
 * where preference share = your attractiveness / (yours + all competitors'),
 *       attractiveness  = (quality/50)^1.5 x (reference price / price)^elasticity x strength.
 */
export function attractiveness(quality: number, price: number, refPrice: number, elasticity: number, strength = 1): number {
  return Math.pow(Math.max(quality, 1) / 50, 1.5) * Math.pow(refPrice / Math.max(price, 1), elasticity) * strength;
}

export function capacityMultiplier(s: GameState, ind: IndustryConfig): number {
  return 1 + 0.5 * (1 - Math.exp(-s.automationSpend / ind.automationScale));
}

export function capacityOf(s: GameState, ind: IndustryConfig): number {
  return (ind.founderCapacity + s.staff.ops * ind.capacityPerOps) * capacityMultiplier(s, ind) * modifiersOf(s).capacityMult;
}

/** Brand points at which reach is ~63% of the way from 5% to 100%. */
export const REACH_SCALE = 300;
/** Word of mouth and passing trade: reach with zero marketing. */
export const BASE_REACH = 0.08;

export function reachOf(s: GameState, ind: IndustryConfig): number {
  const sales = s.staff.sales;
  // The founder's own selling counts for ~20 brand points; sales reps add leads directly and
  // amplify marketing.
  const effective = (20 + s.brand * (1 + ind.salesReachBoost * Math.pow(sales, 0.7)) + 8 * Math.pow(sales, 0.8)) * modifiersOf(s).reachMult;
  return BASE_REACH + (1 - BASE_REACH) * (1 - Math.exp(-effective / REACH_SCALE));
}

/** Offering longer credit terms than the industry norm wins some extra B2B demand (and vice versa). */
export function termsDemandMultiplier(s: GameState, ind: IndustryConfig): number {
  if (ind.receivableDays === 0) return 1;
  return Math.min(1.15, Math.max(0.85, 1 + 0.003 * (s.customerDays - ind.receivableDays)));
}

/** Longer supplier terms cost a price premium; paying early earns a settlement discount. */
export function supplierCostMultiplier(s: GameState, ind: IndustryConfig): number {
  const diff = s.supplierDays - ind.payableDays;
  return diff >= 0 ? 1 + 0.0005 * diff : 1 + 0.0003 * diff;
}

/** Demand while the founder is away (offline progress): nobody is out hustling. */
export const AWAY_DEMAND = 0.75;

/** Reputation 0-100 moves demand between -10% and +10%. */
export const reputationFactor = (s: GameState): number => 0.9 + (0.2 * Math.min(100, Math.max(0, s.reputation))) / 100;

export interface DemandInfo {
  potential: number;
  preferenceShare: number;
  reach: number;
  termsMult: number;
  demand: number;
  playerAttractiveness: number;
  competitorAttractiveness: number;
}

export function demandFor(s: GameState, ind: IndustryConfig): DemandInfo {
  const mods = modifiersOf(s);
  const potential = s.marketSize * seasonalFactor(ind, s.month) * s.economy.demandMult * mods.marketMult * mods.demandMult * reputationFactor(s) * (s.away ? AWAY_DEMAND : 1);
  const playerAttractiveness = attractiveness(s.quality, s.price, ind.basePrice, ind.priceElasticity);
  const competitorAttractiveness = s.competitors.reduce(
    (a, c) => a + attractiveness(c.quality, c.price, ind.basePrice, ind.priceElasticity, c.strength),
    0,
  );
  const preferenceShare = playerAttractiveness / (playerAttractiveness + competitorAttractiveness);
  const reach = reachOf(s, ind);
  const termsMult = termsDemandMultiplier(s, ind);
  return {
    potential,
    preferenceShare,
    reach,
    termsMult,
    demand: potential * preferenceShare * reach * termsMult,
    playerAttractiveness,
    competitorAttractiveness,
  };
}

export function averageCompetitorQuality(s: GameState): number {
  return s.competitors.reduce((a, c) => a + c.quality, 0) / Math.max(1, s.competitors.length);
}

/** Most rivals a market can hold. */
export const MAX_RIVALS = 6;
const ENTRANT_NAMES = ['Northwind', 'Brightside', 'Keystone', 'Harbour Lane', 'Meridian', 'Foxglove', 'Bluebird', 'Apex & Co'];

/** A rival's normal marketing strength (the one it started with; newcomers start at 0.8). */
const baseStrength = (ind: IndustryConfig, c: Competitor) => ind.competitors.find((x) => x.name === c.name)?.strength ?? 0.8;

/**
 * Competitors keep improving, faster when you out-innovate them, and they fight for share: the
 * more of the market you take, the more often one of them cuts prices or launches a campaign.
 * A large, very profitable player draws new entrants. Difficulty sets how hard they push.
 */
export function updateCompetitors(s: GameState, ind: IndustryConfig, rng: Rng, lastShare: number): void {
  const rivalry = DIFFICULTIES[s.difficulty].rivalry;
  for (const c of s.competitors) {
    const catchUp = 0.02 * Math.max(0, s.quality - c.quality);
    c.quality = Math.min(100, Math.max(10, c.quality + 0.1 + catchUp + (rng.next() - 0.5) * 0.4));
    const drift = 1 + (rng.next() - 0.5) * 0.02;
    c.price = Math.round(Math.min(ind.basePrice * 2.5, Math.max(ind.basePrice * 0.4, c.price * drift)));
    // Campaigns fade: strength drifts back towards normal.
    const base = baseStrength(ind, c);
    c.strength = base + (c.strength - base) * 0.97;
  }

  // Margins attract competition: rivals push back harder against a big, profitable player.
  const recent = s.history.slice(-6).map((r) => plSummary(r.period.pl));
  const revenue = recent.reduce((a, p) => a + p.revenue, 0);
  const margin = revenue > 0 ? recent.reduce((a, p) => a + p.ebitda, 0) / revenue : 0;
  const attraction = Math.min(2, Math.max(0, margin / ind.targetEbitdaMargin));
  const fair = 1 / (s.competitors.length + 1);
  const pressure = Math.max(0, lastShare - fair * 0.5) * rivalry * attraction;
  if (pressure > 0 && chance(rng, Math.min(0.5, pressure * 1.5))) {
    const c: Competitor = pick(rng, s.competitors);
    if (chance(rng, 0.5)) {
      const cut = Math.min(0.15, 0.05 + pressure * 0.15);
      c.price = Math.round(Math.max(ind.basePrice * 0.5, c.price * (1 - cut)));
      rivalNews(s, `${c.name} cuts prices`, `${c.name} cut prices by ${Math.round(cut * 100)}% to win back customers from you.`);
    } else {
      c.strength = Math.min(2.5, c.strength * (1.12 + pressure * 0.3));
      c.quality = Math.min(100, c.quality + 2);
      rivalNews(s, `${c.name} launches a big campaign`, `${c.name} is spending heavily on marketing and product to take share back.`);
    }
  }

  // From the second year, strong margins can draw a new entrant (checked every six months).
  if (s.month >= 18 && s.month % 6 === 0 && s.competitors.length < MAX_RIVALS && attraction > 0.8
    && chance(rng, 0.25 * rivalry * attraction)) {
    const taken = new Set(s.competitors.map((c) => c.name));
    const name = ENTRANT_NAMES.find((n) => !taken.has(n)) ?? `Rival ${s.competitors.length + 1}`;
    s.competitors.push({ name, quality: Math.max(30, s.quality - 5), price: Math.round(s.price * 0.9), strength: 0.8 });
    rivalNews(s, `${name} enters your market`, `Your margins caught attention: ${name} has launched a rival offer at a lower price.`);
  }
}

/** Rival moves reach the player as news, unless a bigger event already made the headlines this month. */
function rivalNews(s: GameState, title: string, text: string): void {
  logItem(s, 'event', title, text);
  if (!s.lastEvent || s.lastEvent.month !== s.month) s.lastEvent = { month: s.month, title, text, polarity: 'bad' };
}
