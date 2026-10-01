import { hashSeed } from '../rng';
import { adjustReputation } from './events';
import { industryOf } from './industries';
import { effectivePrice } from './promotions';
import { logItem, type GameState } from './state';

/**
 * Customer reviews: five reviews a month, written from your real quality, price and how stretched your team is.
 * Replying to a review (twice a month at most) moves your reputation a little: more for a bad one.
 */
export interface Review { index: number; stars: 1 | 2 | 3 | 4 | 5; who: string; text: string; replied: boolean }
const WHO = ['Sam', 'Priya', 'Mr Okafor', 'Dana', 'Jess', 'Tom', 'Aisha', 'Luca', 'Mrs Brown', 'Chris'];
const GOOD = ['Brilliant. Will be back.', 'Exactly what I needed, and fast.', 'Great quality for the money.', 'The team could not have been kinder.'];
const OK = ['Fine, nothing special.', 'Does the job, a bit pricey.', 'Good, but they were rushed.'];
const BAD = ['Disappointing. Not as described.', 'Too expensive for what you get.', 'Long wait and nobody seemed to care.', 'Would not recommend.'];
export const MAX_REPLIES_PER_MONTH = 2;

export function reviewsOf(s: GameState): Review[] {
  const ind = industryOf(s);
  const q = Math.min(1, Math.max(0, s.quality / 100));
  const priceFit = Math.min(1, Math.max(0, 1 - (effectivePrice(s) / ind.basePrice - 1) * 0.8));
  const util = s.history.at(-1)?.kpis.utilisation ?? 0.5;
  const service = util > 1 ? 0.25 : 1 - Math.max(0, util - 0.7);
  const score = q * 0.5 + priceFit * 0.25 + service * 0.25;
  return Array.from({ length: 5 }, (_, i) => {
    const h = hashSeed(`${s.seedLabel}:rev:${s.month}:${i}`);
    const noise = ((h % 1000) / 1000 - 0.5) * 0.5;
    const v = Math.min(1, Math.max(0, score + noise));
    const stars = (v > 0.8 ? 5 : v > 0.62 ? 4 : v > 0.45 ? 3 : v > 0.28 ? 2 : 1) as 1 | 2 | 3 | 4 | 5;
    const pool = stars >= 4 ? GOOD : stars === 3 ? OK : BAD;
    return { index: i, stars, who: WHO[(h >>> 10) % WHO.length], text: pool[(h >>> 16) % pool.length], replied: (s.replied ?? []).includes(`${s.month}.${i}`) };
  });
}
export function replyCheck(s: GameState, index: number): { ok: boolean; reason?: string } {
  if (!Number.isInteger(index) || index < 0 || index > 4) return { ok: false, reason: 'Pick one of the five reviews.' };
  if ((s.replied ?? []).includes(`${s.month}.${index}`)) return { ok: false, reason: 'You already replied to that one.' };
  const replies = (s.replied ?? []).filter((k) => k.startsWith(`${s.month}.`)).length;
  if (replies >= MAX_REPLIES_PER_MONTH) return { ok: false, reason: `You can reply to ${MAX_REPLIES_PER_MONTH} reviews a month.` };
  if (s.history.length === 0) return { ok: false, reason: 'You need some customers first.' };
  return { ok: true };
}
export function replyToReview(s: GameState, index: number): void {
  const r = reviewsOf(s)[index];
  s.replied = [...(s.replied ?? []), `${s.month}.${index}`].slice(-10);
  const gain = r.stars <= 2 ? 1.5 : r.stars === 3 ? 1 : 0.5;
  adjustReputation(s, gain);
  logItem(s, 'action', `Replied to ${r.who}'s review`, `${r.stars} stars: "${r.text}" Reputation +${gain}.`);
}
