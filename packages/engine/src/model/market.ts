import { chance, pick, type Rng } from '../rng';
import type { IndustryConfig } from './industries';
import { modifiersOf } from './modifiers';
import { logItem, type Competitor, type GameState } from './state';

/**
 * Demand model (every term is shown to the player in the UI):
 *   demand = market potential x economy x preference share x reach x credit-terms effect
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
  const potential = s.marketSize * s.economy.demandMult * mods.marketMult * mods.demandMult * reputationFactor(s) * (s.away ? AWAY_DEMAND : 1);
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

/**
 * Competitors keep improving, faster when you out-innovate them; if you dominate the market
 * someone may start a price war.
 */
export function updateCompetitors(s: GameState, ind: IndustryConfig, rng: Rng, lastShare: number): void {
  for (const c of s.competitors) {
    const catchUp = 0.02 * Math.max(0, s.quality - c.quality);
    c.quality = Math.min(100, Math.max(10, c.quality + 0.1 + catchUp + (rng.next() - 0.5) * 0.4));
    const drift = 1 + (rng.next() - 0.5) * 0.02;
    c.price = Math.round(Math.min(ind.basePrice * 2.5, Math.max(ind.basePrice * 0.4, c.price * drift)));
  }
  if (lastShare > 0.3 && chance(rng, 0.15)) {
    const c: Competitor = pick(rng, s.competitors);
    c.price = Math.round(c.price * 0.93);
    logItem(s, 'event', `${c.name} starts a price war`, `${c.name} cut prices by 7% to win back share from you.`);
  }
}
