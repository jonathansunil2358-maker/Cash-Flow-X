import { formatAccounting, formatGBP, formatInt, monthLabel, type GameState } from '@cfx/engine';
import { useMemo } from 'react';
import { CashChart, type CashPoint } from '../components/charts';
import { Card, PageTitle, Stat } from '../components/ui';
import { useDerived } from '../lib/derived';
import { WhatIfCard } from './Fun';

export function ForecastPage({ game }: { game: GameState }) {
  const d = useDerived(game);
  const f = d.forecast;
  const data = useMemo<CashPoint[]>(() => {
    const pts: CashPoint[] = game.history.slice(-6).map((r) => ({ label: monthLabel(r.month), cash: r.closing.cash, floor: -r.kpis.overdraftLimit }));
    const start = game.ledger.balances.cash;
    pts.push({ label: 'Now', cash: start, forecast: start });
    for (const p of f?.points ?? []) pts.push({ label: p.label, forecast: p.cash, floor: -p.overdraftLimit });
    return pts;
  }, [game, f]);

  if (!f) return <div><PageTitle title="Forecast" /><Card><p className="text-sm text-ink-2">The game has ended.</p></Card></div>;
  const totalProfit = f.points.reduce((a, p) => a + p.profit, 0);
  const totalCash = f.points.reduce((a, p) => a + p.netCashFlow, 0);
  return (
    <div>
      <PageTitle title="12-month forecast" subtitle="Runs the real engine forward on a copy of your company, assuming today's decisions stay unchanged and using expected values (no random events). Change a decision and come back: the forecast updates instantly." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lowest cash point" value={formatGBP(f.minCash, { compact: true })} sub={f.minCashMonth} tone={f.minCash < 0 ? 'bad' : 'neutral'} />
        <Stat label="Funding runs out" value={f.insolventInMonths ? `${f.insolventInMonths} months` : 'Not in 12 months'} tone={f.insolventInMonths ? 'bad' : 'good'} sub={f.insolventInMonths ? 'Act now: borrow, raise, cut or collect' : 'Within overdraft throughout'} />
        <Stat label="Forecast profit (12m)" value={formatGBP(totalProfit, { compact: true })} tone={totalProfit >= 0 ? 'good' : 'bad'} />
        <Stat label="Forecast cash flow (12m)" value={formatGBP(totalCash, { compact: true })} tone={totalCash >= 0 ? 'good' : 'bad'} sub="Profit ≠ cash: working capital, capex, debt and tax timing" />
      </div>
      <WhatIfCard game={game} />
      <Card className="mt-5" title="Cash runway">
        <CashChart data={data} height={300} />
      </Card>
      <Card className="mt-5" title="Projected monthly figures">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 text-left font-medium">Month</th>
                <th className="py-2 text-right font-medium">{d.ind.model === 'subscription' ? d.ind.unitPlural : `${d.ind.unitPlural} sold`}</th>
                <th className="py-2 text-right font-medium">Revenue</th>
                <th className="py-2 text-right font-medium">EBITDA</th>
                <th className="py-2 text-right font-medium">Profit</th>
                <th className="py-2 text-right font-medium">Net cash flow</th>
                <th className="py-2 text-right font-medium">Closing cash</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {f.points.map((p) => (
                <tr key={p.month} className="border-b border-line/60">
                  <td className="py-1.5">{p.label}</td>
                  <td className="py-1.5 text-right">{formatInt(p.volume)}</td>
                  <td className="py-1.5 text-right">{formatAccounting(p.revenue)}</td>
                  <td className="py-1.5 text-right">{formatAccounting(p.ebitda)}</td>
                  <td className="py-1.5 text-right">{formatAccounting(p.profit)}</td>
                  <td className="py-1.5 text-right">{formatAccounting(p.netCashFlow)}</td>
                  <td className={`py-1.5 text-right font-medium ${p.cash < -p.overdraftLimit ? 'text-critical-text' : ''}`}>{formatAccounting(p.cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
