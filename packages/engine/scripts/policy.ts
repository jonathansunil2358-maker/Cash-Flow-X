/**
 * A simple heuristic "player" used for balancing and for tests. It is deliberately naive:
 * grow capacity with demand, keep a little R&D and sales, spend ~8% of revenue on marketing,
 * and borrow when cash gets tight.
 */
import {
  ActionError, applyActionInPlace, industryOf, loanOffer, plSummary, type Action, type GameState,
} from '../src/index';

export function policyActions(s: GameState): Action[] {
  const ind = industryOf(s);
  const last = s.history.at(-1);
  const out: Action[] = [];
  const cash = s.ledger.balances.cash;
  const revenue = last ? plSummary(last.period.pl).revenue : 0;

  if (s.month === 0) {
    out.push({ type: 'setMarketing', amount: 3_000_00 });
    // Only hire a specialist on day one when there is a real cash cushion.
    if (cash > 60_000_00) out.push({ type: 'hire', role: 'rnd', count: 1 });
  }
  if (last) {
    const util = last.kpis.utilisation;
    const lost = last.kpis.lostSales;
    if ((util > 0.85 || lost > last.kpis.unitsSold * 0.1) && cash > 30_000_00) {
      out.push({ type: 'hire', role: 'ops', count: Math.max(1, Math.round(s.staff.ops * 0.15)) });
    }
    const recentEbitda = s.history.slice(-3).reduce((a, r) => a + plSummary(r.period.pl).ebitda, 0);
    const profitable = recentEbitda > 0;
    if (s.month % 6 === 0 && cash > 60_000_00 && profitable && s.staff.rnd < 1 + s.staff.ops / 8) out.push({ type: 'hire', role: 'rnd', count: 1 });
    if (s.month % 6 === 3 && cash > 60_000_00 && profitable && s.staff.sales < 1 + s.staff.ops / 8) out.push({ type: 'hire', role: 'sales', count: 1 });
    const grossProfit = last ? plSummary(last.period.pl).grossProfit : 0;
    const mkt = Math.max(2_000_00, Math.round(Math.max(0, grossProfit) * 0.15 / 100) * 100);
    void revenue;
    if (Math.abs(mkt - s.marketingBudget) > s.marketingBudget * 0.2) out.push({ type: 'setMarketing', amount: mkt });
  }
  if (cash < 20_000_00) {
    const offer = loanOffer(s);
    if (offer.maxAmount >= 10_000_00) out.push({ type: 'takeLoan', amount: Math.min(offer.maxAmount, 150_000_00), termMonths: 60 });
  }
  return out;
}

export function applyPolicy(s: GameState): void {
  // Answer any event card with its first option (usually the cautious, pay-to-fix choice).
  if (s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id });
  for (const a of policyActions(s)) {
    try {
      applyActionInPlace(s, a);
    } catch (e) {
      if (!(e instanceof ActionError)) throw e;
    }
  }
}
