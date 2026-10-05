import { cr, dr, post } from '../ledger/journal';
import { createRng, hashSeed, type Rng } from '../rng';
import { EVENTS8, policyById } from './data8';
import { startNamedEvent } from './events';
import { franchiseCount } from './franchise';
import { industryOf } from './industries';
import { lastRev8, play8Of, roll8 } from './play8';
import { logItem, type GameState } from './state';

void franchiseCount;
/** Monthly: running costs and savings, per-month effects, risks, and the random business events. */
export function advancePlay8(s: GameState, rng: Rng, simulation: boolean): void {
  void rng;
  const pol = s.play8?.pol;
  if (pol && Object.keys(pol).length) {
    const rev = lastRev8(s);
    let cost = 0; let gain = 0;
    for (const [id, o] of Object.entries(pol)) {
      const def = policyById(id); const op = def?.options[o];
      if (!def || !op) continue;
      const m = Math.round((rev * (op.monthly ?? 0)) / 100);
      if (m > 0) cost += m; else gain += -m;
      const e = op.eff;
      if (e.m) s.morale = Math.max(0, Math.min(100, s.morale + e.m));
      if (e.rep) s.reputation = Math.max(0, Math.min(100, s.reputation + e.rep));
      if (e.br) s.brand *= e.br;
      if (e.risk && e.risk[0] > 0 && roll8(s, `risk:${id}:${s.month}`, 1000) < e.risk[0] * 10) {
        const loss = Math.max(300_00, Math.round((rev * e.risk[1]) / 100 / 100) * 100);
        post(s.ledger, s.month, `${def.name}: ${e.risk[2]}`, [dr('otherCosts', loss), cr('cash', loss)], { cf: 'operating' });
        if (!simulation) logItem(s, 'warning', e.risk[2], `It cost about ${(loss / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}.`);
      }
    }
    if (cost > 0) post(s.ledger, s.month, 'Policy running costs', [dr('otherCosts', cost), cr('cash', cost)], { cf: 'operating' });
    if (gain > 0) post(s.ledger, s.month, 'Policy savings and income', [dr('cash', gain), cr('otherIncome', gain)], { cf: 'operating' });
  }
  if (simulation || s.away || s.pendingEvent || s.month < 9 || lastRev8(s) < 5_000_00) return;
  const q = play8Of(s);
  q.last ??= {};
  if (s.month - (q.anyEvent ?? -99) < 3) return;
  const team = s.staff.ops + s.staff.rnd + s.staff.sales >= 3;
  for (const e of EVENTS8) {
    if (e.min && s.month < e.min) continue;
    if (e.gate === 'rivals' && !s.competitors.length) continue;
    if (e.gate === 'stock' && industryOf(s).model !== 'unit') continue;
    if (e.gate === 'team' && !team) continue;
    if (e.gate === 'listed' && !s.listed) continue;
    if (s.month - (q.last[e.id] ?? -999) < e.cd) continue;
    if (roll8(s, `ev:${e.id}:${s.month}`, 10000) >= e.per * 100) continue;
    q.last[e.id] = s.month; q.anyEvent = s.month;
    startNamedEvent(s, e.id, createRng({ rng: hashSeed(`${s.seedLabel}:${e.id}:${s.month}`) }));
    return;
  }
}
