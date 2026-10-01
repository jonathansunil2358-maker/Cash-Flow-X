import type { Pence } from '../money';

/**
 * Autopilot rules: a few simple standing orders the company follows every month. Setting them is a
 * player action, so replays see exactly the same rules. At most `MAX_RULES` run.
 */
export type AutoRule =
  | { kind: 'hireWhenFull'; role: 'ops' | 'sales' }
  | { kind: 'cashFloor'; floor: Pence }
  | { kind: 'marketingPct'; pct: number };

export const MAX_RULES = 3;
export const RULE_KINDS = ['hireWhenFull', 'cashFloor', 'marketingPct'] as const;

export const RULE_INFO: Record<AutoRule['kind'], { name: string; blurb: string }> = {
  hireWhenFull: { name: 'Hire when full', blurb: 'If you are more than 95% full and have plenty of cash, hire one more person.' },
  cashFloor: { name: 'Keep a cash floor', blurb: 'If cash falls below your floor, halve marketing and stop hiring until it recovers.' },
  marketingPct: { name: 'Marketing as a share of sales', blurb: 'Each month, set the marketing budget to a percentage of last month\'s revenue.' },
};

export interface RuleCheck {
  ok: boolean;
  reason?: string;
  rules: AutoRule[];
}

/** Check a list of rules from a player action: known kinds, sensible numbers, at most `max` of them. */
export function cleanRules(raw: unknown, max = MAX_RULES): RuleCheck {
  if (!Array.isArray(raw)) return { ok: false, reason: 'Rules must be a list.', rules: [] };
  if (raw.length > max) return { ok: false, reason: `You can have at most ${max} rules.`, rules: [] };
  const out: AutoRule[] = [];
  const seen = new Set<string>();
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object' || !RULE_KINDS.includes(r.kind as never)) return { ok: false, reason: 'Unknown rule.', rules: [] };
    if (seen.has(r.kind as string)) return { ok: false, reason: 'Each kind of rule can only be used once.', rules: [] };
    seen.add(r.kind as string);
    if (r.kind === 'hireWhenFull') {
      if (r.role !== 'ops' && r.role !== 'sales') return { ok: false, reason: 'Hire rules are for operations or sales.', rules: [] };
      out.push({ kind: 'hireWhenFull', role: r.role });
    } else if (r.kind === 'cashFloor') {
      if (!Number.isInteger(r.floor) || (r.floor as number) < 0 || (r.floor as number) > 100_000_000_00) return { ok: false, reason: 'The cash floor must be between £0 and £100m.', rules: [] };
      out.push({ kind: 'cashFloor', floor: r.floor as number });
    } else {
      if (!Number.isInteger(r.pct) || (r.pct as number) < 0 || (r.pct as number) > 30) return { ok: false, reason: 'Marketing must be 0 to 30% of revenue.', rules: [] };
      out.push({ kind: 'marketingPct', pct: r.pct as number });
    }
  }
  return { ok: true, rules: out };
}
