import { addBoxes } from './boxes';
import type { Profile } from './prestige';

/**
 * The gem economy. Gems come from three kinds of source:
 *  - real-time habits (daily login, quests, puzzles, the monthly season pass), limited by the clock;
 *  - one-off firsts (achievements, milestones, album pages), limited by how many there are;
 *  - repeatable play (missions, level-ups, prestige, award boxes), which follows game time. Game time
 *    runs up to four times faster, so these share a daily allowance; beyond it play still earns XP,
 *    Legacy points and progress, just not gems. Measured with scripts/gems.ts.
 */

/** Gems a day from missions and level-ups together. */
export const DAILY_PLAY_GEMS = 30;
/** Gems for a prestige, paid for the first prestige of each day. */
export const PRESTIGE_GEMS = 30;
export const PAID_PRESTIGES_PER_DAY = 1;
/** Mystery boxes a day from winning annual awards. */
export const AWARD_BOXES_PER_DAY = 1;

/** Today's gems and boxes from repeatable play. */
export interface PlayGems { day: string; gems: number; boxes: number; prestiges: number }

export const playGemsOf = (p: Pick<Profile, 'playGems'>, day: string): PlayGems =>
  p.playGems?.day === day ? p.playGems : { day, gems: 0, boxes: 0, prestiges: 0 };

/** Gems still available today from missions and level-ups. */
export const playGemsLeft = (p: Pick<Profile, 'playGems'>, day: string): number => Math.max(0, DAILY_PLAY_GEMS - playGemsOf(p, day).gems);

/** Pay gems from missions or level-ups, up to what's left of today's allowance. */
export function payPlayGems<T extends Pick<Profile, 'gems' | 'playGems'>>(p: T, day: string, want: number): { profile: T; paid: number } {
  const cur = playGemsOf(p, day);
  const paid = Math.max(0, Math.min(want, DAILY_PLAY_GEMS - cur.gems));
  return { profile: { ...p, gems: p.gems + paid, playGems: { ...cur, gems: cur.gems + paid } }, paid };
}

/** Pay the prestige gems if this is one of today's paid prestiges. */
export function payPrestigeGems<T extends Pick<Profile, 'gems' | 'playGems'>>(p: T, day: string): { profile: T; paid: number } {
  const cur = playGemsOf(p, day);
  const paid = cur.prestiges < PAID_PRESTIGES_PER_DAY ? PRESTIGE_GEMS : 0;
  return { profile: { ...p, gems: p.gems + paid, playGems: { ...cur, prestiges: cur.prestiges + 1 } }, paid };
}

/** Grant mystery boxes for awards won, up to today's limit. */
export function grantAwardBoxes<T extends Pick<Profile, 'boxes' | 'playGems'>>(p: T, day: string, won: number): { profile: T; granted: number } {
  const cur = playGemsOf(p, day);
  const granted = Math.max(0, Math.min(won, AWARD_BOXES_PER_DAY - cur.boxes));
  const next = granted > 0 ? addBoxes(p, granted) : p;
  return { profile: { ...next, playGems: { ...cur, boxes: cur.boxes + granted } }, granted };
}
