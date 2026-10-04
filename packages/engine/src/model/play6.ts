import { cr, dr, post } from '../ledger/journal';
import { plSummary } from '../ledger/statements';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { logItem, type GameState } from './state';

/**
 * Version 7 fun: seasonal temps, loyalty tiers, the warehouse layout puzzle, tenders, quality inspections,
 * a mascot, anniversaries, event cards and the founder's book. The random moments (an insider's tip, a board
 * coup, disasters, a tax inspection, a celebrity offer) are in play6Advance.ts. Deterministic: hashes of the seed.
 */
export interface Play6 {
  tier?: 0 | 1 | 2 | 3;
  temps?: { until: number; trained: boolean };
  tempsYear?: number;
  layout?: { month: number; score: number };
  tender?: { year: number; until: number; won: boolean[] };
  inspection?: { month: number; score: number };
  mascot?: string;
  last?: Record<string, number>;
  kind?: string;
}
export const play6Of = (s: GameState): Play6 => (s.play6 ??= {});
export const lastRev = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
export const roll6 = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;
const round100 = (n: number): Pence => Math.round(n / 100) * 100;

// ---------------------------------------------------------------------------------------------
// Seasonal temps
// ---------------------------------------------------------------------------------------------
export const TEMP_MONTHS = 3;
export const tempCost = (s: GameState, trained: boolean): Pence => Math.max(1_000_00, round100(lastRev(s) * (trained ? 0.06 : 0.04)));
export const tempsActive = (s: GameState): boolean => (s.play6?.temps?.until ?? -1) > s.month;
export function tempsCheck(s: GameState, trained: boolean): { ok: boolean; reason?: string; cost: Pence } {
  const cost = tempCost(s, trained);
  if (s.month < 3) return { ok: false, reason: 'Open your first months before hiring temps.', cost };
  if (tempsActive(s)) return { ok: false, reason: 'Your temps are still here.', cost };
  if (s.play6?.tempsYear === Math.floor(s.month / 12) && s.play6.temps && s.month - (s.play6.temps.until - TEMP_MONTHS) < 12) return { ok: false, reason: 'One batch of temps a year.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `Temps cost ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
export function hireTemps(s: GameState, trained: boolean): void {
  const cost = tempCost(s, trained);
  post(s.ledger, s.month, trained ? 'Seasonal temps (trained)' : 'Seasonal temps', [dr('wages', cost), cr('cash', cost)], { cf: 'operating' });
  const p = play6Of(s); p.temps = { until: s.month + TEMP_MONTHS, trained }; p.tempsYear = Math.floor(s.month / 12);
  logItem(s, 'action', 'Temps hired', `${trained ? 'Trained temps add 8% capacity' : 'Untrained temps add 4% capacity and a few slips'} for ${TEMP_MONTHS} months. Cost ${formatGBP(cost)}.`);
}

// ---------------------------------------------------------------------------------------------
// Loyalty tiers
// ---------------------------------------------------------------------------------------------
export const TIERS = [
  { name: 'None', pct: 0, churn: 1, demand: 1, blurb: 'No tiers.' },
  { name: 'Bronze', pct: 0.005, churn: 0.97, demand: 1, blurb: 'Small perks: cancellations 3% lower for 0.5% of sales a month.' },
  { name: 'Silver', pct: 0.01, churn: 0.94, demand: 1.01, blurb: 'Better perks: cancellations 6% lower and demand +1% for 1% of sales a month.' },
  { name: 'Gold', pct: 0.018, churn: 0.9, demand: 1.02, blurb: 'Top perks: cancellations 10% lower and demand +2% for 1.8% of sales a month.' },
];
export const tierOf = (s: GameState): 0 | 1 | 2 | 3 => s.play6?.tier ?? 0;
export const tierCost = (s: GameState): Pence => Math.round(lastRev(s) * TIERS[tierOf(s)].pct);
export function tierCheck(s: GameState, level: number): { ok: boolean; reason?: string } {
  if (!TIERS[level]) return { ok: false, reason: 'Unknown tier.' };
  if (level === tierOf(s)) return { ok: false, reason: 'That is your current tier.' };
  if (s.month < 6) return { ok: false, reason: 'Tiers need a few months of customers first.' };
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Warehouse layout puzzle: 8 shelves, put the busiest nearest the door
// ---------------------------------------------------------------------------------------------
export const SHELVES = ['Tape', 'Boxes', 'Labels', 'Gloves', 'Crates', 'Pallets', 'Wrap', 'Tags'];
export const layoutWeights = (s: GameState): number[] => SHELVES.map((_, i) => 1 + roll6(s, `lw:${Math.floor(s.month / 12)}:${i}`, 9));
/** Cost of picking: each shelf's demand times how far it is from the door (position 0). */
export const layoutCost = (weights: readonly number[], order: readonly number[]): number => order.reduce((a, item, pos) => a + weights[item] * pos, 0);
export function layoutScore(weights: readonly number[], order: readonly number[]): number {
  const sorted = weights.map((w, i) => [w, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map((x) => x[1]);
  const best = layoutCost(weights, sorted);
  const worst = layoutCost(weights, [...sorted].reverse());
  const c = layoutCost(weights, order);
  return worst === best ? 1 : Math.max(0, Math.min(1, 1 - (c - best) / (worst - best)));
}
export const LAYOUT_COOLDOWN = 12;
export const layoutFee = (s: GameState): Pence => Math.max(1_000_00, round100(lastRev(s) * 0.01));
export function layoutCheck(s: GameState, order: unknown): { ok: boolean; reason?: string; fee: Pence } {
  const fee = layoutFee(s);
  if (!Array.isArray(order) || order.length !== SHELVES.length || !SHELVES.every((_, i) => order.includes(i)) || !order.every((x) => Number.isInteger(x))) return { ok: false, reason: 'Place each shelf exactly once.', fee };
  const last = s.play6?.layout?.month;
  if (last !== undefined && s.month - last < LAYOUT_COOLDOWN) return { ok: false, reason: `You can re-lay the warehouse once a year (${LAYOUT_COOLDOWN - (s.month - last)} months to go).`, fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `Moving the shelves costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function setLayout(s: GameState, order: number[]): void {
  const fee = layoutFee(s);
  post(s.ledger, s.month, 'Re-laying the warehouse', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  const score = Math.round(layoutScore(layoutWeights(s), order) * 100) / 100;
  play6Of(s).layout = { month: s.month, score };
  logItem(s, 'action', 'Warehouse re-laid', `Layout score ${Math.round(score * 100)} out of 100. Capacity +${(score * 2).toFixed(1)}% for a year.`);
}
export const layoutBonus = (s: GameState): number => { const l = s.play6?.layout; return l && s.month - l.month < LAYOUT_COOLDOWN ? 1 + 0.02 * l.score : 1; };

// ---------------------------------------------------------------------------------------------
// Tenders: undercut a hidden rival bid to win a big contract
// ---------------------------------------------------------------------------------------------
export const TENDERS = [
  { name: 'Council supply contract', demand: 1.03, months: 12 },
  { name: 'Retail chain listing', demand: 1.05, months: 12 },
  { name: 'National framework deal', demand: 1.08, months: 12 },
];
export const BID_DISCOUNTS = [5, 10, 15];
const tenderYear = (s: GameState): number => Math.floor(s.month / 12);
export const rivalDiscount = (s: GameState, i: number): number => 4 + roll6(s, `td:${tenderYear(s)}:${i}`, 11) + i;
export const tenderFee = (s: GameState): Pence => Math.max(1_000_00, round100(lastRev(s) * 0.01));
export const tenderBids = (s: GameState): boolean[] => (s.play6?.tender?.year === tenderYear(s) ? s.play6.tender.won : []);
export function tenderCheck(s: GameState, index: number, discount: number): { ok: boolean; reason?: string; fee: Pence } {
  const fee = tenderFee(s);
  if (!TENDERS[index]) return { ok: false, reason: 'No such tender.', fee };
  if (!BID_DISCOUNTS.includes(discount)) return { ok: false, reason: 'Bid a 5%, 10% or 15% discount.', fee };
  if (s.month < 12) return { ok: false, reason: 'Buyers want a year of trading first.', fee };
  if (s.play6?.tender?.year === tenderYear(s) && typeof s.play6.tender.won[index] === 'boolean') return { ok: false, reason: 'You already bid on that this year.', fee };
  if (s.play6?.tender && s.play6.tender.until > s.month) return { ok: false, reason: 'Finish your current contract before bidding again.', fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `Preparing a bid costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export const tenderWon = (s: GameState, index: number, discount: number): boolean => discount >= rivalDiscount(s, index);

// ---------------------------------------------------------------------------------------------
// Inspection, mascot, anniversary
// ---------------------------------------------------------------------------------------------
export const inspectionScore = (s: GameState): number => Math.round(s.quality * 0.5 + s.reputation * 0.3 + s.morale * 0.2);
export const MASCOTS = [
  { id: 'fox', emoji: '🦊', name: 'Fox' }, { id: 'owl', emoji: '🦉', name: 'Owl' }, { id: 'otter', emoji: '🦦', name: 'Otter' }, { id: 'robot', emoji: '🤖', name: 'Robot' },
];
export const MASCOT_NAMES = ['Biscuit', 'Pixel', 'Nugget', 'Maple', 'Ziggy', 'Pepper'];
export const mascotOf = (s: GameState): { id: string; emoji: string; name: string; label: string } | null => {
  const id = s.play6?.mascot; const m = MASCOTS.find((x) => x.id === id);
  return m ? { ...m, label: MASCOT_NAMES[roll6(s, `mn:${m.id}`, MASCOT_NAMES.length)] } : null;
};
export function mascotMood(s: GameState): { mood: string; text: string } {
  const last = s.history.at(-1);
  const profit = last ? plSummary(last.period.pl).profit : 0;
  const v = s.morale * 0.6 + (profit > 0 ? 25 : 0) + s.reputation * 0.15;
  return v >= 70 ? { mood: 'delighted', text: 'is wagging, purring or beeping with joy.' } : v >= 45 ? { mood: 'content', text: 'is having a perfectly fine day.' } : { mood: 'worried', text: 'is hiding under a desk until things improve.' };
}
export function setMascot(s: GameState, id: string): void { play6Of(s).mascot = id; logItem(s, 'action', 'A mascot joins', `${mascotOf(s)!.label} the ${MASCOTS.find((m) => m.id === id)!.name.toLowerCase()} is now the office mascot.`); }
export const nextAnniversary = (s: GameState): number => 12 - (s.month % 12);

// ---------------------------------------------------------------------------------------------
// Event cards and the founder's book (read-only)
// ---------------------------------------------------------------------------------------------
export interface EventCard { title: string; times: number; first: number; good: boolean }
export function eventCardsOf(s: GameState): EventCard[] {
  const by = new Map<string, EventCard>();
  for (const l of s.log) if (l.kind === 'event') { const c = by.get(l.title); if (c) c.times += 1; else by.set(l.title, { title: l.title, times: 1, first: l.month, good: !/\b(lost|fell|hurt|stole|bite|hack)/i.test(l.text) }); }
  return [...by.values()].sort((a, b) => b.times - a.times || a.first - b.first);
}
export function founderBook(s: GameState): string {
  const lines: string[] = [`# ${s.companyName}`, ''];
  const y = Math.floor(s.month / 12);
  lines.push(`${s.companyName} has traded for ${s.month} months (${y} full years) and is ${s.status === 'playing' ? 'still going' : s.endReason ?? 'finished'}.`, '');
  const last = s.history.at(-1);
  if (last) { const pl = plSummary(last.period.pl); lines.push(`In the latest month it took ${formatGBP(pl.revenue, { compact: true })} and made ${formatGBP(pl.profit, { compact: true })}.`, ''); }
  lines.push('## Chapters', '');
  for (const l of s.log.filter((x) => x.kind === 'milestone')) lines.push(`- Month ${l.month + 1}: ${l.title}. ${l.text}`);
  for (const a of s.awards ?? []) lines.push(`- Year ${a.year + 1}: won the ${a.id} award.`);
  return lines.join('\n');
}

/** What next month's revenue would be (a quiet month: no random events), for the forecast game. */
export function nextMonthRevenue(s: GameState, tick: (c: GameState) => void): Pence {
  const c = structuredClone(s);
  c.pendingEvent = null;
  tick(c);
  const r = c.history.at(-1);
  return r ? plSummary(r.period.pl).revenue : 0;
}

export const play6Capacity = (s: GameState): number => (tempsActive(s) ? (s.play6!.temps!.trained ? 1.08 : 1.04) : 1) * layoutBonus(s);
export const play6Demand = (s: GameState): number => TIERS[tierOf(s)].demand;
export const play6Churn = (s: GameState): number => TIERS[tierOf(s)].churn;
export const play6Key = (s: GameState): string => `${tierOf(s)}${tempsActive(s) ? (s.play6!.temps!.trained ? 'T' : 't') : ''}${s.play6?.layout ? `${s.play6.layout.month}${s.play6.layout.score}` : ''}${Math.floor(s.month / 12)}`;
