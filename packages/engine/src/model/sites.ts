import { gbp, type Pence } from '../money';
import type { IndustryConfig } from './industries';
import { industryOf } from './industries';
import { logItem, type GameState } from './state';

/**
 * Extra locations. A second (or third) site lifts capacity and the demand you can reach, but you
 * pay a fit-out (capitalised), a rent bill from day one, and management is spread thinner.
 */
export const MAX_SITES = 3;
export const SITE_OPEN_DELAY = 2;
export const SITE_MIN_MONTH = 6;
/** Each open extra site adds this share of the first site's capacity... */
export const SITE_CAPACITY = 0.5;
/** ...and this much market potential, but costs this much productivity. */
export const SITE_DEMAND = 0.12;
export const SITE_DRAG = 0.04;
/** Closing an extra site costs this many months of its rent as a break fee. */
export const SITE_BREAK_MONTHS = 3;
export const SITE_LIFE_MONTHS = 84;

/** Extra sites that are open and trading. */
export const extraSites = (s: GameState): number => Math.max(0, s.sites - 1);
/** Extra sites that are open or being built (all of them pay rent). */
export const rentedExtraSites = (s: GameState): number => extraSites(s) + s.pendingSites.length;

export const siteFitOutCost = (ind: IndustryConfig): Pence => Math.max(gbp(8000), ind.rentBase * 12);
export const siteRent = (s: GameState, ind: IndustryConfig): Pence => Math.round(ind.rentBase * s.rentIndex);

export const siteCapacityMult = (s: GameState): number => 1 + SITE_CAPACITY * extraSites(s);
export const siteDemandMult = (s: GameState): number => 1 + SITE_DEMAND * extraSites(s);
/** Productivity lost to managing several sites. */
export const siteProductivity = (s: GameState): number => Math.max(0.7, 1 - SITE_DRAG * extraSites(s));

export interface SiteCheck {
  allowed: boolean;
  reason?: string;
  cost: Pence;
  rent: Pence;
}

export function openSiteCheck(s: GameState): SiteCheck {
  const ind = industryOf(s);
  const base = { cost: siteFitOutCost(ind), rent: siteRent(s, ind) };
  if (s.month < SITE_MIN_MONTH) return { ...base, allowed: false, reason: `Prove the first site works: opens up in month ${SITE_MIN_MONTH + 1}.` };
  if (s.sites + s.pendingSites.length >= MAX_SITES) return { ...base, allowed: false, reason: `You already have the maximum of ${MAX_SITES} sites.` };
  return { ...base, allowed: true };
}

/** Called once a month: sites whose fit-out is finished open for business. */
export function advanceSites(s: GameState, simulation: boolean): void {
  if (!s.pendingSites.length) return;
  const opening = s.pendingSites.filter((m) => m <= s.month);
  if (!opening.length) return;
  s.pendingSites = s.pendingSites.filter((m) => m > s.month);
  s.sites += opening.length;
  if (!simulation) logItem(s, 'milestone', 'New site open', `Your ${s.sites === 2 ? 'second' : 'third'} location is open: more capacity and a wider reach, with a little less of your attention for each.`);
}
