import { cr, dr, post } from '../ledger/journal';
import { createRng, hashSeed, type Rng } from '../rng';
import { startNamedEvent } from './events';
import { lastRev7, outsourced, play7Of, rangeSoldOut, roll7, shrinkCost } from './play7';
import { logItem, type GameState } from './state';

/** Monthly: shrinkage, billing errors, range results and the random moments. */
export function advancePlay7(s: GameState, rng: Rng, simulation: boolean): void {
  void rng;
  const loss = shrinkCost(s);
  if (loss > 0) post(s.ledger, s.month, 'Shrinkage (lost or stolen stock) and stock control', [dr('otherCosts', loss), cr('cash', loss)], { cf: 'operating' });
  const p = s.play7;
  if (p && outsourced(s).includes('accounts') && roll7(s, `bill:${s.month}`, 100) < 2) {
    const fee = Math.max(300_00, Math.round(lastRev7(s) * 0.03 / 100) * 100);
    post(s.ledger, s.month, 'Billing error fixed by the accounts partner', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
    if (!simulation) logItem(s, 'warning', 'A billing error', `Your accounts partner got an invoice wrong. Fixing it cost ${(fee / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}.`);
  }
  if (p?.range && s.month >= p.range.month + 3) {
    const r = p.range;
    if (rangeSoldOut(s, r)) { s.brand *= r.size === 'big' ? 1.04 : 1.02; if (!simulation) logItem(s, 'milestone', 'The limited range sold out', 'Buzz and queues: your brand grew.'); }
    else {
      const loss2 = Math.round(r.cost * 0.4);
      post(s.ledger, s.month, 'Leftover limited-range stock marked down', [dr('otherCosts', loss2), cr('cash', loss2)], { cf: 'operating' });
      if (!simulation) logItem(s, 'warning', 'Limited range left over', 'Some of it did not sell and was marked down.');
    }
    p.range = undefined;
  }
  if (simulation || s.away || s.pendingEvent || s.month < 9 || lastRev7(s) < 5_000_00) return;
  const q = play7Of(s);
  q.last ??= {};
  const since = (k: string): number => s.month - (q.last![k] ?? -999);
  const go = (id: string, key: string): void => { q.last![key] = s.month; startNamedEvent(s, id, createRng({ rng: hashSeed(`${s.seedLabel}:${id}:${s.month}`) })); };
  if (since('scare') > 24 && roll7(s, `scare:${s.month}`, 100) < 3) return go('supplierScare', 'scare');
  if (since('warn') > 30 && s.month >= 24 && roll7(s, `warn:${s.month}`, 100) < 4) return go('mentorWarn', 'warn');
  if (since('drill') > 18 && roll7(s, `drill:${s.month}`, 100) < 4) return go('recallDrill', 'drill');
  if (since('viral') > 12 && roll7(s, `viral:${s.month}`, 100) < 4) return go('viralPost', 'viral');
  if (s.competitors.length && since('leak') > 18 && roll7(s, `leak:${s.month}`, 100) < 4) return go('leakAlert', 'leak');
}
