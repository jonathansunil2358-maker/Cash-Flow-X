import {
  formatGBP, formatPct, monthLabel, plSummary, profitBridge, ratios, ratioStatus, type GameState, type Ratio,
} from '@cfx/engine';
import { useMemo, useState } from 'react';
import { WaterfallChart } from '../components/charts';
import { Card, Info, PageTitle, StatusPill, Tabs } from '../components/ui';
import { yearPeriod, yearsOf } from '../lib/derived';

function fmt(r: Ratio): string {
  if (r.value === null || !Number.isFinite(r.value)) return '—';
  switch (r.format) {
    case 'pct': return formatPct(r.value);
    case 'x': return `${r.value.toFixed(2)}x`;
    case 'days': return `${Math.round(r.value)} days`;
    case 'months': return `${r.value.toFixed(1)} months`;
    case 'gbp': return formatGBP(r.value, { compact: true });
  }
}

function fmtBenchmark(r: Ratio): string {
  if (r.benchmark === null) return '';
  return fmt({ ...r, value: r.benchmark });
}

export function Analysis({ game }: { game: GameState }) {
  const list = useMemo(() => ratios(game), [game]);
  const groups = ['Profitability', 'Liquidity', 'Efficiency', 'Leverage'] as const;
  return (
    <div>
      <PageTitle title="Analysis" subtitle="Ratios on a trailing-twelve-month basis (annualised while you have less history), benchmarked against a typical company in your industry." />
      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g} title={g}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-1.5 text-left font-medium">Ratio</th>
                  <th className="py-1.5 text-right font-medium">You</th>
                  <th className="py-1.5 text-right font-medium">Benchmark</th>
                  <th className="py-1.5 text-right font-medium"><span className="sr-only">Status</span></th>
                </tr>
              </thead>
              <tbody>
                {list.filter((r) => r.group === g).map((r) => {
                  const st = ratioStatus(r);
                  return (
                    <tr key={r.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-2">
                        <span className="inline-flex items-center gap-1.5 text-ink">{r.label}<Info text={<><strong className="text-ink">{r.formula}</strong><br />{r.definition}</>} /></span>
                      </td>
                      <td className="tnum py-2 text-right font-medium">{fmt(r)}</td>
                      <td className="tnum py-2 text-right text-ink-2">{fmtBenchmark(r)}</td>
                      <td className="py-2 pl-2 text-right">{r.benchmark !== null && <StatusPill kind={st === 'bad' ? 'bad' : st} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
      <Bridge game={game} />
    </div>
  );
}

function Bridge({ game }: { game: GameState }) {
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const h = game.history;
  const years = yearsOf(game).filter((y) => yearPeriod(game, y).recs.length === 12);
  let content: { start: number; end: number; startLabel: string; endLabel: string; steps: ReturnType<typeof profitBridge> } | null = null;
  if (mode === 'month' && h.length >= 2) {
    const a = plSummary(h[h.length - 2].period.pl);
    const b = plSummary(h[h.length - 1].period.pl);
    content = { start: a.profit, end: b.profit, startLabel: monthLabel(h[h.length - 2].month), endLabel: monthLabel(h[h.length - 1].month), steps: profitBridge(a, b) };
  } else if (mode === 'year' && years.length >= 2) {
    const ya = yearPeriod(game, years[years.length - 2]);
    const yb = yearPeriod(game, years[years.length - 1]);
    const a = plSummary(ya.period.pl);
    const b = plSummary(yb.period.pl);
    content = { start: a.profit, end: b.profit, startLabel: ya.label, endLabel: yb.label, steps: profitBridge(a, b) };
  }
  return (
    <Card className="mt-5" title="Profit bridge (variance analysis)" subtitle="What moved profit between two periods. Blue bars helped profit, red bars hurt it."
      actions={<Tabs value={mode} onChange={setMode} items={[{ id: 'month', label: 'Month on month' }, { id: 'year', label: 'Year on year' }]} />}>
      {content ? (
        <>
          <WaterfallChart {...content} />
          <table className="sr-only">
            <caption>Profit bridge data</caption>
            <tbody>{content.steps.map((s) => <tr key={s.label}><td>{s.label}</td><td>{formatGBP(s.delta)}</td></tr>)}</tbody>
          </table>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-ink-2">{mode === 'month' ? 'Needs two closed months.' : 'Needs two complete financial years.'}</p>
      )}
    </Card>
  );
}
