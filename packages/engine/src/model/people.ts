import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { industryOf } from './industries';
import { MAX_STARS, starsOf } from './stars';
import { headcount, logItem, type GameState } from './state';

/**
 * People and culture: a training academy, a work-style policy, an annual innovation day, and hiring a star
 * away from a rival. Small, deterministic and kept in one optional state object.
 */
export type Workstyle = 'office' | 'hybrid' | 'remote';
export interface People {
  workstyle?: Workstyle;
  wsSince?: number;
  courses?: Record<string, number>;
  trained?: number;
  innovYear?: number;
  headhuntYear?: number;
}
export const peopleOf = (s: GameState): People => (s.people ??= {});

const perHead = (s: GameState, base: Pence): Pence => Math.round((headcount(s) * base * s.salaryIndex) / 100) * 100;
const roll = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;

// ---------------------------------------------------------------------------------------------
// Training academy
// ---------------------------------------------------------------------------------------------
export interface Course { id: string; name: string; blurb: string }
export const COURSES: Course[] = [
  { id: 'service', name: 'Customer service', blurb: 'Reputation +2 and morale +3.' },
  { id: 'technical', name: 'Technical skills', blurb: 'Product quality +3.' },
  { id: 'leadership', name: 'Leadership', blurb: 'Morale +6.' },
  { id: 'selling', name: 'Selling', blurb: 'Brand +8.' },
];
export const COURSE_COOLDOWN = 6;
export const COURSE_MIN_STAFF = 3;
export const courseCost = (s: GameState): Pence => perHead(s, 300_00);
/** Every four courses taken adds half a per cent to capacity, up to three per cent. */
export const academyCapacity = (s: GameState): number => 1 + Math.min(0.03, Math.floor((s.people?.trained ?? 0) / 4) * 0.005);

export function courseCheck(s: GameState, id: string): { ok: boolean; reason?: string; cost: Pence } {
  const cost = courseCost(s);
  if (!COURSES.some((c) => c.id === id)) return { ok: false, reason: 'Unknown course.', cost };
  if (headcount(s) < COURSE_MIN_STAFF) return { ok: false, reason: `Hire at least ${COURSE_MIN_STAFF} people first.`, cost };
  const last = s.people?.courses?.[id];
  if (last !== undefined && s.month - last < COURSE_COOLDOWN) return { ok: false, reason: `Everyone is trained for now: wait until month ${last + COURSE_COOLDOWN + 1}.`, cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `The course costs ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
export function takeCourse(s: GameState, id: string): void {
  const cost = courseCost(s);
  const c = COURSES.find((x) => x.id === id)!;
  post(s.ledger, s.month, `Training academy: ${c.name}`, [dr('wages', cost), cr('cash', cost)], { cf: 'operating' });
  const p = peopleOf(s);
  p.courses = { ...(p.courses ?? {}), [id]: s.month };
  p.trained = (p.trained ?? 0) + 1;
  if (id === 'service') { s.reputation = Math.min(100, s.reputation + 2); s.morale = Math.min(100, s.morale + 3); }
  if (id === 'technical') s.quality = Math.min(100, s.quality + 3);
  if (id === 'leadership') s.morale = Math.min(100, s.morale + 6);
  if (id === 'selling') s.brand += 8;
  logItem(s, 'action', `Training: ${c.name}`, `The team spent a day learning. Cost ${formatGBP(cost)}. ${c.blurb}`);
}

// ---------------------------------------------------------------------------------------------
// Work style
// ---------------------------------------------------------------------------------------------
export const WORKSTYLES: { id: Workstyle; name: string; blurb: string; rent: number; morale: number; quality: number }[] = [
  { id: 'office', name: 'All in the office', blurb: 'The usual. Full rent, nothing gained or lost.', rent: 1, morale: 0, quality: 0 },
  { id: 'hybrid', name: 'Hybrid', blurb: 'Rent 15% lower and morale +3, but a little less spark: quality drifts down 0.01 a month.', rent: 0.85, morale: 3, quality: -0.01 },
  { id: 'remote', name: 'Fully remote', blurb: 'Rent 30% lower and morale +5, but teams drift apart: quality drifts down 0.04 a month.', rent: 0.7, morale: 5, quality: -0.04 },
];
export const WORKSTYLE_COOLDOWN = 12;
export const workstyleOf = (s: GameState) => WORKSTYLES.find((w) => w.id === (s.people?.workstyle ?? 'office'))!;
export function workstyleCheck(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (!WORKSTYLES.some((w) => w.id === id)) return { ok: false, reason: 'Unknown policy.' };
  if ((s.people?.workstyle ?? 'office') === id) return { ok: false, reason: 'That is already your policy.' };
  const since = s.people?.wsSince;
  if (since !== undefined && s.month - since < WORKSTYLE_COOLDOWN) return { ok: false, reason: `Give it time: you can change again in month ${since + WORKSTYLE_COOLDOWN + 1}.` };
  return { ok: true };
}
export function setWorkstyle(s: GameState, id: Workstyle): void {
  const p = peopleOf(s);
  p.workstyle = id;
  p.wsSince = s.month;
  logItem(s, 'action', `Work style: ${WORKSTYLES.find((w) => w.id === id)!.name}`, WORKSTYLES.find((w) => w.id === id)!.blurb);
}

// ---------------------------------------------------------------------------------------------
// Innovation day
// ---------------------------------------------------------------------------------------------
export const innovationCost = (s: GameState): Pence => perHead(s, 250_00);
export function innovationCheck(s: GameState): { ok: boolean; reason?: string; cost: Pence } {
  const cost = innovationCost(s);
  const year = Math.floor(s.month / 12);
  if (headcount(s) < COURSE_MIN_STAFF) return { ok: false, reason: `Hire at least ${COURSE_MIN_STAFF} people first.`, cost };
  if (s.people?.innovYear === year) return { ok: false, reason: 'You already had an innovation day this year.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `It costs ${formatGBP(cost)} in lost work and pizza.`, cost };
  return { ok: true, cost };
}
export function innovationDay(s: GameState): void {
  const cost = innovationCost(s);
  post(s.ledger, s.month, 'Innovation day: lost work, prizes and pizza', [dr('otherCosts', cost), cr('cash', cost)], { cf: 'operating' });
  peopleOf(s).innovYear = Math.floor(s.month / 12);
  if (roll(s, `innov:${s.month}`) < 550) {
    s.quality = Math.min(100, s.quality + 4);
    s.brand += 8;
    logItem(s, 'milestone', 'Innovation day produced a surprise product', 'A side project turned out brilliant: quality +4 and brand +8.');
  } else {
    s.morale = Math.min(100, s.morale + 5);
    logItem(s, 'notice', 'Innovation day was great fun', 'No new product, but the team loved it: morale +5.');
  }
}

// ---------------------------------------------------------------------------------------------
// Headhunting a star from a rival
// ---------------------------------------------------------------------------------------------
export const HEADHUNT_MIN_MONTH = 12;
export function headhuntFee(s: GameState, role: 'ops' | 'rnd' | 'sales'): Pence {
  return Math.round(industryOf(s).roles[role].salary * s.salaryIndex * industryOf(s).recruitmentPct) * 4;
}
export function headhuntCheck(s: GameState, role: string): { ok: boolean; reason?: string; fee: Pence } {
  if (role !== 'ops' && role !== 'rnd' && role !== 'sales') return { ok: false, reason: 'Unknown role.', fee: 0 };
  const fee = headhuntFee(s, role);
  const total = fee + Math.round(fee / 4) + industryOf(s).equipmentPerHire;
  if (s.month < HEADHUNT_MIN_MONTH) return { ok: false, reason: `Wait until month ${HEADHUNT_MIN_MONTH + 1}: nobody leaves a rival for a start-up.`, fee };
  if (starsOf(s).length >= MAX_STARS) return { ok: false, reason: `You can keep at most ${MAX_STARS} stars.`, fee };
  if (s.people?.headhuntYear === Math.floor(s.month / 12)) return { ok: false, reason: 'You already poached someone this year.', fee };
  if (s.ledger.balances.cash < total) return { ok: false, reason: `It costs ${formatGBP(total)}.`, fee };
  return { ok: true, fee };
}
export const RIVAL_STAR_NAMES = ['Sasha Vance', 'Rory Kline', 'Tamsin Hale', 'Idris Cole', 'Noor Baig', 'Callum Reeve'];
/** Returns the name of the rival the star came from. */
export function headhunt(s: GameState, role: 'ops' | 'rnd' | 'sales'): string {
  const fee = headhuntFee(s, role);
  post(s.ledger, s.month, 'Headhunter fee for a star from a rival', [dr('recruitment', fee), cr('cash', fee)], { cf: 'operating' });
  const i = roll(s, `hh:${s.month}`, Math.max(1, s.competitors.length));
  const rival = s.competitors[i];
  if (rival) rival.strength = Math.max(0.3, rival.strength * 0.97);
  const name = RIVAL_STAR_NAMES[roll(s, `hhn:${s.month}`, RIVAL_STAR_NAMES.length)];
  s.stars = [...starsOf(s), { id: `hh${s.month}`, name, role, skill: 3 }];
  peopleOf(s).headhuntYear = Math.floor(s.month / 12);
  return rival?.name ?? 'a rival';
}
