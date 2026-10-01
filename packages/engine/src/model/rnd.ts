import { cr, dr } from '../ledger/journal';
import { gbp, type Pence } from '../money';
import type { Rng } from '../rng';
import { logItem, type GameState, type RdProject } from './state';

/**
 * R&D projects: named, multi-month bets that your R&D team works on. Each costs money every
 * month, needs three R&D staff per project running at once, and may fail. Success pays off
 * permanently through the same modifiers that upgrades and perks use.
 */
export interface ProjectDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  months: number;
  /** Total cost, spread evenly over the months. */
  cost: Pence;
  /** Permanent effect on success (quality is a one-off boost). */
  market?: number;
  unitCost?: number;
  quality?: number;
}

export const HEADS_PER_PROJECT = 3;
export const PROJECT_BASE_SUCCESS = 0.75;
export const PROJECT_MAX_SUCCESS = 0.92;
export const FAILURE_MORALE_HIT = 5;

export const PROJECTS: ProjectDef[] = [
  { id: 'productLine', name: 'New product line', icon: 'rocket', months: 6, cost: gbp(30_000), market: 0.1,
    description: 'Opens a new segment: 10% more market for good.' },
  { id: 'costCutting', name: 'Cost-cutting programme', icon: 'gear', months: 4, cost: gbp(15_000), unitCost: -0.05,
    description: 'Redesign how you serve customers: unit costs 5% lower for good.' },
  { id: 'qualityLeap', name: 'Quality leap', icon: 'star', months: 5, cost: gbp(22_000), quality: 8,
    description: 'A big step forward in what you offer: quality +8 points at once.' },
];

export const projectDef = (id: string): ProjectDef | undefined => PROJECTS.find((p) => p.id === id);

/** How many projects the R&D team can run at once. */
export const projectSlots = (s: GameState): number => Math.floor(s.staff.rnd / HEADS_PER_PROJECT);

export const monthlyProjectCost = (def: ProjectDef): Pence => Math.round(def.cost / def.months / 100) * 100;

/** Chance a finished project succeeds: a happy team and a strong product help. */
export function projectSuccessChance(s: GameState): number {
  const bonus = Math.max(0, s.morale - 60) * 0.01 + Math.max(0, s.quality - 50) * 0.002;
  return Math.min(PROJECT_MAX_SUCCESS, PROJECT_BASE_SUCCESS + bonus);
}

export interface ProjectCheck {
  allowed: boolean;
  reason?: string;
}

export function projectCheck(s: GameState, id: string): ProjectCheck {
  const def = projectDef(id);
  if (!def) return { allowed: false, reason: 'Unknown project.' };
  if (s.projectsDone.includes(id)) return { allowed: false, reason: `${def.name} is already complete.` };
  if (s.projects.some((p) => p.id === id)) return { allowed: false, reason: `${def.name} is already under way.` };
  const slots = projectSlots(s);
  if (slots <= s.projects.length) {
    return { allowed: false, reason: slots === 0
      ? `You need at least ${HEADS_PER_PROJECT} R&D staff to run a project.`
      : `Your R&D team is fully booked (${slots} project${slots === 1 ? '' : 's'} at a time). Hire ${HEADS_PER_PROJECT} more R&D staff for another.` };
  }
  return { allowed: true };
}

export interface ProjectModifiers {
  marketMult: number;
  unitCostMult: number;
}

export function projectModifiers(done: readonly string[]): ProjectModifiers {
  const m: ProjectModifiers = { marketMult: 1, unitCostMult: 1 };
  for (const id of done) {
    const def = projectDef(id);
    if (def?.market) m.marketMult *= 1 + def.market;
    if (def?.unitCost) m.unitCostMult *= 1 + def.unitCost;
  }
  return m;
}

type Poster = (memo: string, lines: ReturnType<typeof dr>[], cf?: 'operating' | 'investing' | 'financing' | 'none', cfLabel?: string) => void;

/**
 * Advance every project one month: pay its cost, count it down, and roll for success at the end.
 * A project only moves while the team is big enough for it (people leaving stalls the last ones).
 */
export function advanceProjects(s: GameState, rng: Rng, P: Poster, simulation: boolean): void {
  const finished: RdProject[] = [];
  s.projects.forEach((p, i) => {
    const def = projectDef(p.id);
    if (!def || s.staff.rnd < HEADS_PER_PROJECT * (i + 1)) return;
    const cost = monthlyProjectCost(def);
    P(`R&D project: ${def.name}`, [dr('research', cost), cr('cash', cost)]);
    p.monthsLeft -= 1;
    if (p.monthsLeft <= 0) finished.push(p);
  });
  for (const p of finished) {
    const def = projectDef(p.id)!;
    s.projects = s.projects.filter((x) => x !== p);
    if (rng.next() < projectSuccessChance(s)) {
      s.projectsDone.push(def.id);
      if (def.quality) s.quality = Math.min(100, s.quality + def.quality);
      if (!simulation) logItem(s, 'notice', `${def.name} succeeded`, def.description);
    } else {
      s.morale = Math.max(0, s.morale - FAILURE_MORALE_HIT);
      if (!simulation) logItem(s, 'warning', `${def.name} failed`, `The team could not make it work. The money is spent, morale took a knock, and you can try again.`);
    }
  }
}
