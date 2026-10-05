import { cr, dr, post } from '../ledger/journal';
import { plSummary } from '../ledger/statements';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { EVENTS8, POLICIES, policyById, type PolEff, type PolicyDef } from './data8';
import { industryOf } from './industries';
import { logItem, type GameState } from './state';

export { POLICIES, EVENTS8 };
export interface Play8 { pol?: Record<string, number>; changed?: Record<string, number>; last?: Record<string, number>; anyEvent?: number }
export const play8Of = (s: GameState): Play8 => (s.play8 ??= {});
export const lastRev8 = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
export const roll8 = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;
const round100 = (n: number): Pence => Math.round(n / 100) * 100;
export const POLICY_COOLDOWN = 3;

export const optionOf = (s: GameState, id: string): number => s.play8?.pol?.[id] ?? 0;
export const policiesFor = (s: GameState): PolicyDef[] => POLICIES.filter((p) => !p.stock || industryOf(s).model === 'unit');
export const setupCost = (s: GameState, id: string, option: number): Pence => {
  const o = policyById(id)?.options[option];
  return o?.setup ? Math.max(500_00, round100(lastRev8(s) * o.setup)) : 0;
};
export function policyCheck(s: GameState, id: string, option: number): { ok: boolean; reason?: string; fee: Pence } {
  const p = policyById(id);
  if (!p) return { ok: false, reason: 'Unknown policy.', fee: 0 };
  const fee = setupCost(s, id, option);
  if (!Number.isInteger(option) || option < 0 || option >= p.options.length) return { ok: false, reason: 'Unknown option.', fee };
  if (p.stock && industryOf(s).model !== 'unit') return { ok: false, reason: 'That only applies to businesses that hold stock.', fee };
  if (option === optionOf(s, id)) return { ok: false, reason: 'That is already your choice.', fee };
  if (s.month < 3) return { ok: false, reason: 'Wait until you have traded for a few months.', fee };
  const ch = s.play8?.changed?.[id];
  if (ch !== undefined && s.month - ch < POLICY_COOLDOWN) return { ok: false, reason: `Give it ${POLICY_COOLDOWN - (s.month - ch)} more months before changing it again.`, fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `Setting it up costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function setPolicy(s: GameState, id: string, option: number): void {
  const p = policyById(id)!;
  const fee = setupCost(s, id, option);
  if (fee > 0) post(s.ledger, s.month, `Policy set-up: ${p.name}`, [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  const q = play8Of(s);
  q.pol = { ...(q.pol ?? {}), [id]: option }; q.changed = { ...(q.changed ?? {}), [id]: s.month };
  if (option === 0) { const { [id]: _drop, ...rest } = q.pol; q.pol = rest; }
  logItem(s, 'action', `${p.name}: ${p.options[option].name}`, p.options[option].blurb);
}

/** The effects of every option you have chosen, combined. */
export function activeEffects(s: GameState): PolEff[] {
  const out: PolEff[] = [];
  for (const [id, o] of Object.entries(s.play8?.pol ?? {})) { const e = policyById(id)?.options[o]?.eff; if (e) out.push(e); }
  return out;
}
const prod = (s: GameState, k: 'd' | 'c' | 'cap' | 'ch' | 'hire' | 'od'): number => activeEffects(s).reduce((a, e) => a * (e[k] ?? 1), 1);
export const play8Demand = (s: GameState): number => prod(s, 'd');
export const play8Cost = (s: GameState): number => prod(s, 'c');
export const play8Capacity = (s: GameState): number => prod(s, 'cap');
export const play8Churn = (s: GameState): number => prod(s, 'ch');
export const play8Hire = (s: GameState): number => prod(s, 'hire');
export const play8Overdraft = (s: GameState): number => prod(s, 'od');
export const play8Quality = (s: GameState): number => activeEffects(s).reduce((a, e) => a + (e.q ?? 0), 0);
export const play8Key = (s: GameState): string => Object.entries(s.play8?.pol ?? {}).map(([k, v]) => `${k}${v}`).join(',');

/** What your policies cost or save in a typical month, as a share of sales (for the card). */
export const runningPct = (s: GameState): number => Object.entries(s.play8?.pol ?? {}).reduce((a, [id, o]) => a + (policyById(id)?.options[o]?.monthly ?? 0), 0);
export const runningCost = (s: GameState): Pence => Math.round((lastRev8(s) * runningPct(s)) / 100);
