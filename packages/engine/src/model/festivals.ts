import type { Profile } from './prestige';

/**
 * Seasonal festivals: a few weeks a year with a theme, a free treat to claim once a year, and a limited hat
 * that is only sold while the festival lasts (you keep it for good). Purely cosmetic and client-side.
 */
export interface Festival { id: string; name: string; emoji: string; blurb: string; from: [number, number]; to: [number, number]; gems: number }
export const FESTIVALS: Festival[] = [
  { id: 'spring', name: 'Spring Bloom', emoji: '🌸', blurb: 'Blossom on the island and bunny ears in the shop.', from: [3, 20], to: [4, 20], gems: 25 },
  { id: 'summer', name: 'Summer Fair', emoji: '☀️', blurb: 'Long evenings, sun hats and lemonade.', from: [7, 10], to: [8, 25], gems: 25 },
  { id: 'halloween', name: 'Spooky Season', emoji: '🎃', blurb: 'Pumpkins, bats and a very friendly ghost.', from: [10, 20], to: [11, 2], gems: 25 },
  { id: 'winter', name: 'Winter Lights', emoji: '🎄', blurb: 'Fairy lights, snow and festive hats.', from: [12, 10], to: [1, 3], gems: 40 },
];
const inWindow = (d: Date, f: Festival): boolean => {
  const key = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const a = f.from[0] * 100 + f.from[1];
  const b = f.to[0] * 100 + f.to[1];
  return a <= b ? key >= a && key <= b : key >= a || key <= b;
};
/** The festival on at `now`, if any. */
export const festivalOn = (now: Date = new Date()): Festival | null => FESTIVALS.find((f) => inWindow(now, f)) ?? null;
export const festivalClaimed = (p: Pick<Profile, 'festivals'>, f: Festival, now: Date = new Date()): boolean => (p.festivals ?? {})[f.id] === now.getUTCFullYear();
export function claimFestival<T extends Pick<Profile, 'festivals' | 'gems'>>(p: T, now: Date = new Date()): T {
  const f = festivalOn(now);
  if (!f) throw new Error('There is no festival on right now.');
  if (festivalClaimed(p, f, now)) throw new Error('You already claimed this festival treat.');
  return { ...p, gems: p.gems + f.gems, festivals: { ...(p.festivals ?? {}), [f.id]: now.getUTCFullYear() } };
}
