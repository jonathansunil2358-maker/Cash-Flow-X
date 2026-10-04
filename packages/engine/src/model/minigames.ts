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

export type MiniKind = 'negotiate' | 'pitch' | 'stocktake' | 'tetris' | 'boardroom' | 'callcentre' | 'auction' | 'fraud';
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

// ---------------------------------------------------------------------------------------------
// Boardroom pitch: three directors, each with a different thing they care about
// ---------------------------------------------------------------------------------------------
export interface Director { name: string; title: string; wants: string }
const DIRECTORS = ['Dame Alice Marlow', 'Raj Chowdhury', 'Ingrid Sørensen', 'Colm Brady', 'Mei Tanaka', 'Hassan Idris'];
const DIRECTOR_TITLES = ['Chair', 'Finance director', 'Operations lead', 'Investor representative', 'Customer champion'];
export function directorsOf(day: string): Director[] {
  const r = gen(`board|${day}`);
  const ids = ['growth', 'margin', 'profit', 'liquidity', 'debt', 'runway'];
  const pool = [...ids];
  const names = [...DIRECTORS];
  return DIRECTOR_TITLES.slice(0, 3).map((title) => ({ name: names.splice(Math.floor(r() * names.length), 1)[0], title, wants: pool.splice(Math.floor(r() * pool.length), 1)[0] }));
}
/** One number per director. A strong number they care about wins 34; a weak one loses 10. */
export function boardroomScore(s: GameState, day: string, picks: readonly string[]): { points: number; notes: string[] } {
  const metrics = pitchMetrics(s);
  const dirs = directorsOf(day);
  let points = 0;
  const notes: string[] = [];
  dirs.forEach((d, i) => {
    const m = metrics.find((x) => x.id === picks[i]);
    if (!m) { notes.push(`${d.name} got nothing from you.`); return; }
    if (m.id === d.wants) {
      points += m.strong ? 34 : 4;
      notes.push(`${d.name} wanted ${m.label.toLowerCase()}: ${m.strong ? 'strong, and they noticed.' : 'weak, and they noticed that too.'}`);
    } else {
      points += m.strong ? 12 : -10;
      notes.push(`${d.name} did not care about ${m.label.toLowerCase()}: ${m.strong ? 'it is strong but off-topic.' : 'it is weak and off-topic.'}`);
    }
  });
  return { points: Math.max(0, Math.min(100, points)), notes };
}

// ---------------------------------------------------------------------------------------------
// Crisis call centre: pick the calls that fit your hour
// ---------------------------------------------------------------------------------------------
export interface Call { id: string; who: string; issue: string; urgency: number; minutes: number }
const ISSUES = ['A late delivery', 'A faulty item', 'A billing mistake', 'A recall query', 'A refund demand', 'A press enquiry', 'A broken website link', 'A lost parcel', 'A missing invoice'];
const WHO = ['Ms Patel', 'A big client', 'Mr Evans', 'A local journalist', 'Ms Okoye', 'A regular', 'A new customer', 'Mr Jansen', 'A supplier'];
export const CALL_BUDGET = 30;
export function callsOf(day: string): Call[] {
  const r = gen(`calls|${day}`);
  return Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, who: WHO[Math.floor(r() * WHO.length)], issue: ISSUES[Math.floor(r() * ISSUES.length)], urgency: 1 + Math.floor(r() * 5), minutes: 5 * (1 + Math.floor(r() * 4)) }));
}
/** Best total urgency within the time budget (small enough to brute force). */
export function bestCalls(calls: readonly Call[]): number {
  let best = 0;
  for (let m = 0; m < 1 << calls.length; m++) {
    let u = 0; let t = 0;
    for (let i = 0; i < calls.length; i++) if (m & (1 << i)) { u += calls[i].urgency; t += calls[i].minutes; }
    if (t <= CALL_BUDGET && u > best) best = u;
  }
  return best;
}
export function callScore(calls: readonly Call[], chosen: readonly string[]): { points: number; urgency: number; minutes: number; over: boolean } {
  const picked = calls.filter((c) => chosen.includes(c.id));
  const urgency = picked.reduce((a, c) => a + c.urgency, 0);
  const minutes = picked.reduce((a, c) => a + c.minutes, 0);
  if (minutes > CALL_BUDGET) return { points: 0, urgency, minutes, over: true };
  return { points: Math.round((urgency / Math.max(1, bestCalls(calls))) * 100), urgency, minutes, over: false };
}

// ---------------------------------------------------------------------------------------------
// Auction house: win lots below their worth, against hidden rival bids
// ---------------------------------------------------------------------------------------------
export interface Lot { id: string; name: string; worth: Pence; rivals: Pence[] }
const LOTS = ['a warehouse lease', 'a famous brand name', 'a patent bundle', 'a delivery fleet', 'a shop on the high street', 'a customer list'];
export function auctionOf(day: string): Lot[] {
  const r = gen(`auction|${day}`);
  const names = [...LOTS];
  return Array.from({ length: 3 }, (_, i) => {
    const worth = (20 + Math.floor(r() * 60)) * 1000_00;
    const rivals = Array.from({ length: 3 }, () => Math.round((worth * (0.45 + r() * 0.6)) / 1000_00) * 1000_00);
    return { id: `l${i}`, name: names.splice(Math.floor(r() * names.length), 1)[0], worth, rivals };
  });
}
export const AUCTION_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
export function auctionScore(lots: readonly Lot[], bids: Readonly<Record<string, Pence>>): { points: number; profit: Pence; won: number } {
  let profit = 0; let best = 0; let won = 0;
  for (const l of lots) {
    const top = Math.max(...l.rivals);
    const bid = bids[l.id] ?? 0;
    if (bid > top) { profit += l.worth - bid; won++; }
    best += Math.max(0, l.worth - (top + 1000_00));
  }
  return { points: best <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((profit / best) * 100))), profit, won };
}

// ---------------------------------------------------------------------------------------------
// Spot the fraud: two fake invoices among twelve
// ---------------------------------------------------------------------------------------------
export interface Invoice { id: string; supplier: string; ref: string; amount: Pence; day: string }
const SUPPLIERS = ['Brightwater Ltd', 'Corbel Supplies', 'Delta Print', 'Elm & Oak', 'Fenwick Freight', 'Granite IT', 'Hollis Cleaning', 'Ivy Catering', 'Juno Packaging', 'Kestrel Tools', 'Lumen Energy', 'Marlow Paper'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const invoicesOf = (day: string): { lines: Invoice[]; fakes: string[] } => {
  const r = gen(`fraud|${day}`);
  const lines: Invoice[] = SUPPLIERS.map((supplier, i) => ({ id: `i${i}`, supplier, ref: `INV-${1000 + i * 7 + Math.floor(r() * 5)}`, amount: (300 + Math.floor(r() * 4700)) * 100 + Math.floor(r() * 99), day: `${WEEKDAYS[Math.floor(r() * 5)]} ${1 + Math.floor(r() * 27)}` }));
  const a = 3 + Math.floor(r() * 3);
  const b = 6 + Math.floor(r() * 6);
  // Fake one: a later invoice that reuses an earlier reference number. Fake two: a round amount dated on a weekend.
  lines[a].ref = lines[a - 2].ref;
  lines[b].amount = (1000 + Math.floor(r() * 4000)) * 100;
  lines[b].day = `${WEEKDAYS[5 + Math.floor(r() * 2)]} ${1 + Math.floor(r() * 27)}`;
  return { lines, fakes: [lines[a].id, lines[b].id] };
};
export function fraudScore(day: string, flagged: readonly string[]): { found: number; falseAlarms: number; points: number } {
  const { fakes } = invoicesOf(day);
  const set = new Set(flagged);
  const found = fakes.filter((f) => set.has(f)).length;
  const falseAlarms = flagged.filter((f) => !fakes.includes(f)).length;
  return { found, falseAlarms, points: Math.max(0, found * 50 - falseAlarms * 20) };
}
