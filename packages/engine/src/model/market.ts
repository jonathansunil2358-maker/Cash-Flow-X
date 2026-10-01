import { chance, type Rng } from '../rng';
import type { IndustryConfig } from './industries';
import { modifiersOf } from './modifiers';
import { effectivePrice, promoDemandMult, seasonFactor } from './promotions';
import { DIFFICULTIES } from './difficulty';
import { logItem, yearOf, type GameState } from './state';

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
  const potential = s.marketSize * s.economy.demandMult * mods.marketMult * mods.demandMult * reputationFactor(s) * seasonFactor(s, ind) * promoDemandMult(s) * (s.away ? AWAY_DEMAND : 1);
  const playerAttractiveness = attractiveness(s.quality, effectivePrice(s), ind.basePrice, ind.priceElasticity);
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

/** Rivals strike back when your share has jumped this much (points of market share) in three months. */
export const RIVAL_TRIGGER_RISE = 0.05;
/** A price cut never takes a rival below this fraction of its normal price. */
export const RIVAL_PRICE_FLOOR = 0.85;
const clampPrice = (ind: IndustryConfig, p: number): number => Math.round(Math.min(ind.basePrice * 2.5, Math.max(ind.basePrice * 0.4, p)));

/**
 * Competitors keep improving, faster when you out-innovate them, and they react to you:
 *  - if your share jumps (or you dominate), the strongest rival cuts prices for 3 to 6 months,
 *    then drifts back to its normal price;
 *  - now and then a rival launches a better product (at most once a year each).
 * How readily they do this scales with the difficulty.
 */
export function updateCompetitors(s: GameState, ind: IndustryConfig, rng: Rng, lastShare: number): void {
  const aggression = DIFFICULTIES[s.difficulty].rivalAggression;
  for (const c of s.competitors) {
    const catchUp = 0.02 * Math.max(0, s.quality - c.quality);
    c.quality = Math.min(100, Math.max(10, c.quality + 0.1 + catchUp + (rng.next() - 0.5) * 0.4));
    const drift = 1 + (rng.next() - 0.5) * 0.02;
    c.normalPrice = clampPrice(ind, c.normalPrice * drift);
    if (c.cutMonths > 0) {
      c.cutMonths -= 1;
      c.price = clampPrice(ind, c.price * drift);
    } else {
      // Recover most of the way back to the normal price over a few months.
      const gap = c.normalPrice - c.price;
      c.price = Math.abs(gap) < ind.basePrice * 0.005 ? c.normalPrice : clampPrice(ind, c.price + gap * 0.3);
    }
  }

  const earlier = s.history.at(-3)?.kpis.marketShare ?? lastShare;
  const rising = lastShare - earlier > RIVAL_TRIGGER_RISE;
  const dominating = lastShare > 0.3 && chance(rng, 0.15);
  if ((rising || dominating) && !s.competitors.some((c) => c.cutMonths > 0) && chance(rng, Math.min(1, 0.5 * aggression))) {
    const rival = s.competitors.reduce((best, c) => (c.strength * c.quality > best.strength * best.quality ? c : best));
    const cut = 0.04 + rng.next() * 0.04;
    rival.cutMonths = 3 + Math.min(3, Math.floor(rng.next() * 4));
    rival.price = Math.max(Math.round(rival.price * (1 - cut)), Math.round(rival.normalPrice * RIVAL_PRICE_FLOOR));
    logItem(s, 'event', `${rival.name} cuts prices`,
      `${rival.name} dropped prices by about ${Math.round(cut * 100)}% for the next ${rival.cutMonths} months to win back customers from you.`);
  }

  const year = yearOf(s.month);
  for (const c of s.competitors) {
    if (c.lastLaunchYear !== year && chance(rng, 0.03 * aggression)) {
      const step = 3 + Math.min(3, Math.floor(rng.next() * 4));
      c.quality = Math.min(100, c.quality + step);
      c.lastLaunchYear = year;
      logItem(s, 'event', `${c.name} launches a new product`, `${c.name}'s quality jumped by ${step} points. Time to look at your own product.`);
    }
  }
}
