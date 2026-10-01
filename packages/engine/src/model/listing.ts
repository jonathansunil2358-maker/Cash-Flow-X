import { formatGBP, gbp, type Pence } from '../money';
import type { Rng } from '../rng';
import { revenueGrowth, trailingPL } from './metrics';
import { valuationOf } from './valuation';
import { outsideShares } from './investors';
import { logItem, type GameState } from './state';

/**
 * Stock market listing. Floating the company sells new shares to the public (the owner is
 * diluted but gets a big cash injection), after which a share price moves with the company's
 * value and the market's mood. Each quarter the market expects a profit; beat it and sentiment
 * rises, miss it and the price and your reputation fall. A listed company can raise money
 * cheaply at the market price and buy its shares back when they are cheap.
 */
export const LIST_MIN_EQUITY: Pence = gbp(5_000_000);
export const LIST_MIN_MONTH = 24;
export const LIST_SELL_FRACTION = 0.2;
export const LIST_DISCOUNT = 0.9;
export const LIST_FEE = 0.06;
/** Compliance, auditors and investor relations, every month while listed. */
export const LISTED_MONTHLY_COST: Pence = gbp(3000);
export const LISTED_DEMAND = 1.03;
export const PRICE_HISTORY = 24;
export const GUIDANCE_QUARTER = 3;
export const BEAT_BOOST = 0.06;
export const MISS_HIT = 0.12;
export const MISS_REPUTATION = 3;
export const MAX_BUYBACK_SHARE = 0.05;

export const listedDemandMult = (s: GameState): number => (s.listed ? LISTED_DEMAND : 1);

/** Shares held by the public: everything not owned by you or by holding-company investors. */
export const publicFloat = (s: GameState): number => Math.max(0, s.shares.total - s.shares.owner - outsideShares(s));

/** What the books say each share is worth, and the market's price (book value x mood). */
export function equityPerShare(s: GameState): Pence {
  return Math.round(valuationOf(s).equityValue / Math.max(1, s.shares.total));
}
export const sharePrice = (s: GameState): Pence => s.priceHistory.at(-1) ?? Math.round(equityPerShare(s) * s.sentiment);
export const marketCap = (s: GameState): Pence => sharePrice(s) * s.shares.total;

export interface ListCheck {
  allowed: boolean;
  reason?: string;
  equity: Pence;
  shares: number;
  pricePerShare: Pence;
  proceeds: Pence;
  fee: Pence;
}

export function listCheck(s: GameState): ListCheck {
  const equity = valuationOf(s).equityValue;
  const f = LIST_SELL_FRACTION;
  const shares = Math.round((s.shares.total * f) / (1 - f));
  const pricePerShare = Math.round((equity / s.shares.total) * LIST_DISCOUNT);
  const gross = shares * pricePerShare;
  const fee = Math.round(gross * LIST_FEE);
  const base = { equity, shares, pricePerShare, proceeds: gross - fee, fee };
  if (s.listed) return { ...base, allowed: false, reason: 'Already listed.' };
  if (s.month < LIST_MIN_MONTH) return { ...base, allowed: false, reason: `Investors want ${LIST_MIN_MONTH} months of accounts first.` };
  if (equity < LIST_MIN_EQUITY) return { ...base, allowed: false, reason: `Listing needs a company worth at least ${formatGBP(LIST_MIN_EQUITY)} (yours: ${formatGBP(Math.max(0, equity))}).` };
  if (trailingPL(s, 12).summary.profit <= 0) return { ...base, allowed: false, reason: 'The market will not buy a company that lost money over the last 12 months.' };
  return { ...base, allowed: true };
}

/** The mood the price drifts back to: bigger for fast growers. */
export const baseSentiment = (s: GameState): number => 1 + Math.min(0.6, Math.max(-0.3, revenueGrowth(s))) * 0.5;

/** Profit the market expects over the next quarter: a little more than the last one. */
export function nextGuidance(s: GameState): Pence {
  const actual = trailingPL(s, GUIDANCE_QUARTER).summary.profit;
  return actual > 0 ? Math.round(actual * 1.04) : Math.round(actual * 0.8);
}

/** Called once a month while listed, before the month closes. Draws one random number. */
export function advanceListing(s: GameState, rng: Rng, simulation: boolean): void {
  if (!s.listed) return;
  s.sentiment += (baseSentiment(s) - s.sentiment) * 0.15 + (rng.next() - 0.5) * 0.08;
  if (s.guidance && s.month >= s.guidance.month) {
    const actual = trailingPL(s, GUIDANCE_QUARTER).summary.profit;
    if (actual >= s.guidance.target) {
      s.sentiment += BEAT_BOOST;
      if (!simulation) logItem(s, 'milestone', 'Beat the market\'s expectations', `Quarterly profit ${formatGBP(actual)} against ${formatGBP(s.guidance.target)} expected. The share price rose.`);
    } else {
      s.sentiment -= MISS_HIT;
      s.reputation = Math.max(0, s.reputation - MISS_REPUTATION);
      if (!simulation) logItem(s, 'warning', 'Missed the market\'s expectations', `Quarterly profit ${formatGBP(actual)} against ${formatGBP(s.guidance.target)} expected. The share price fell and your reputation took a knock.`);
    }
    s.guidance = { month: s.month + GUIDANCE_QUARTER, target: nextGuidance(s) };
  }
  s.sentiment = Math.min(1.8, Math.max(0.4, s.sentiment));
  const price = Math.max(1, Math.round(equityPerShare(s) * s.sentiment));
  s.priceHistory.push(price);
  if (s.priceHistory.length > PRICE_HISTORY) s.priceHistory.shift();
}

export function floatCheck(s: GameState, amount: Pence): { ok: boolean; reason?: string; shares: number; price: Pence } {
  const price = sharePrice(s);
  const shares = price > 0 ? Math.floor(amount / price) : 0;
  if (!s.listed) return { ok: false, reason: 'Only a listed company can buy back shares.', shares, price };
  if (shares < 1) return { ok: false, reason: 'Not enough money to buy one share.', shares, price };
  if (shares > publicFloat(s)) return { ok: false, reason: 'You cannot buy back more shares than the public holds.', shares, price };
  if (shares > Math.floor(s.shares.total * MAX_BUYBACK_SHARE)) return { ok: false, reason: `At most ${MAX_BUYBACK_SHARE * 100}% of all shares can be bought back at once.`, shares, price };
  return { ok: true, shares, price };
}
