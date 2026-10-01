import {
  currentBalanceSheet, forecast, INDUSTRIES, mergePeriods, monthLabel, plSummary, valuationOf, type GameState, type MonthRecord,
} from '@cfx/engine';
import { useMemo } from 'react';

/** Memoised views of the game used across screens. Recomputed only when the state object changes. */
export function useDerived(game: GameState) {
  return useMemo(() => {
    const ind = INDUSTRIES[game.industryId];
    const bs = currentBalanceSheet(game);
    const last: MonthRecord | undefined = game.history[game.history.length - 1];
    const prev: MonthRecord | undefined = game.history[game.history.length - 2];
    const lastPL = last ? plSummary(last.period.pl) : null;
    const prevPL = prev ? plSummary(prev.period.pl) : null;
    const valuation = valuationOf(game);
    const fc = game.status === 'playing' ? forecast(game, 12) : null;
    const balanced = game.integrityErrors.length === 0 && bs.difference === 0;
    return { ind, bs, last, prev, lastPL, prevPL, valuation, forecast: fc, balanced };
  }, [game]);
}

export function yearsOf(game: GameState): number[] {
  const out: number[] = [];
  for (let y = 0; y * 12 < game.history.length; y++) out.push(y);
  return out;
}

export function yearPeriod(game: GameState, y: number) {
  const recs = game.history.slice(y * 12, y * 12 + 12);
  return { recs, period: mergePeriods(recs.map((r) => r.period)), closing: recs[recs.length - 1], label: recs.length === 12 ? `FY${monthLabel(y * 12).slice(4)}` : `FY${monthLabel(y * 12).slice(4)} (${recs.length}m)` };
}
