import { applyActionInPlace } from './actions';
import { plSummary } from './ledger/statements';
import type { Pence } from './money';
import { DIFFICULTIES } from './model/difficulty';
import { perkEffects } from './model/perks';
import type { GameState, LogItem } from './model/state';
import { tickInPlace } from './tick';

/** Real minutes away per offline game month (online, a month takes 10 seconds at x1). */
export const OFFLINE_MINUTES_PER_MONTH = 40;
/** Base cap on offline progress, in real hours. */
export const OFFLINE_BASE_HOURS = 8;

/** Offline hours cap after the Night shift perk. */
export function offlineCapHours(s: GameState): number {
  const perks = DIFFICULTIES[s.difficulty].perksApply ? s.perks : {};
  return OFFLINE_BASE_HOURS + perkEffects(perks).offlineHours;
}

/** How many game months a period away is worth. */
export function offlineMonthsFor(s: GameState, awayMs: number): number {
  const minutes = Math.min(Math.max(0, awayMs) / 60_000, offlineCapHours(s) * 60);
  return Math.floor(minutes / OFFLINE_MINUTES_PER_MONTH);
}

export interface OfflineSummary {
  months: number;
  requestedMonths: number;
  revenue: Pence;
  profit: Pence;
  cashChange: Pence;
  stoppedEarly: string | null;
  news: LogItem[];
}

/**
 * Run the business while the player was away: the engine's normal monthly close, with the away
 * flag set (no bad news, no decisions, 25% less demand). Recorded as setAway actions so a replay
 * reproduces it exactly. Stops early if cash turns negative so the player can react.
 * Mutates `s`.
 */
export function runOffline(s: GameState, months: number): OfflineSummary {
  const summary: OfflineSummary = { months: 0, requestedMonths: months, revenue: 0, profit: 0, cashChange: 0, stoppedEarly: null, news: [] };
  if (months <= 0 || s.status !== 'playing' || s.pendingEvent) return summary;
  const startCash = s.ledger.balances.cash;
  const logStart = s.log.length;
  applyActionInPlace(s, { type: 'setAway', away: true });
  for (let i = 0; i < months && s.status === 'playing'; i++) {
    tickInPlace(s);
    summary.months += 1;
    const pl = plSummary(s.history[s.history.length - 1].period.pl);
    summary.revenue += pl.revenue;
    summary.profit += pl.profit;
    if (s.ledger.balances.cash < 0) {
      summary.stoppedEarly = 'Cash went negative, so the business paused for you to take over.';
      break;
    }
  }
  if (s.status === 'playing') applyActionInPlace(s, { type: 'setAway', away: false });
  summary.cashChange = s.ledger.balances.cash - startCash;
  summary.news = s.log.slice(logStart).filter((l) => l.kind === 'event' || l.kind === 'warning' || l.kind === 'milestone');
  return summary;
}
