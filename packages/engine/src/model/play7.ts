import { cr, dr, post } from '../ledger/journal';
import { plSummary } from '../ledger/statements';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { industryOf } from './industries';
import { logItem, type GameState } from './state';

/**
 * Version 8 fun: a customer council, stock control against shrinkage, a yearly training budget split, outsourcing,
 * limited-range batches, monument milestones, and the random moments in play7Advance.ts (a leak, a recall drill,
 * a viral post, a supplier scare, a mentor's warning). Deterministic: hashes of the company seed.
 */
export interface Range { month: number; size: 'small' | 'big'; cost: Pence }
export interface Play7 {
  councilQ?: number;
  councilPick?: string;
  stock?: 0 | 1 | 2;
  budget?: { year: number; ops: number; rnd: number; sales: number };
  out?: string[];
  range?: Range;
  rangeQ?: number;
  last?: Record<string, number>;
  kind?: string;
}
export const play7Of = (s: GameState): Play7 => (s.play7 ??= {});
export const lastRev7 = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
export const roll7 = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;
const round100 = (n: number): Pence => Math.round(n / 100) * 100;
const quarterOf = (s: GameState): number => Math.floor(s.month / 3);

// ---------------------------------------------------------------------------------------------
// Customer council: each quarter customers vote on one thing to improve
// ---------------------------------------------------------------------------------------------
export interface CouncilOption { id: string; name: string; text: string }
export const COUNCIL: CouncilOption[] = [
  { id: 'price', name: 'Keep prices low', text: 'Demand +3% for six months, unit costs 1.5% higher.' },
  { id: 'quality', name: 'Improve the product', text: 'Quality +1.5 now.' },
  { id: 'service', name: 'Faster service', text: 'Reputation +2 now.' },
  { id: 'brand', name: 'A friendlier brand', text: 'Brand +6% now.' },
  { id: 'loyalty', name: 'Reward regulars', text: 'Cancellations are cut for six months: demand +2%.' },
];
export function councilOptions(s: GameState): CouncilOption[] {
  const pool = [...COUNCIL]; const out: CouncilOption[] = [];
  for (let i = 0; i < 3; i++) out.push(pool.splice(roll7(s, `council:${quarterOf(s)}:${i}`, pool.length), 1)[0]);
  return out;
}
export const councilOpen = (s: GameState): boolean => s.month >= 6 && s.play7?.councilQ !== quarterOf(s);
export function councilCheck(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (s.month < 6) return { ok: false, reason: 'The council meets once you have a few months of customers.' };
  if (s.play7?.councilQ === quarterOf(s)) return { ok: false, reason: 'The council has already voted this quarter.' };
  if (!councilOptions(s).some((o) => o.id === id)) return { ok: false, reason: 'That is not on the ballot.' };
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Stock control against shrinkage (stock-holding businesses only)
// ---------------------------------------------------------------------------------------------
export const hasStock = (s: GameState): boolean => industryOf(s).model === 'unit';
export const STOCK_LEVELS = [
  { name: 'Trust the team', loss: 0.0025, fee: 0, blurb: 'Free, but some stock walks out of the door.' },
  { name: 'Cameras and tags', loss: 0.001, fee: 0.0007, blurb: 'Losses fall sharply for a small monthly cost.' },
  { name: 'Regular audits', loss: 0.0005, fee: 0.0015, blurb: 'Almost nothing goes missing, at a bigger monthly cost.' },
];
export const stockLevel = (s: GameState): 0 | 1 | 2 => s.play7?.stock ?? 0;
export const shrinkCost = (s: GameState): Pence => (hasStock(s) ? Math.round(lastRev7(s) * (STOCK_LEVELS[stockLevel(s)].loss + STOCK_LEVELS[stockLevel(s)].fee)) : 0);

// ---------------------------------------------------------------------------------------------
// Training budget split
// ---------------------------------------------------------------------------------------------
export const budgetFee = (s: GameState): Pence => Math.max(1_000_00, round100(lastRev7(s) * 0.5));
export const budgetOf = (s: GameState): Play7['budget'] => (s.play7?.budget && s.month - s.play7.budget.year * 12 < 12 ? s.play7.budget : undefined);
export function budgetCheck(s: GameState, ops: number, rnd: number, sales: number): { ok: boolean; reason?: string; fee: Pence } {
  const fee = budgetFee(s);
  if (![ops, rnd, sales].every((n) => Number.isInteger(n) && n >= 0 && n <= 100) || ops + rnd + sales !== 100) return { ok: false, reason: 'The three shares must add up to 100.', fee };
  if (s.month < 6) return { ok: false, reason: 'Wait until you have a team to train.', fee };
  if (s.play7?.budget?.year === Math.floor(s.month / 12)) return { ok: false, reason: 'One budget a year.', fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `The training budget is ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
/** Putting 70% or more in one place gets a 30% bonus on that department. */
export const budgetEffect = (share: number): number => (share >= 70 ? (share / 100) * 1.3 : share / 100);

// ---------------------------------------------------------------------------------------------
// Outsourcing
// ---------------------------------------------------------------------------------------------
export const OUTSOURCE = [
  { id: 'support', name: 'Customer support', cost: 0.985, quality: -0.04, demand: 1, blurb: 'Costs 1.5% less, but quality slips a little each month.' },
  { id: 'delivery', name: 'Delivery', cost: 0.98, quality: 0, demand: 0.99, blurb: 'Costs 2% less, but demand is 1% lower.' },
  { id: 'accounts', name: 'Accounts', cost: 0.988, quality: 0, demand: 1, blurb: 'Costs 1.2% less, with an occasional billing error.' },
];
export const outsourced = (s: GameState): string[] => s.play7?.out ?? [];
export const outsourceFee = (s: GameState): Pence => Math.max(1_000_00, round100(lastRev7(s) * 0.5));
export function outsourceCheck(s: GameState, id: string, on: boolean): { ok: boolean; reason?: string; fee: Pence } {
  const fee = outsourceFee(s);
  if (!OUTSOURCE.some((o) => o.id === id)) return { ok: false, reason: 'Unknown function.', fee };
  if (on === outsourced(s).includes(id)) return { ok: false, reason: on ? 'Already outsourced.' : 'It is already in-house.', fee };
  if (on && s.month < 6) return { ok: false, reason: 'Partners want a track record first.', fee };
  if (on && s.ledger.balances.cash < fee) return { ok: false, reason: `Setting up the partner costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}

// ---------------------------------------------------------------------------------------------
// Limited range
// ---------------------------------------------------------------------------------------------
export const RANGE_SIZES = { small: { k: 0.01, sell: 70 }, big: { k: 0.03, sell: 55 } } as const;
export const rangeCost = (s: GameState, size: 'small' | 'big'): Pence => Math.max(1_000_00, round100(lastRev7(s) * RANGE_SIZES[size].k * 3));
export function rangeCheck(s: GameState, size: string): { ok: boolean; reason?: string; cost: Pence } {
  const cost = RANGE_SIZES[size as 'small'] ? rangeCost(s, size as 'small') : 0;
  if (!RANGE_SIZES[size as 'small']) return { ok: false, reason: 'Choose a small or big range.', cost };
  if (s.month < 6) return { ok: false, reason: 'Run the business a few months first.', cost };
  if (s.play7?.range) return { ok: false, reason: 'A limited range is already on sale.', cost };
  if (s.play7?.rangeQ === quarterOf(s)) return { ok: false, reason: 'One limited range a quarter.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `The batch costs ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
export function startRange(s: GameState, size: 'small' | 'big'): void {
  const cost = rangeCost(s, size);
  post(s.ledger, s.month, `Limited range (${size})`, [dr('marketing', cost), cr('cash', cost)], { cf: 'operating' });
  const p = play7Of(s); p.range = { month: s.month, size, cost }; p.rangeQ = quarterOf(s);
  logItem(s, 'action', `A ${size} limited range goes on sale`, `You spent ${formatGBP(cost)}. In three months you will see whether it sold out.`);
}
/** Outcome after three months: a sell-out gives buzz; leftovers are marked down. */
export const rangeSoldOut = (s: GameState, r: Range): boolean => roll7(s, `range:${r.month}`, 100) < RANGE_SIZES[r.size].sell + Math.min(15, Math.round(s.brand / 30));

// ---------------------------------------------------------------------------------------------
// Monuments: milestones that earn a place in the monument hall
// ---------------------------------------------------------------------------------------------
export interface Monument { id: string; name: string; emoji: string; text: string; earned: (s: GameState) => boolean }
const eq = (s: GameState): Pence => s.history.at(-1)?.valuation?.equityValue ?? 0;
export const MONUMENTS: Monument[] = [
  { id: 'first100k', name: 'The First Hundred Thousand', emoji: '🗼', text: 'Be worth £100,000.', earned: (s) => eq(s) >= 10_000_000 },
  { id: 'first1m', name: 'The Million Fountain', emoji: '⛲', text: 'Be worth £1 million.', earned: (s) => eq(s) >= 100_000_000 },
  { id: 'first10m', name: 'The Ten-Million Spire', emoji: '🏛️', text: 'Be worth £10 million.', earned: (s) => eq(s) >= 1_000_000_000 },
  { id: 'team50', name: 'The Great Hall', emoji: '🏰', text: 'Employ 50 people.', earned: (s) => s.staff.ops + s.staff.rnd + s.staff.sales >= 50 },
  { id: 'decade', name: 'The Founders\' Clock', emoji: '🕰️', text: 'Trade for ten years.', earned: (s) => s.month >= 120 },
  { id: 'awards3', name: 'The Trophy Arch', emoji: '🏆', text: 'Win three awards.', earned: (s) => (s.awards?.length ?? 0) >= 3 },
  { id: 'deals', name: 'The Handshake Bridge', emoji: '🌉', text: 'Complete an acquisition.', earned: (s) => s.acquisitions.length > 0 },
  { id: 'green', name: 'The Green Garden', emoji: '🌳', text: 'Take two green steps.', earned: (s) => (s.strat?.green?.length ?? 0) >= 2 },
];
export const monumentsOf = (s: GameState): Monument[] => MONUMENTS.filter((m) => m.earned(s));

// ---------------------------------------------------------------------------------------------
// Multipliers used by modifiers.ts
// ---------------------------------------------------------------------------------------------
const councilActive = (s: GameState, id: string): boolean => s.play7?.councilPick === id && s.month - (s.play7.councilQ ?? -99) * 3 < 6;
export const play7Capacity = (s: GameState): number => { const b = budgetOf(s); return b ? 1 + 0.03 * budgetEffect(b.ops) : 1; };
export const play7Demand = (s: GameState): number => {
  const b = budgetOf(s);
  return (b ? 1 + 0.03 * budgetEffect(b.sales) : 1) * (councilActive(s, 'price') ? 1.03 : 1) * (councilActive(s, 'loyalty') ? 1.02 : 1) * (outsourced(s).includes('delivery') ? 0.99 : 1);
};
export const play7Cost = (s: GameState): number => outsourced(s).reduce((a, id) => a * (OUTSOURCE.find((o) => o.id === id)?.cost ?? 1), 1) * (councilActive(s, 'price') ? 1.015 : 1);
export const play7Quality = (s: GameState): number => outsourced(s).reduce((a, id) => a + (OUTSOURCE.find((o) => o.id === id)?.quality ?? 0), 0);
export const play7Key = (s: GameState): string => `${outsourced(s).join('')}${budgetOf(s) ? `${budgetOf(s)!.ops}.${budgetOf(s)!.sales}` : ''}${s.play7?.councilPick ?? ''}${councilActive(s, 'price') || councilActive(s, 'loyalty') ? 1 : 0}`;
