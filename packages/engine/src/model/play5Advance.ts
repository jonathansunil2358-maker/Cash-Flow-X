import { cr, dr, post } from '../ledger/journal';
import { formatGBP } from '../money';
import { createRng, hashSeed, type Rng } from '../rng';
import { addTemporaryEffect, startNamedEvent } from './events';
import { franchiseCount } from './franchise';
import { lastRevenue, mgrOf, playOf, popTakings, roll5, securityCost, SECURITY_LEVELS, securityOf, supplyOf, mgrMorale } from './play5';
import { logItem, type GameState } from './state';

const SHOCKS = ['regulation', 'supply', 'tech'];

/** Monthly: security spend, pop-up takings, franchise standards, managers leaving, sourcing disruptions and the random moments. */
export function advancePlay5(s: GameState, rng: Rng, simulation: boolean): void {
  void rng;
  const p = s.play5;
  if (p) {
    const sec = securityCost(s);
    if (sec > 0) post(s.ledger, s.month, 'IT security', [dr('otherCosts', sec), cr('cash', sec)], { cf: 'operating' });
    if (p.pop && s.month > p.pop.month) {
      const takings = popTakings(s, p.pop);
      post(s.ledger, s.month, 'Pop-up takings', [dr('cash', takings), cr('otherIncome', takings)], { cf: 'operating' });
      p.popResults = [...(p.popResults ?? []), { month: p.pop.month, cost: p.pop.cost, takings }].slice(-8);
      if (takings > p.pop.cost * 1.5) s.brand *= 1.01;
      if (!simulation) logItem(s, takings >= p.pop.cost ? 'notice' : 'warning', takings >= p.pop.cost ? 'The pop-up paid off' : 'The pop-up lost money', `It took ${formatGBP(takings, { compact: true })} against ${formatGBP(p.pop.cost, { compact: true })} spent.`);
      p.pop = undefined;
    }
    if (franchiseCount(s) > 0) {
      const drift = roll5(s, `fr:${s.month}`, 7) - 3;
      p.fran = Math.max(0, Math.min(100, (p.fran ?? 70) + drift));
      if (p.fran < 40) { s.brand *= 0.995; if (!simulation && s.month % 3 === 0) logItem(s, 'warning', 'Franchise standards are slipping', 'Customers are noticing. A coaching visit would lift the rating.'); }
    }
    const mg = mgrOf(s);
    if (mg.length) {
      const morale = mgrMorale(s);
      if (morale) s.morale = Math.min(100, s.morale + morale);
      if (s.morale < 40) {
        const gone = mg.findIndex((m, i) => roll5(s, `mq:${m.name}:${s.month}:${i}`, 100) < 3);
        if (gone >= 0) { const m = mg[gone]; p.mgr = mg.filter((_, i) => i !== gone); if (!simulation) logItem(s, 'warning', `${m.name} left`, 'A rival lured your manager away while morale was low.'); }
      }
    }
    if (supplyOf(s) === 'global' && s.month % 12 === 3 && roll5(s, `sd:${s.month}`, 100) < 25) {
      addTemporaryEffect(s, 'supply-disruption', 'Shipping disruption', 3, { unitCostMult: 1.08 });
      if (!simulation) logItem(s, 'warning', 'Shipping disruption', 'Your worldwide suppliers are stuck. Unit costs are 8% higher for three months.');
    }
  }
  if (simulation || s.pendingEvent || s.month < 9) return;
  const q = playOf(s);
  q.last ??= {};
  const since = (k: string): number => s.month - (q.last![k] ?? -999);
  const go = (id: string, key: string): void => { q.last![key] = s.month; startNamedEvent(s, id, createRng({ rng: hashSeed(`${s.seedLabel}:${id}:${s.month}`) })); };
  if (roll5(s, `cy:${s.month}`, 10000) / 10000 < SECURITY_LEVELS[securityOf(s)].risk * (since('cyber') > 18 ? 1 : 0)) {
    q.attack = roll5(s, `cyh:${s.month}`, 100) < 30 ? 'heavy' : 'light'; return go('cyberAttack', 'cyber');
  }
  if (s.month >= 18 && s.month % 12 === 6 && roll5(s, `shk:${s.month}`, 100) < 60) {
    q.shock = SHOCKS[roll5(s, `shk2:${s.month}`, 3)]; return go('industryShock', 'shock');
  }
  if (s.month >= 18 && s.month % 18 === 0 && lastRevenue(s) > 0) return go('founderRest', 'founder');
  if (s.month >= 36 && s.month % 6 === 0 && lastRevenue(s) * 12 >= 1_000_000_00 && since('activist') > 24 && roll5(s, `act:${s.month}`, 100) < 35) return go('activist', 'activist');
  if (s.competitors.length && since('rival') > 6 && roll5(s, `rv:${s.month}`, 100) < 8) {
    q.rival = s.competitors[roll5(s, `rv2:${s.month}`, s.competitors.length)].name; return go('rivalMove', 'rival');
  }
}
