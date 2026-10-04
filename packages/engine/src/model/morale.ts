import { workstyleOf } from './people';
import { gbp, type Pence } from '../money';
import type { Rng } from '../rng';
import { industryOf, ROLE_IDS, type RoleId } from './industries';
import { headcount, type GameState, type PayLevel } from './state';

/**
 * Team morale (0-100). Pay level, training and money worries push it around; it drives
 * productivity (capacity and R&D output) and, when low, people leaving. It is one number for
 * the whole team: hires are not individuals, so this stays cheap to simulate.
 */
export const PAY_LEVELS: PayLevel[] = ['below', 'market', 'above'];
/** Wage bill multiplier for each pay level. */
export const PAY_MULT: Record<PayLevel, number> = { below: 0.9, market: 1, above: 1.12 };
/** Morale pull of each pay level. */
export const PAY_MORALE: Record<PayLevel, number> = { below: -15, market: 0, above: 15 };
/** Morale a team settles at with market pay, no training and no worries. */
export const BASELINE_MORALE = 60;
export const MAX_TRAINING_EFFECT = 12;
/** Training equal to this share of the wage bill reaches the full effect. */
export const TRAINING_FULL_EFFECT_SHARE = 0.1;
export const MORALE_STRESS = 8;
export const MAX_TRAINING_SPEND: Pence = gbp(100_000);

/** Morale 60 is neutral (x1.0); the range is x0.82 at 0 to x1.12 at 100. */
export const moraleProductivity = (morale: number): number => 0.82 + 0.003 * morale;

/** Monthly gross payroll before on-costs, after the pay level. */
export function grossPayroll(s: GameState): Pence {
  const ind = industryOf(s);
  const base = ROLE_IDS.reduce((a, r) => a + s.staff[r] * ind.roles[r].salary, 0);
  return Math.round((base * s.salaryIndex * PAY_MULT[s.pay]) / 12);
}

export function trainingEffect(s: GameState): number {
  const payroll = grossPayroll(s);
  if (payroll <= 0 || s.trainingSpend <= 0) return 0;
  return Math.min(MAX_TRAINING_EFFECT, (MAX_TRAINING_EFFECT * (s.trainingSpend / payroll)) / TRAINING_FULL_EFFECT_SHARE);
}

/** What morale is heading towards this month. */
export function moraleTarget(s: GameState): number {
  const stressed = s.ledger.balances.cash < 0 ? MORALE_STRESS : 0;
  return Math.max(0, Math.min(100, BASELINE_MORALE + PAY_MORALE[s.pay] + trainingEffect(s) + workstyleOf(s).morale - stressed));
}

/** Chance that each person leaves this month: none at or above 60 morale, rising as it falls. */
export const leaveChance = (morale: number): number => (morale >= BASELINE_MORALE ? 0 : 0.004 + (BASELINE_MORALE - morale) * 0.001);

/** Move morale a fifth of the way to its target. */
export function advanceMorale(s: GameState): void {
  s.morale = Math.round((s.morale + (moraleTarget(s) - s.morale) * 0.2) * 100) / 100;
}

export interface Leaver {
  role: RoleId;
  count: number;
}

/**
 * People who leave this month. Expected leavers are the headcount times the leave chance; the
 * fractional part is settled with one roll per role.
 */
export function rollLeavers(s: GameState, rng: Rng): Leaver[] {
  const p = leaveChance(s.morale);
  if (p <= 0 || headcount(s) === 0) return [];
  const out: Leaver[] = [];
  for (const role of ROLE_IDS) {
    const expected = s.staff[role] * p;
    const whole = Math.floor(expected);
    const count = Math.min(s.staff[role], whole + (rng.next() < expected - whole ? 1 : 0));
    if (count > 0) out.push({ role, count });
  }
  return out;
}

/** Handover and backfill cost per leaver: one month's pay. */
export function leaverCost(s: GameState, role: RoleId): Pence {
  return Math.round((industryOf(s).roles[role].salary * s.salaryIndex * PAY_MULT[s.pay]) / 12);
}
