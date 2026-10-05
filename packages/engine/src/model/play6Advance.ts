import { cr, dr, post } from '../ledger/journal';
import { createRng, hashSeed, type Rng } from '../rng';
import { addTemporaryEffect, startNamedEvent } from './events';
import { inspectionScore, lastRev, mascotMood, play6Of, roll6, tierCost, TENDERS, BID_DISCOUNTS } from './play6';
import { logItem, type GameState } from './state';
void BID_DISCOUNTS; void TENDERS;

/** Monthly: tier costs, inspections, anniversaries and the random moments. */
export function advancePlay6(s: GameState, rng: Rng, simulation: boolean): void {
  void rng;
  const tc = tierCost(s);
  if (tc > 0) post(s.ledger, s.month, 'Loyalty tier perks', [dr('marketing', tc), cr('cash', tc)], { cf: 'operating' });
  // Quality inspection each autumn (month 9 of the year).
  if (s.month >= 12 && s.month % 12 === 9) {
    const score = inspectionScore(s);
    play6Of(s).inspection = { month: s.month, score };
    if (score >= 70) { s.reputation = Math.min(100, s.reputation + 3); s.brand *= 1.02; }
    if (!simulation) logItem(s, score >= 70 ? 'milestone' : score < 45 ? 'warning' : 'notice', `Quality inspection: ${score} out of 100`, score >= 70 ? 'A glowing report. Reputation and brand rose.' : score < 45 ? 'A poor report. Quality, reputation and morale all need work.' : 'A fair report: no change.');
  }
  // A yearly anniversary.
  if (s.month > 0 && s.month % 12 === 0) {
    s.morale = Math.min(100, s.morale + 2); s.reputation = Math.min(100, s.reputation + 1);
    if (!simulation) logItem(s, 'milestone', `${s.month / 12} year${s.month === 12 ? '' : 's'} in business`, `A cake, a toast and a small boost to morale. ${s.play6?.mascot ? `Your mascot ${mascotMood(s).text}` : ''}`);
  }
  // A tender contract runs its course.
  const t = s.play6?.tender;
  if (t && t.until === s.month && !simulation) logItem(s, 'notice', 'A tender contract ends', 'The extra demand and the squeezed margin both end now.');
  if (simulation || s.away || s.pendingEvent || s.month < 9 || lastRev(s) < 5_000_00) return;
  const q = play6Of(s);
  q.last ??= {};
  const since = (k: string): number => s.month - (q.last![k] ?? -999);
  const go = (id: string, key: string): void => { q.last![key] = s.month; startNamedEvent(s, id, createRng({ rng: hashSeed(`${s.seedLabel}:${id}:${s.month}`) })); };
  if (s.month % 12 === 7 && roll6(s, `dis:${s.month}`, 100) < 25) { q.kind = ['flood', 'heatwave', 'storm'][roll6(s, `dis2:${s.month}`, 3)]; return go('disasterSeason', 'disaster'); }
  if (s.month >= 24 && s.month % 12 === 10 && roll6(s, `tax:${s.month}`, 100) < 20) return go('taxInspection', 'tax');
  if (s.month >= 24 && s.morale < 45 && since('coup') > 36 && roll6(s, `coup:${s.month}`, 100) < 15) return go('boardCoup', 'coup');
  if (s.month >= 12 && lastRev(s) > 0 && since('tip') > 12 && roll6(s, `tip:${s.month}`, 100) < 5) return go('insiderTip', 'tip');
  if (s.month >= 12 && lastRev(s) > 0 && since('celeb') > 18 && roll6(s, `cel:${s.month}`, 100) < 4) return go('celebDeal', 'celeb');
}

/** A tender result: the bid's fee, then a year of extra demand and a squeezed margin if it wins. */
export function applyTender(s: GameState, index: number, discount: number, won: boolean, fee: number, demand: number, label: string): void {
  post(s.ledger, s.month, `Preparing a bid: ${label}`, [dr('dealCosts', fee), cr('cash', fee)], { cf: 'operating' });
  const p = play6Of(s);
  const same = p.tender?.year === Math.floor(s.month / 12);
  const list = same ? [...p.tender!.won] : [];
  list[index] = won;
  p.tender = { year: Math.floor(s.month / 12), until: won ? s.month + 12 : (p.tender && same ? p.tender.until : 0), won: list };
  if (won) {
    addTemporaryEffect(s, 'tender-demand', label, 12, { demandMult: demand, unitCostMult: 1 + discount * 0.006 });
    logItem(s, 'milestone', `You won the ${label.toLowerCase()}`, `A ${discount}% discount beat the rival. Demand is up ${Math.round((demand - 1) * 100)}% for a year and unit costs ${(discount * 0.6).toFixed(1)}% higher.`);
  } else logItem(s, 'warning', `A rival won the ${label.toLowerCase()}`, `Your ${discount}% discount was not enough. The preparation fee is lost.`);
}
