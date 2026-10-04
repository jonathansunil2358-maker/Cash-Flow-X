import { cr, dr, post } from '../ledger/journal';
import { plSummary } from '../ledger/statements';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { addTemporaryEffect, adjustReputation } from './events';
import { custOf, LOYALTY_COST_RATE, LOYALTY_MIN_MONTH, loyaltyOn } from './loyalty';
import { logItem, monthOfYear, type GameState } from './state';
import { effectivePrice } from './promotions';

const lastRevenue = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
const roll = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;

// ---------------------------------------------------------------------------------------------
// Loyalty programme
// ---------------------------------------------------------------------------------------------
export function loyaltyCheck(s: GameState, on: boolean): { ok: boolean; reason?: string } {
  if (on === loyaltyOn(s)) return { ok: false, reason: on ? 'The programme is already running.' : 'The programme is already off.' };
  if (on && s.month < LOYALTY_MIN_MONTH) return { ok: false, reason: `Wait until month ${LOYALTY_MIN_MONTH + 1}: you need customers to reward.` };
  return { ok: true };
}
export function setLoyalty(s: GameState, on: boolean): void {
  custOf(s).loyalty = on;
  logItem(s, 'action', on ? 'Loyalty programme launched' : 'Loyalty programme closed', on ? `Points for regulars: about 3% more demand and 10% fewer cancellations, for ${(LOYALTY_COST_RATE * 100).toFixed(1)}% of monthly sales.` : 'Customers keep their points but earn no more.');
}

// ---------------------------------------------------------------------------------------------
// Service desk: a few complaints a month; answering one earns a little reputation
// ---------------------------------------------------------------------------------------------
export interface Complaint { id: string; text: string; month: number }
const TEXTS = ['The delivery was late', 'The price confused me', 'Nobody called me back', 'It did not match the description', 'The staff were rude', 'My order was wrong'];
export const complaintCount = (s: GameState, month: number): number => 1 + roll(s, `cmp:${month}`, 3);
export function complaintsOf(s: GameState): Complaint[] {
  const done = new Set(s.cust?.resolved ?? []);
  const out: Complaint[] = [];
  for (const month of [s.month - 1, s.month]) {
    if (month < 0) continue;
    for (let i = 0; i < complaintCount(s, month); i++) {
      const id = `c${month}-${i}`;
      if (!done.has(id)) out.push({ id, text: TEXTS[roll(s, `cmt:${month}:${i}`, TEXTS.length)], month });
    }
  }
  return out;
}
export const complaintCost = (s: GameState): Pence => Math.max(20_00, Math.round(effectivePrice(s) * 0.5));
export function complaintCheck(s: GameState, id: string): { ok: boolean; reason?: string; cost: Pence } {
  const cost = complaintCost(s);
  if (!complaintsOf(s).some((c) => c.id === id)) return { ok: false, reason: 'That complaint is already handled.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `A goodwill gesture costs ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
export function resolveComplaint(s: GameState, id: string): void {
  const cost = complaintCost(s);
  post(s.ledger, s.month, 'Customer service: refund or goodwill gesture', [dr('otherCosts', cost), cr('cash', cost)], { cf: 'operating' });
  const c = custOf(s);
  c.resolved = [...(c.resolved ?? []), id].slice(-40);
  c.fixed = (c.fixed ?? 0) + 1;
  adjustReputation(s, 0.4);
}

// ---------------------------------------------------------------------------------------------
// Influencer deals
// ---------------------------------------------------------------------------------------------
export const INFLUENCERS = [
  { id: 'micro', name: 'A micro-influencer', rate: 0.02, hit: 0.7, boost: 1.04, scandal: 0, blurb: 'Cheap and usually fine: +4% demand for three months, 70% of the time.' },
  { id: 'mega', name: 'A mega-star', rate: 0.08, hit: 0.5, boost: 1.12, scandal: 0.2, blurb: 'Dear and wild: +12% demand for three months half the time, and one time in five they embarrass you.' },
];
export const influencerCost = (s: GameState, id: string): Pence => Math.max(2_000_00, Math.round(lastRevenue(s) * (INFLUENCERS.find((i) => i.id === id)?.rate ?? 0) / 10000) * 10000);
export function influencerCheck(s: GameState, id: string): { ok: boolean; reason?: string; cost: Pence } {
  const cost = influencerCost(s, id);
  if (!INFLUENCERS.some((i) => i.id === id)) return { ok: false, reason: 'Unknown influencer.', cost };
  if ((s.cust?.influencerEnd ?? -1) >= s.month) return { ok: false, reason: 'You already have a deal running.', cost };
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'You need sales before anyone will promote you.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `The deal costs ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
export function signInfluencer(s: GameState, id: string): void {
  const def = INFLUENCERS.find((i) => i.id === id)!;
  const cost = influencerCost(s, id);
  post(s.ledger, s.month, `Influencer deal: ${def.name}`, [dr('marketing', cost), cr('cash', cost)], { cf: 'operating' });
  custOf(s).influencerEnd = s.month + 3;
  const r = roll(s, `inf:${s.month}`) / 1000;
  if (r < def.scandal) {
    adjustReputation(s, -6);
    logItem(s, 'warning', `${def.name} embarrassed you`, 'A bad post went viral for the wrong reasons. Reputation fell.');
  } else if (r < def.scandal + def.hit * (1 - def.scandal)) {
    addTemporaryEffect(s, 'influencer', `${def.name} campaign`, 3, { demandMult: def.boost });
    logItem(s, 'milestone', `${def.name} went viral`, `Demand is up ${Math.round((def.boost - 1) * 100)}% for three months.`);
  } else logItem(s, 'notice', `${def.name} barely moved the needle`, 'The post sank without trace. The fee is gone.');
}

// ---------------------------------------------------------------------------------------------
// Black Friday
// ---------------------------------------------------------------------------------------------
export const BLACK_FRIDAY_MONTH = 10;
export function blackFridayCheck(s: GameState): { ok: boolean; reason?: string; cost: Pence } {
  const cost = Math.max(2_000_00, Math.round((lastRevenue(s) * 0.02) / 10000) * 10000);
  if (monthOfYear(s.month) !== BLACK_FRIDAY_MONTH) return { ok: false, reason: 'Black Friday is in November.', cost };
  if (s.cust?.bfYear === Math.floor(s.month / 12)) return { ok: false, reason: 'You already ran Black Friday this year.', cost };
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'You need sales first.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `The campaign costs ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
/** A one-month demand surge. If goods are thin you may sell out and annoy people: the engine notes it, the player decides stock cover. */
export function blackFriday(s: GameState): void {
  const cost = blackFridayCheck(s).cost;
  post(s.ledger, s.month, 'Black Friday campaign', [dr('marketing', cost), cr('cash', cost)], { cf: 'operating' });
  custOf(s).bfYear = Math.floor(s.month / 12);
  addTemporaryEffect(s, 'blackfriday', 'Black Friday', 1, { demandMult: 1.3 });
  logItem(s, 'milestone', 'Black Friday!', 'Demand surges 30% this month. Make sure you have the stock and the people to serve it, or customers will be turned away.');
}

/** Monthly upkeep: the loyalty programme's rewards. Called each month. */
export function advanceCustomers(s: GameState, _simulation: boolean): void {
  if (loyaltyOn(s)) {
    const cost = Math.round(lastRevenue(s) * LOYALTY_COST_RATE);
    if (cost > 0) post(s.ledger, s.month, 'Loyalty programme: points and rewards', [dr('marketing', cost), cr('cash', cost)], { cf: 'operating' });
  }
}
