import { chance, type Rng } from '../rng';
import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { logItem, type GameState } from './state';

/**
 * A side venture inside your company (not a second company): put cash into something risky and find
 * out months later. The stake sits in short-term investments until it settles, so the books always
 * balance. At most two at a time, and never more than a quarter of your cash.
 */
export type VentureKind = 'safe' | 'growth' | 'moonshot';
export interface VentureDef { id: VentureKind; name: string; months: number; winChance: number; winMult: number; loseMult: number; blurb: string }
export const VENTURES: VentureDef[] = [
  { id: 'safe', name: 'Supplier partnership', months: 6, winChance: 1, winMult: 1.06, loseMult: 1.06, blurb: 'Six months, a sure 6% return.' },
  { id: 'growth', name: 'New product line', months: 9, winChance: 0.65, winMult: 1.4, loseMult: 0.85, blurb: 'Nine months. Two in three work out (+40%), otherwise you lose 15%.' },
  { id: 'moonshot', name: 'Moonshot', months: 12, winChance: 0.3, winMult: 3.2, loseMult: 0.15, blurb: 'Twelve months. One in three pays 3.2 times your money; the rest lose most of it.' },
];
export const MAX_VENTURES = 2;
export const MIN_VENTURE = 1_000_00;
export const VENTURE_CASH_SHARE = 0.25;

export interface Venture { kind: VentureKind; stake: Pence; start: number; end: number }

export const ventureDef = (k: string): VentureDef | undefined => VENTURES.find((v) => v.id === k);
export const ventureHeld = (s: GameState): Pence => (s.ventures ?? []).reduce((a, v) => a + v.stake, 0);

export function ventureCheck(s: GameState, kind: string, amount: number): { ok: boolean; reason?: string } {
  if (!ventureDef(kind)) return { ok: false, reason: 'Unknown venture.' };
  if ((s.ventures ?? []).length >= MAX_VENTURES) return { ok: false, reason: `You can run at most ${MAX_VENTURES} ventures at once.` };
  if (!Number.isSafeInteger(amount) || amount < MIN_VENTURE) return { ok: false, reason: `The smallest stake is ${formatGBP(MIN_VENTURE)}.` };
  const cash = s.ledger.balances.cash;
  if (amount > Math.floor(cash * VENTURE_CASH_SHARE)) return { ok: false, reason: `A venture can take at most a quarter of your cash (${formatGBP(Math.max(0, Math.floor(cash * VENTURE_CASH_SHARE)))}).` };
  return { ok: true };
}

export function startVenture(s: GameState, kind: VentureKind, amount: Pence): void {
  const def = ventureDef(kind)!;
  post(s.ledger, s.month, `Venture stake: ${def.name}`, [dr('investments', amount), cr('cash', amount)], { cf: 'investing', cfLabel: 'Net (purchase)/sale of short-term investments' });
  (s.ventures ??= []).push({ kind, stake: amount, start: s.month, end: s.month + def.months });
  logItem(s, 'action', `Started a venture: ${def.name}`, `${formatGBP(amount)} is tied up until month ${s.month + def.months + 1}. ${def.blurb}`);
}

/** Called at the end of each month: settles any venture that has run its course. */
export function advanceVentures(s: GameState, rng: Rng, simulation: boolean): void {
  if (!s.ventures?.length) return;
  const keep: Venture[] = [];
  for (const v of s.ventures) {
    if (s.month < v.end) { keep.push(v); continue; }
    const def = ventureDef(v.kind)!;
    // A forecast never rolls the dice: it assumes the average outcome.
    const win = simulation ? false : chance(rng, def.winChance);
    const mult = simulation ? def.winChance * def.winMult + (1 - def.winChance) * def.loseMult : win ? def.winMult : def.loseMult;
    const payout = Math.round(v.stake * mult);
    const gain = payout - v.stake;
    if (gain > 0) post(s.ledger, s.month, `Venture gain: ${def.name}`, [dr('investments', gain), cr('fairValueGains', gain)], { cf: 'operating' });
    if (gain < 0) post(s.ledger, s.month, `Venture loss: ${def.name}`, [dr('fairValueGains', -gain), cr('investments', -gain)], { cf: 'operating' });
    post(s.ledger, s.month, `Venture settled: ${def.name}`, [dr('cash', payout), cr('investments', payout)], { cf: 'investing', cfLabel: 'Net (purchase)/sale of short-term investments' });
    logItem(s, 'event', gain >= 0 ? `Your ${def.name.toLowerCase()} paid off` : `Your ${def.name.toLowerCase()} fell short`,
      gain >= 0 ? `It returned ${formatGBP(payout)} on a ${formatGBP(v.stake)} stake.` : `It returned only ${formatGBP(payout)} on a ${formatGBP(v.stake)} stake. That is how ventures go.`);
  }
  s.ventures = keep.length ? keep : undefined;
}
