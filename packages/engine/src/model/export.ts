import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { plSummary } from '../ledger/statements';
import { logItem, type GameState } from './state';

/**
 * Export markets: open a market abroad for more demand. Each has a set-up cost, a monthly upkeep and a
 * currency that swings from month to month (the same swings for everyone with the same company seed), so the
 * extra sales are bigger in a good month and smaller in a bad one.
 */
export interface MarketDef { id: string; name: string; base: number; swing: number; upkeep: number; blurb: string }
export const MARKETS: MarketDef[] = [
  { id: 'europe', name: 'Europe', base: 0.04, swing: 0.03, upkeep: 0.004, blurb: 'Close, steady, and a mild currency.' },
  { id: 'usa', name: 'North America', base: 0.07, swing: 0.05, upkeep: 0.007, blurb: 'A big market with a lively dollar.' },
  { id: 'asia', name: 'Asia', base: 0.1, swing: 0.08, upkeep: 0.011, blurb: 'The biggest prize, and the wildest currency.' },
];
export const MARKET_MIN_MONTH = 12;
export const marketDef = (id: string): MarketDef | undefined => MARKETS.find((m) => m.id === id);
export const openMarkets = (s: GameState): string[] => s.markets ?? [];

const lastRevenue = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
export const marketFee = (s: GameState): Pence => Math.max(3_000_00, Math.round(lastRevenue(s) / 10000) * 10000);

/** This month's currency swing for a market, from -1 to +1 times its volatility. */
export const currencyOf = (s: GameState, m: MarketDef): number => ((hashSeed(`${s.seedLabel}:fx:${m.id}:${s.month}`) % 2001) / 1000 - 1) * m.swing;
export function exportMult(s: GameState): number {
  let mult = 1;
  for (const id of openMarkets(s)) { const m = marketDef(id); if (m) mult += m.base * (1 + currencyOf(s, m) / m.base * 0.5); }
  return mult;
}
export function exportUpkeep(s: GameState): Pence {
  const rev = lastRevenue(s);
  return openMarkets(s).reduce((a, id) => a + Math.round(rev * (marketDef(id)?.upkeep ?? 0)), 0);
}

export function marketCheck(s: GameState, id: string): { ok: boolean; reason?: string; fee: Pence } {
  const fee = marketFee(s);
  if (!marketDef(id)) return { ok: false, reason: 'Unknown market.', fee };
  if (openMarkets(s).includes(id)) return { ok: false, reason: 'That market is already open.', fee };
  if (s.month < MARKET_MIN_MONTH) return { ok: false, reason: `Overseas buyers want a track record: wait until month ${MARKET_MIN_MONTH + 1}.`, fee };
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'You need sales at home before you sell abroad.', fee };
  return { ok: true, fee };
}
export function openMarket(s: GameState, id: string): void {
  const fee = marketFee(s);
  const m = marketDef(id)!;
  post(s.ledger, s.month, `Opening the ${m.name} market`, [dr('marketing', fee), cr('cash', fee)], { cf: 'operating' });
  s.markets = [...openMarkets(s), id];
  logItem(s, 'action', `${m.name} market opens`, `Set-up cost ${formatGBP(fee)}. It adds about ${Math.round(m.base * 100)}% to your demand, with a currency that swings by up to ±${Math.round(m.swing * 100)}%.`);
}
