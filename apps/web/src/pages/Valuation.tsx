import {
  dcf, formatAccounting, formatGBP, formatPct, monthLabel, ownership, TERMINAL_GROWTH, WIN_EQUITY_VALUE, type DcfYear, type GameState,
} from '@cfx/engine';
import { useMemo } from 'react';
import { TrendChart } from '../components/charts';
import { Card, KeyValue, PageTitle, Stat } from '../components/ui';
import { useDerived } from '../lib/derived';

export function ValuationPage({ game }: { game: GameState }) {
  const d = useDerived(game);
  const v = d.valuation;
  const ind = d.ind;
  const growthAdj = 1 + Math.min(1, Math.max(-0.3, v.revenueGrowth)) * 0.3;
  const detail = useMemo(() => (v.ttmRevenue > 0 ? dcf(v.ttmRevenue, v.ttmEbitda, v.revenueGrowth, game.economy.baseRate, ind) : null), [v, game.economy.baseRate, ind]);
  const trend = useMemo(() => game.history.map((r) => ({ label: monthLabel(r.month), equity: r.valuation.equityValue })), [game]);
  const own = ownership(game);

  return (
    <div>
      <PageTitle title="Valuation" subtitle="Three methods side by side. Multiples price you against comparable companies today; the DCF values the cash you are expected to generate. They disagree for good reasons, and seeing why is the point." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="EV / EBITDA method" value={formatGBP(v.evEbitda, { compact: true })} sub={v.ttmEbitda > 0 ? `${formatGBP(v.ttmEbitda, { compact: true })} × ${ind.multiples.evEbitda}x × ${growthAdj.toFixed(2)} growth adj.` : 'n/a: EBITDA not positive'} />
        <Stat label="Revenue multiple" value={formatGBP(v.evRevenue, { compact: true })} sub={`${formatGBP(v.ttmRevenue, { compact: true })} × ${ind.multiples.evRevenue}x (haircut if loss-making)`} />
        <Stat label="DCF" value={formatGBP(v.dcf, { compact: true })} sub={`WACC ${formatPct(v.wacc)} · terminal growth ${formatPct(TERMINAL_GROWTH, 0)}`} />
        <Stat label="Enterprise value used" value={formatGBP(v.enterpriseValue, { compact: true })} sub={v.method} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="From enterprise value to your wealth">
          <KeyValue rows={[
            ['Enterprise value', formatGBP(v.enterpriseValue)],
            ['Less: net debt (borrowings − cash − investments)', formatAccounting(-v.netDebt)],
            ['Equity value (floored at book net assets)', formatGBP(v.equityValue)],
            ['Your ownership', formatPct(own)],
            ['Your stake', formatGBP(Math.round(v.equityValue * own))],
            ['Implied P/E', v.peRatio === null ? 'n/a (not profitable)' : `${v.peRatio.toFixed(1)}x`],
            ['Trailing revenue growth', formatPct(v.revenueGrowth)],
          ]} />
        </Card>
        <Card title="Equity value over time" subtitle="The dashed line is the £10m target.">
          {trend.length ? <TrendChart data={trend} dataKey="equity" name="Equity value" target={WIN_EQUITY_VALUE} targetLabel="£10m" /> : <p className="py-8 text-center text-sm text-ink-2">No history yet.</p>}
        </Card>
      </div>

      <Card className="mt-5" title="Discounted cash flow" subtitle={`Revenue growth fades from today's ${formatPct(Math.min(0.6, Math.max(-0.2, v.revenueGrowth)))} to ${formatPct(TERMINAL_GROWTH, 0)}; EBITDA margin converges to the industry's mature ${formatPct(ind.targetEbitdaMargin, 0)}; tax 25%; capex ${formatPct(ind.capexPctRevenue, 0)} and working capital ${formatPct(ind.nwcPctRevenue, 0)} of revenue growth.`}>
        {detail ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm tnum">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 text-left font-medium">£</th>
                  {detail.years.map((y) => <th key={y.year} className="py-2 text-right font-medium">Year {y.year}</th>)}
                </tr>
              </thead>
              <tbody>
                {([
                  ['Revenue', (y) => y.revenue],
                  ['EBITDA', (y) => y.ebitda],
                  ['Tax', (y) => -y.tax],
                  ['Capex', (y) => -y.capex],
                  ['Working capital', (y) => -y.nwcChange],
                  ['Free cash flow', (y) => y.fcf],
                  ['Present value', (y) => y.pv],
                ] as [string, (y: DcfYear) => number][]).map(([label, f]) => (
                  <tr key={label} className={`border-b border-line/60 ${label === 'Free cash flow' ? 'font-semibold' : ''}`}>
                    <td className="py-1.5 text-ink-2">{label}</td>
                    {detail.years.map((y) => <td key={y.year} className="py-1.5 text-right">{formatAccounting(f(y))}</td>)}
                  </tr>
                ))}
                <tr className="border-b border-line/60 text-ink-2">
                  <td className="py-1.5">Margin</td>
                  {detail.years.map((y) => <td key={y.year} className="py-1.5 text-right">{formatPct(y.margin)}</td>)}
                </tr>
              </tbody>
            </table>
            <div className="mt-3 max-w-md">
              <KeyValue rows={[
                ['Sum of PV of free cash flows', formatGBP(detail.years.reduce((a, y) => a + y.pv, 0))],
                ['Terminal value (Gordon growth)', formatGBP(detail.terminalValue)],
                ['PV of terminal value', formatGBP(detail.pvTerminal)],
                ['DCF enterprise value', formatGBP(detail.enterpriseValue)],
              ]} />
            </div>
          </div>
        ) : <p className="text-sm text-ink-2">Needs trading history.</p>}
      </Card>
    </div>
  );
}
