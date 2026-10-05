import { formatGBP } from '../money';
import { bossOfRival } from './market';
import type { Profile } from './prestige';
import type { GameState } from './state';

/**
 * Your nemesis: the strongest rival of the company you last finished. They remember how you left it and
 * come back in your next company's news, taunting you to do better. Cosmetic: stored with your profile.
 */
export interface Nemesis { name: string; boss: string; catchphrase: string; company: string; stake: number }
export const nemesisOf = (p: Pick<Profile, 'nemesis'>): Nemesis | null => p.nemesis ?? null;

export function rememberNemesis<T extends Pick<Profile, 'nemesis'>>(p: T, s: GameState, stake: number): T {
  if (!s.competitors.length) return p;
  let best = 0;
  s.competitors.forEach((c, i) => { if (c.strength * c.quality > s.competitors[best].strength * s.competitors[best].quality) best = i; });
  const boss = bossOfRival(s.competitors[best], best);
  return { ...p, nemesis: { name: s.competitors[best].name, boss: boss.name, catchphrase: boss.catchphrase, company: s.companyName, stake } };
}

export function nemesisTaunt(n: Nemesis, current: number): { text: string; beaten: boolean } {
  if (current > n.stake) return { text: `${n.boss}: "Fine. You are doing better than last time. Do not get comfortable."`, beaten: true };
  const gap = n.stake - current;
  return { text: `${n.boss}: "${n.catchphrase}" Last time you left ${n.company} at ${formatGBP(n.stake, { compact: true })}. You are ${formatGBP(gap, { compact: true })} short of that.`, beaten: false };
}
