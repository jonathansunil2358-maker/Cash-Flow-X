import { applyActionInPlace } from '../actions';
import { plSummary } from '../ledger/statements';
import { headcount, type GameState } from './state';

/**
 * Run the company's standing orders at the start of a month. Each step is an ordinary action applied
 * with the same checks as when a player does it; one that cannot be afforded is simply skipped. No
 * randomness, so replays agree.
 */
export function runAutopilot(s: GameState): void {
  const rules = s.rules;
  if (!rules?.length || s.status !== 'playing') return;
  const last = s.history.at(-1);
  if (!last) return;
  const revenue = plSummary(last.period.pl).revenue;
  const cash = s.ledger.balances.cash;
  const floor = rules.find((r) => r.kind === 'cashFloor');
  const underFloor = !!floor && floor.kind === 'cashFloor' && cash < floor.floor;
  const attempt = (a: Parameters<typeof applyActionInPlace>[1]) => { try { applyActionInPlace(s, a, false); } catch { /* skipped: not allowed or not affordable */ } };

  for (const r of rules) {
    if (r.kind === 'marketingPct') {
      const target = Math.round((revenue * r.pct) / 100 / 100) * 100;
      if (target !== s.marketingBudget && !underFloor) attempt({ type: 'setMarketing', amount: target });
    } else if (r.kind === 'hireWhenFull') {
      const monthlyCost = Math.max(1, last.period.pl ? plSummary(last.period.pl).opex : 1);
      if (!underFloor && last.kpis.utilisation >= 0.95 && cash > monthlyCost * 4 && headcount(s) < 400) attempt({ type: 'hire', role: r.role, count: 1 });
    } else if (r.kind === 'cashFloor' && underFloor && s.marketingBudget > 0) {
      attempt({ type: 'setMarketing', amount: Math.round(s.marketingBudget / 2 / 100) * 100 });
    }
  }
}
