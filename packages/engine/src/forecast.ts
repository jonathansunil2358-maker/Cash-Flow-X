import { plSummary } from './ledger/statements';
import type { Pence } from './money';
import { monthLabel, totalCustomers, type GameState } from './model/state';
import { tickInPlace } from './tick';

export interface ForecastPoint {
  month: number;
  label: string;
  cash: Pence;
  overdraftLimit: Pence;
  revenue: Pence;
  ebitda: Pence;
  profit: Pence;
  netCashFlow: Pence;
  volume: number;
}

export interface Forecast {
  points: ForecastPoint[];
  /** Months until cash would breach the overdraft limit, or null if it never does in the horizon. */
  insolventInMonths: number | null;
  minCash: Pence;
  minCashMonth: string;
}

/**
 * Project the business forward assuming current decisions stay unchanged, with expected values
 * (no random noise or events). Runs the real engine on a copy, so the forecast uses exactly the
 * same accounting as the game.
 */
export function forecast(state: GameState, months = 12): Forecast {
  const s = structuredClone(state);
  s.lastMonth = Math.max(s.lastMonth, s.month + months + 1);
  const points: ForecastPoint[] = [];
  let insolventInMonths: number | null = null;
  for (let i = 0; i < months && s.status === 'playing'; i++) {
    tickInPlace(s, { simulation: true });
    const r = s.history[s.history.length - 1];
    const pl = plSummary(r.period.pl);
    points.push({
      month: r.month,
      label: monthLabel(r.month),
      cash: r.closing.cash,
      overdraftLimit: r.kpis.overdraftLimit,
      revenue: pl.revenue,
      ebitda: pl.ebitda,
      profit: pl.profit,
      netCashFlow: r.closing.cash - r.period.openingCash,
      volume: r.kpis.unitsSold || totalCustomers(s),
    });
    if ((s.status as GameState['status']) === 'insolvent' && insolventInMonths === null) insolventInMonths = i + 1;
  }
  const min = points.reduce((a, p) => (p.cash < a.cash ? p : a), points[0] ?? { cash: state.ledger.balances.cash, label: monthLabel(state.month) } as ForecastPoint);
  return { points, insolventInMonths, minCash: min.cash, minCashMonth: min.label };
}
