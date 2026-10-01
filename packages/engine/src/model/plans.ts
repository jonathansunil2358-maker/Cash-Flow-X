import type { Action } from '../actions';
import type { GameState } from './state';
import type { Profile } from './prestige';

/**
 * Scenario plans: a named, relative set of changes (price, marketing, hires) that can be tried on a
 * forecast and then applied to any company. Relative, so a plan made last year still makes sense today.
 * Plans can be shared, so the shape is small and strictly checked.
 */
export interface Plan {
  id: string;
  name: string;
  /** Price change in percent, -30 to +30. */
  price: number;
  /** Marketing as a percent of today's budget, 0 to 300. */
  marketing: number;
  /** Extra operations hires, 0 to 8. */
  hires: number;
}

export const MAX_PLANS = 3;
export const PLAN_LIMITS = { price: [-30, 30], marketing: [0, 300], hires: [0, 8] } as const;

export function cleanPlan(raw: unknown): Plan | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const name = typeof p.name === 'string' ? p.name.replace(/[^\p{L}\p{N} .,'&!-]/gu, '').trim().slice(0, 30) : '';
  const price = Number(p.price), marketing = Number(p.marketing), hires = Number(p.hires);
  const ok = (v: number, [lo, hi]: readonly [number, number]) => Number.isInteger(v) && v >= lo && v <= hi;
  if (!name || !ok(price, PLAN_LIMITS.price) || !ok(marketing, PLAN_LIMITS.marketing) || !ok(hires, PLAN_LIMITS.hires)) return null;
  return { id: typeof p.id === 'string' && p.id ? p.id.slice(0, 36) : `p${Math.abs(hashish(name + price + marketing + hires))}`, name, price, marketing, hires };
}
const hashish = (str: string): number => { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0; return h; };

/** The actions that carry out a plan on this company, in the order they should be applied. */
export function planActions(s: GameState, plan: Plan): Action[] {
  const out: Action[] = [];
  if (plan.price !== 0) out.push({ type: 'setPrice', price: Math.max(100, Math.round((s.price * (100 + plan.price)) / 100 / 100) * 100) });
  if (plan.marketing !== 100) out.push({ type: 'setMarketing', amount: Math.round((s.marketingBudget * plan.marketing) / 100 / 100) * 100 });
  if (plan.hires > 0) out.push({ type: 'hire', role: 'ops', count: plan.hires });
  return out;
}

export const plansOf = (p: Pick<Profile, 'plans'>, max = MAX_PLANS): Plan[] => (p.plans ?? []).map(cleanPlan).filter((x): x is Plan => !!x).slice(0, max);

export function savePlan<T extends Pick<Profile, 'plans'>>(p: T, plan: unknown, max = MAX_PLANS): T {
  const c = cleanPlan(plan);
  if (!c) throw new Error('That plan is not valid.');
  const have = plansOf(p, 99).filter((x) => x.id !== c.id);
  if (have.length >= max) throw new Error(`You can keep ${max} plans. Delete one first.`);
  return { ...p, plans: [...have, c] };
}
export const deletePlan = <T extends Pick<Profile, 'plans'>>(p: T, id: string): T => ({ ...p, plans: plansOf(p, 99).filter((x) => x.id !== id) });
