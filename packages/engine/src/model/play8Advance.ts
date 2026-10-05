import { cr, dr, post } from '../ledger/journal';
import { createRng, hashSeed, type Rng } from '../rng';
import { EVENTS8, policyById, initiativeById, type EvEff } from './data8';
import { addTemporaryEffect, startNamedEvent } from './events';
import { franchiseCount } from './franchise';
import { industryOf } from './industries';
import { lastRev8, play8Of, roll8 } from './play8';
import { logItem, type GameState } from './state';

void franchiseCount;
/** Monthly: running costs and savings, per-month effects, risks, and the random business events. */
export function advancePlay8(s: GameState, rng: Rng, simulation: boolean): void {
  void rng;
  const proj = s.play8?.proj;
  if (proj?.active.length) {
    const still: typeof proj.active = [];
    for (const a of proj.active) {
      if (s.month < a.end) { still.push(a); continue; }
      const p = initiativeById(a.id);
      if (!p) continue;
      const won = roll8(s, `proj:${a.id}:${a.end}`, 100) < p.success;
      proj.done[a.id] = { result: won ? 'won' : 'lost', month: s.month };
      applyNow(s, a.id, won ? p.win.now : p.lose.now);
      if (!simulation) logItem(s, won ? 'milestone' : 'warning', won ? `Project succeeded: ${p.name}` : `Project failed: ${p.name}`, won ? p.win.text : p.lose.text);
    }
    proj.active = still;
  }
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
  const eligible = EVENTS8.filter((e) => {
    if (e.min && s.month < e.min) return false;
    if (e.gate === 'rivals' && !s.competitors.length) return false;
    if (e.gate === 'stock' && industryOf(s).model !== 'unit') return false;
    if (e.gate === 'team' && !team) return false;
    if (e.gate === 'listed' && !s.listed) return false;
    return s.month - (q.last![e.id] ?? -999) >= e.cd;
  });
  if (!eligible.length) return;
  // About one decision every ten months, however many events exist: pick one of the eligible, weighted by its own chance.
  if (roll8(s, `evgate:${s.month}`, 100) >= 10) return;
  const total = eligible.reduce((a, e) => a + e.per, 0);
  let r = (roll8(s, `evpick:${s.month}`, 100000) / 100000) * total;
  const e = eligible.find((x) => (r -= x.per) < 0) ?? eligible[eligible.length - 1];
  q.last[e.id] = s.month; q.anyEvent = s.month;
  startNamedEvent(s, e.id, createRng({ rng: hashSeed(`${s.seedLabel}:${e.id}:${s.month}`) }));
}

function applyNow(s: GameState, id: string, e: EvEff | undefined): void {
  if (!e) return;
  if (e.d) addTemporaryEffect(s, `${id}-d`, 'A project result', e.d[1], { demandMult: e.d[0] });
  if (e.c) addTemporaryEffect(s, `${id}-c`, 'A project result', e.c[1], { unitCostMult: e.c[0] });
  if (e.morale) s.morale = Math.max(0, Math.min(100, s.morale + e.morale));
  if (e.rep) s.reputation = Math.max(0, Math.min(100, s.reputation + e.rep));
  if (e.brand) s.brand *= e.brand;
  if (e.quality) s.quality = Math.max(0, Math.min(100, s.quality + e.quality));
}
