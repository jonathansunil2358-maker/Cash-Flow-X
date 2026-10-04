import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { industryOf } from './industries';
import { rentedExtraSites } from './sites';
import { baseRentFor, premisesTier } from './growth';
import { workstyleOf } from './people';
import { headcount, logItem, newId, type GameState } from './state';

/**
 * Real estate: buy your headquarters instead of renting it. It costs 60 months of the base rent up front,
 * after which you stop paying base rent (staff-related space and any extra sites still cost rent), and
 * pay a small yearly upkeep. It is a long-term commitment: a building cannot be sold in this version.
 */
export const BUILDING_MONTHS = 60;
export const BUILDING_MIN_MONTH = 12;
export const UPKEEP_RATE = 0.012; // a year of upkeep, as a share of the price

export const ownsBuilding = (s: GameState): boolean => !!s.ownsBuilding;
/** The monthly rent for everything you rent: the HQ base rent only until you own it. */
export function monthlyRent(s: GameState): Pence {
  const ind = industryOf(s);
  // The HQ base rent grows with each move to bigger premises; extra sites rent at the plain base rate.
  const hq = ownsBuilding(s) ? 0 : baseRentFor(ind, premisesTier(headcount(s)));
  return Math.round((hq + ind.rentBase * rentedExtraSites(s) + ind.rentPerHead * headcount(s)) * s.rentIndex * workstyleOf(s).rent * (s.strat?.green?.includes('solar') ? 0.94 : 1));
}
export const buildingPrice = (s: GameState): Pence => Math.round((industryOf(s).rentBase * s.rentIndex * BUILDING_MONTHS) / 10000) * 10000;
export const buildingSaving = (s: GameState): Pence => Math.round(industryOf(s).rentBase * s.rentIndex);

export function buildingCheck(s: GameState): { ok: boolean; reason?: string; price: Pence } {
  const price = buildingPrice(s);
  if (ownsBuilding(s)) return { ok: false, reason: 'You already own your headquarters.', price };
  if (s.month < BUILDING_MIN_MONTH) return { ok: false, reason: `Sellers want a track record: wait until month ${BUILDING_MIN_MONTH + 1}.`, price };
  return { ok: true, price };
}

export function buyBuilding(s: GameState): void {
  const price = buildingPrice(s);
  post(s.ledger, s.month, 'Purchase of the headquarters building', [dr('ppe', price), cr('cash', price)], { cf: 'investing', cfLabel: 'Purchase of property, plant & equipment' });
  s.ppeAssets.push({ id: newId(s, 'A'), label: 'Headquarters building', cost: price, lifeMonths: 600, accumulated: 0 });
  s.ownsBuilding = true;
  logItem(s, 'milestone', 'You own your headquarters', `${formatGBP(price)} paid. You stop paying ${formatGBP(buildingSaving(s))} a month in base rent.`);
}

/** Yearly upkeep while you own the building. Called when a year starts. */
export function buildingUpkeep(s: GameState): Pence {
  if (!ownsBuilding(s)) return 0;
  const asset = s.ppeAssets.find((a) => a.label === 'Headquarters building');
  return asset ? Math.round(asset.cost * UPKEEP_RATE) : 0;
}
