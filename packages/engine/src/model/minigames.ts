import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { ratios } from './analysis';
import type { Profile } from './prestige';
import type { GameState } from './state';

/**
 * Four small daily games. Each is a pure function of the day (or of your company), so everybody gets the same
 * game and the score can be worked out anywhere. They pay gems once a day and never touch the company's numbers.
 */
function gen(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MiniKind = 'negotiate' | 'pitch' | 'stocktake' | 'tetris';
export const MINI_GEMS = (points: number): number => (points >= 85 ? 12 : points >= 60 ? 7 : points >= 30 ? 3 : 0);

export interface MiniResult { day: string; points: number }
export const miniOf = (p: Pick<Profile, 'minis'>, kind: MiniKind): MiniResult | null => p.minis?.[kind] ?? null;
export const miniDone = (p: Pick<Profile, 'minis'>, kind: MiniKind, day: string): boolean => miniOf(p, kind)?.day === day;
/** Record today's result (once a day) and pay gems by score. */
export function recordMini<T extends Pick<Profile, 'minis' | 'gems'>>(p: T, kind: MiniKind, day: string, points: number): { profile: T; gems: number } {
  if (miniDone(p, kind, day)) return { profile: p, gems: 0 };
  const gems = MINI_GEMS(points);
  return { profile: { ...p, gems: p.gems + gems, minis: { ...(p.minis ?? {}), [kind]: { day, points } } }, gems };
}

// ---------------------------------------------------------------------------------------------
// Negotiation duel
// ---------------------------------------------------------------------------------------------
export interface Negotiation { day: string; item: string; list: Pence; reservation: Pence; patience: number }
export interface NegState { round: number; ask: Pence; patience: number; status: 'open' | 'deal' | 'walked'; price: Pence | null; log: string[] }
const ITEMS = ['a year of office supplies', 'a delivery van lease', 'a stand at the trade fair', 'a batch of raw materials', 'a software licence'];
export function negotiationOf(day: string): Negotiation {
  const r = gen(`neg|${day}`);
  const list = (20 + Math.floor(r() * 80)) * 1000_00;
  return { day, item: ITEMS[Math.floor(r() * ITEMS.length)], list, reservation: Math.round(list * (0.66 + r() * 0.2) / 100_00) * 100_00, patience: 3 };
}
export const negStart = (n: Negotiation): NegState => ({ round: 0, ask: n.list, patience: n.patience, status: 'open', price: null, log: [`The seller opens at ${formatGBP(n.list)} for ${n.item}.`] });
/** Your offer is a percentage (50 to 100) of the current ask. The seller accepts at or above their secret lowest price. */
export function negOffer(n: Negotiation, st: NegState, offerPct: number): NegState {
  if (st.status !== 'open') return st;
  const pct = Math.min(100, Math.max(50, Math.round(offerPct)));
  const offer = Math.round((st.ask * pct) / 100 / 100_00) * 100_00;
  const log = [...st.log, `You offer ${formatGBP(offer)}.`];
  if (offer >= n.reservation) return { ...st, round: st.round + 1, status: 'deal', price: offer, log: [...log, `Deal at ${formatGBP(offer)}.`] };
  const gap = (n.reservation - offer) / n.list;
  const patience = st.patience - (gap > 0.12 ? 2 : 1);
  if (patience <= 0) return { ...st, round: st.round + 1, patience, status: 'walked', price: null, log: [...log, 'The seller walks away.'] };
  const ask = Math.max(n.reservation, Math.round((st.ask - (st.ask - n.reservation) * 0.35) / 100_00) * 100_00);
  return { ...st, round: st.round + 1, ask, patience, log: [...log, `The seller comes down to ${formatGBP(ask)}.`] };
}
/** 0 if you walked away or paid list; otherwise how much of the possible saving you captured, plus a little for speed. */
export function negScore(n: Negotiation, st: NegState): number {
  if (st.status !== 'deal' || st.price === null) return 0;
  const possible = n.list - n.reservation;
  const saved = n.list - st.price;
  const capture = possible <= 0 ? 1 : Math.min(1, saved / possible);
  return Math.round(Math.min(100, 20 + capture * 70 + Math.max(0, 4 - st.round) * 3));
}

// ---------------------------------------------------------------------------------------------
// Pitch day
// ---------------------------------------------------------------------------------------------
export interface PitchMetric { id: string; label: string; value: string; strong: boolean }
export const PITCH_PICKS = 3;
export function pitchMetrics(s: GameState): PitchMetric[] {
  const rs = ratios(s);
  const get = (id: string): number | null => rs.find((x) => x.id === id)?.value ?? null;
  const pct = (v: number | null): string => (v === null ? 'n/a' : `${Math.round(v * 100)}%`);
  const growth = get('growth'); const gm = get('grossMargin'); const em = get('ebitdaMargin'); const cr = get('currentRatio'); const gear = get('gearing'); const runway = get('runway');
  return [
    { id: 'growth', label: 'Revenue growth', value: pct(growth), strong: growth !== null && growth > 0.15 },
    { id: 'margin', label: 'Gross margin', value: pct(gm), strong: gm !== null && gm > 0.4 },
    { id: 'profit', label: 'EBITDA margin', value: pct(em), strong: em !== null && em > 0.08 },
    { id: 'liquidity', label: 'Current ratio', value: cr === null ? 'n/a' : `${cr.toFixed(2)}x`, strong: cr !== null && cr >= 1.2 },
    { id: 'debt', label: 'Gearing (debt share)', value: pct(gear), strong: gear === null || gear < 0.4 },
    { id: 'runway', label: 'Cash runway', value: runway === null ? 'cash generative' : `${runway.toFixed(1)} months`, strong: runway === null || runway > 9 },
  ];
}
/** The investor today cares most about two things. */
export function pitchPriorities(day: string): string[] {
  const r = gen(`pitch|${day}`);
  const ids = ['growth', 'margin', 'profit', 'liquidity', 'debt', 'runway'];
  const a = Math.floor(r() * ids.length);
  let b = Math.floor(r() * (ids.length - 1));
  if (b >= a) b += 1;
  return [ids[a], ids[b]];
}
export function pitchScore(s: GameState, day: string, picks: readonly string[]): { points: number; notes: string[] } {
  const metrics = pitchMetrics(s);
  const priorities = pitchPriorities(day);
  const chosen = Array.from(new Set(picks)).slice(0, PITCH_PICKS).map((id) => metrics.find((m) => m.id === id)).filter((m): m is PitchMetric => !!m);
  let points = 0;
  const notes: string[] = [];
  for (const m of chosen) {
    const wanted = priorities.includes(m.id);
    if (m.strong) { points += wanted ? 35 : 15; notes.push(`${m.label} (${m.value}): ${wanted ? 'exactly what they wanted, and it is strong.' : 'strong, a nice extra.'}`); }
    else { points -= wanted ? 5 : 15; notes.push(`${m.label} (${m.value}): ${wanted ? 'they wanted it, but it is weak.' : 'weak, and not what they asked for.'}`); }
  }
  return { points: Math.max(0, Math.min(100, points)), notes };
}

// ---------------------------------------------------------------------------------------------
// Stock-take rush
// ---------------------------------------------------------------------------------------------
export interface StockLine { id: string; name: string; system: number; actual: number }
const GOODS = ['Mugs', 'Notebooks', 'Cables', 'Boxes', 'Lamps', 'Chairs', 'Pens', 'Bags', 'Plants', 'Clocks', 'Hats', 'Mats'];
export function stockTakeOf(day: string): StockLine[] {
  const r = gen(`stock|${day}`);
  const lines = GOODS.map((name, i) => { const n = 10 + Math.floor(r() * 90); return { id: `s${i}`, name, system: n, actual: n }; });
  const bad = new Set<number>();
  while (bad.size < 3) bad.add(Math.floor(r() * lines.length));
  for (const i of bad) lines[i].actual = Math.max(0, lines[i].system + (r() < 0.5 ? -1 : 1) * (2 + Math.floor(r() * 8)));
  return lines;
}
export const stockWrong = (l: StockLine): boolean => l.system !== l.actual;
export function stockScore(lines: readonly StockLine[], flagged: readonly string[]): { found: number; falseAlarms: number; points: number } {
  const set = new Set(flagged);
  const found = lines.filter((l) => stockWrong(l) && set.has(l.id)).length;
  const falseAlarms = lines.filter((l) => !stockWrong(l) && set.has(l.id)).length;
  return { found, falseAlarms, points: Math.max(0, Math.round((found / 3) * 100 - falseAlarms * 20)) };
}

// ---------------------------------------------------------------------------------------------
// Cash-flow tetris
// ---------------------------------------------------------------------------------------------
export interface FlexItem { id: string; label: string; amount: Pence; from: number; to: number }
export interface Tetris { day: string; start: Pence; weeks: number; fixed: { week: number; label: string; amount: Pence }[]; flex: FlexItem[] }
export function tetrisOf(day: string): Tetris {
  const r = gen(`tetris|${day}`);
  const weeks = 8;
  const start = (12 + Math.floor(r() * 6)) * 1000_00;
  const fixed: Tetris['fixed'] = [];
  for (let w = 1; w <= weeks; w++) {
    if (w % 2 === 1) fixed.push({ week: w, label: 'Payroll', amount: -(2 + Math.floor(r() * 2)) * 1000_00 });
    if (w % 2 === 0) fixed.push({ week: w, label: 'Customer receipts', amount: (3 + Math.floor(r() * 3)) * 1000_00 });
  }
  const labels = ['Supplier invoice', 'Rent', 'Tax instalment', 'Loan repayment', 'Equipment service', 'Insurance'];
  const flex: FlexItem[] = labels.map((label, i) => { const from = 1 + Math.floor(r() * 4); return { id: `f${i}`, label, amount: -(1 + Math.floor(r() * 3)) * 1000_00, from, to: Math.min(weeks, from + 2 + Math.floor(r() * 3)) }; });
  return { day, start, weeks, fixed, flex };
}
/** Balance at the end of each week given a placement (week) for each flexible item. */
export function tetrisBalances(t: Tetris, placement: Record<string, number>): Pence[] {
  const out: Pence[] = [];
  let bal = t.start;
  for (let w = 1; w <= t.weeks; w++) {
    bal += t.fixed.filter((f) => f.week === w).reduce((a, f) => a + f.amount, 0);
    bal += t.flex.filter((f) => placement[f.id] === w).reduce((a, f) => a + f.amount, 0);
    out.push(bal);
  }
  return out;
}
export function tetrisScore(t: Tetris, placement: Record<string, number>): { points: number; lowest: Pence; valid: boolean } {
  const valid = t.flex.every((f) => { const w = placement[f.id]; return Number.isInteger(w) && w >= f.from && w <= f.to; });
  const bal = tetrisBalances(t, placement);
  const lowest = Math.min(...bal);
  if (!valid) return { points: 0, lowest, valid };
  const overdrawnWeeks = bal.filter((b) => b < 0).length;
  const worst = lowest < 0 ? -lowest : 0;
  return { points: Math.max(0, 100 - overdrawnWeeks * 18 - Math.min(40, Math.round(worst / 1000_00) * 6)), lowest, valid };
}
