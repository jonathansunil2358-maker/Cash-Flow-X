import { hashSeed } from '../rng';
import { ROLE_IDS, type RoleId } from './industries';
import type { GameState } from './state';

/**
 * The hiring market: each month four named candidates are looking for work. Hiring one costs more than a
 * nameless hire but brings a lasting perk. The candidates depend only on your company's seed and the month,
 * so the client and the server always see the same four.
 */
export interface Candidate { id: string; name: string; role: RoleId; skill: 1 | 2 | 3; quirk: string; perk: string }
export interface Star { id: string; name: string; role: RoleId; skill: number }

const FIRST = ['Amara', 'Ben', 'Chloe', 'Dev', 'Elena', 'Femi', 'Greta', 'Hugo', 'Ines', 'Jamal', 'Kira', 'Leo', 'Maya', 'Nico', 'Ola', 'Priya'];
const LAST = ['Adeyemi', 'Brooks', 'Castillo', 'Dalton', 'Evans', 'Fischer', 'Gupta', 'Hughes', 'Ito', 'Jovanovic', 'Khan', 'Lopez', 'Mbeki', 'Novak', 'Okafor', 'Patel'];
const QUIRKS = ['never misses a deadline', 'brings homemade cakes on Fridays', 'speaks four languages', 'once ran a marathon in fancy dress', 'keeps the best spreadsheets in town', 'is weirdly good at calming angry customers', 'has a notebook of every idea they have ever had', 'wins every pub quiz'];
export const MAX_STARS = 6;
export const MAX_STAR_HIRES_PER_MONTH = 1;

export const PERK_TEXT: Record<RoleId, (skill: number) => string> = {
  ops: (k) => `+${(k * 1.5).toFixed(1)}% capacity`,
  sales: (k) => `+${k * 2}% reach`,
  rnd: (k) => `+${(k * 0.02).toFixed(2)} quality a month`,
};

export function candidatesOf(s: GameState): Candidate[] {
  const out: Candidate[] = [];
  for (let i = 0; i < 4; i++) {
    const h = hashSeed(`${s.seedLabel}:cand:${s.month}:${i}`);
    const role = ROLE_IDS[h % ROLE_IDS.length];
    const skill = (1 + ((h >>> 5) % 3)) as 1 | 2 | 3;
    out.push({
      id: `m${s.month}-${i}`, role, skill,
      name: `${FIRST[(h >>> 8) % FIRST.length]} ${LAST[(h >>> 12) % LAST.length]}`,
      quirk: QUIRKS[(h >>> 16) % QUIRKS.length], perk: PERK_TEXT[role](skill),
    });
  }
  return out;
}

export const starsOf = (s: GameState): Star[] => s.stars ?? [];
/** The lasting perks of everyone you hired from the market. */
export function starEffects(s: GameState): { capacity: number; reach: number; quality: number } {
  let capacity = 1; let reach = 1; let quality = 0;
  for (const st of starsOf(s)) {
    if (st.role === 'ops') capacity += st.skill * 0.015;
    else if (st.role === 'sales') reach += st.skill * 0.02;
    else quality += st.skill * 0.02;
  }
  return { capacity, reach, quality };
}
export const starFeeMultiple = (c: Candidate): number => 1 + c.skill;
export function starCheck(s: GameState, id: string): { ok: boolean; reason?: string; candidate?: Candidate } {
  const c = candidatesOf(s).find((x) => x.id === id);
  if (!c) return { ok: false, reason: 'That candidate is no longer available.' };
  if (starsOf(s).length >= MAX_STARS) return { ok: false, reason: `You can keep at most ${MAX_STARS} stars on the team.` };
  if (starsOf(s).some((x) => x.id.startsWith(`m${s.month}-`))) return { ok: false, reason: 'You have already hired from the market this month.' };
  return { ok: true, candidate: c };
}
