import { hashSeed } from '../rng';
import type { RoleId } from './industries';
import { industryOf, ROLE_IDS } from './industries';
import type { GameState } from './state';

/**
 * The people behind the headcount: every hire has a name and a personality, worked out from the
 * company's seed so the same company always has the same team. Cosmetic, except that they are the
 * people who make requests of you.
 */
export type Personality = 'keen' | 'sceptic' | 'joker' | 'perfectionist' | 'dreamer';
export const PERSONALITIES: Record<Personality, { name: string; blurb: string }> = {
  keen: { name: 'Keen', blurb: 'Always first in, always has an idea.' },
  sceptic: { name: 'Sceptic', blurb: 'Asks the awkward question that saves you money.' },
  joker: { name: 'Joker', blurb: 'Keeps spirits up, even in a bad month.' },
  perfectionist: { name: 'Perfectionist', blurb: 'Will not ship it until it is right.' },
  dreamer: { name: 'Dreamer', blurb: 'Big plans, occasionally lost in them.' },
};
const PERSONALITY_IDS = Object.keys(PERSONALITIES) as Personality[];

const FIRST = ['Maya', 'Tom', 'Priya', 'Jack', 'Zoe', 'Omar', 'Lucy', 'Ravi', 'Ella', 'Sam', 'Nina', 'Ben', 'Aisha', 'Leo', 'Freya', 'Dan', 'Mei', 'Joe', 'Ivy', 'Kofi', 'Tess', 'Hugo', 'Sara', 'Finn'];
const LAST = ['Patel', 'Hughes', 'Okafor', 'Reid', 'Novak', 'Brown', 'Chen', 'Walsh', 'Singh', 'Moore', 'Ali', 'Kerr', 'Diaz', 'Grant', 'Shaw', 'Lowe'];

export interface Teammate {
  id: string;
  name: string;
  role: RoleId;
  title: string;
  personality: Personality;
}

export const ROSTER_SHOWN = 12;

/** The first twelve people, by role then order of hire (so firing someone removes the newest first). */
export function rosterOf(s: GameState): Teammate[] {
  const ind = industryOf(s);
  const out: Teammate[] = [];
  for (const role of ROLE_IDS) {
    for (let i = 0; i < s.staff[role]; i++) {
      const h = hashSeed(`${s.seedLabel}:${role}:${i}`);
      out.push({
        id: `${role}${i}`, name: `${FIRST[h % FIRST.length]} ${LAST[(h >>> 8) % LAST.length]}`, role, title: ind.roles[role].title.replace(/s$/, ''),
        personality: PERSONALITY_IDS[(h >>> 16) % PERSONALITY_IDS.length],
      });
    }
  }
  return out.slice(0, ROSTER_SHOWN);
}

/** How a person feels, from team morale. */
export const moodOf = (morale: number): { label: string; face: string } =>
  morale >= 70 ? { label: 'Buzzing', face: '😄' } : morale >= 55 ? { label: 'Steady', face: '🙂' } : morale >= 40 ? { label: 'Restless', face: '😕' } : { label: 'Unhappy', face: '😟' };
