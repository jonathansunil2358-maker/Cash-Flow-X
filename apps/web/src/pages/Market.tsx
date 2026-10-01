import { attractiveness, demandFor, formatGBP, formatInt, formatPct, monthLabel, type GameState } from '@cfx/engine';
import { useState } from 'react';
import { Card, KeyValue, PageTitle, StatusPill, Tabs } from '../components/ui';
import { useDerived } from '../lib/derived';

export function Market({ game }: { game: GameState }) {
  const d = useDerived(game);
  const ind = d.ind;
  const dm = demandFor(game, ind);
  const rows = [
    { name: `${game.companyName} (you)`, quality: game.quality, price: game.price, a: dm.playerAttractiveness, you: true },
    ...game.competitors.map((c) => ({ name: c.name, quality: c.quality, price: c.price, a: attractiveness(c.quality, c.price, ind.basePrice, ind.priceElasticity, c.strength), you: false })),
  ];
  const total = rows.reduce((a, r) => a + r.a, 0);
  const [filter, setFilter] = useState<'all' | 'event' | 'warning' | 'action'>('all');
  const log = [...game.log].reverse().filter((l) => filter === 'all' || l.kind === filter || (filter === 'event' && l.kind === 'milestone'));
  const e = game.economy;
  return (
    <div>
      <PageTitle title="Market & economy" subtitle="Demand = market potential × economy × preference share × reach × credit-terms effect." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Where your demand comes from">
          <KeyValue rows={[
            [`Market potential (${ind.model === 'subscription' ? `new ${ind.unitPlural}` : ind.unitPlural} / month)`, formatInt(game.marketSize)],
            ['Economy multiplier', `×${e.demandMult.toFixed(2)}`],
            ['Preference share (quality & price vs rivals)', formatPct(dm.preferenceShare)],
            ['Reach (brand & sales team)', formatPct(dm.reach)],
            ['Credit terms effect', `×${dm.termsMult.toFixed(3)}`],
            ['Expected demand this month', formatInt(dm.demand)],
          ]} />
        </Card>
        <Card title="Economy">
          <KeyValue rows={[
            ['Base rate', formatPct(e.baseRate, 2)],
            ['Demand', `×${e.demandMult.toFixed(2)}`],
            ['Unit costs', `×${e.unitCostMult.toFixed(2)}`],
            ['Bank lending appetite', formatPct(e.lendingAppetite, 0)],
            ['Bad debt rate (monthly, of receivables)', formatPct(e.badDebtRate, 2)],
          ]} />
          <div className="mt-3 flex flex-wrap gap-2">
            {e.active.length === 0 ? <StatusPill kind="ok" label="No active shocks" /> : e.active.map((a) => <StatusPill key={a.type} kind="warn" label={`${a.title} · ${a.remaining}m left`} />)}
          </div>
        </Card>
      </div>
      <Card className="mt-5" title="Competitors" subtitle="Rivals improve over time, faster if you out-innovate them. Dominate the market and someone may start a price war.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm tnum">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 text-left font-medium">Company</th>
                <th className="py-2 text-right font-medium">Quality</th>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Preference share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className={`border-b border-line/60 ${r.you ? 'font-semibold' : ''}`}>
                  <td className="py-1.5">{r.name}</td>
                  <td className="py-1.5 text-right">{r.quality.toFixed(0)}</td>
                  <td className="py-1.5 text-right">{formatGBP(r.price, { pence: true })}</td>
                  <td className="py-1.5 text-right">{formatPct(r.a / total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="mt-5" title="Company log" actions={<Tabs value={filter} onChange={setFilter} items={[{ id: 'all', label: 'All' }, { id: 'event', label: 'Events' }, { id: 'warning', label: 'Warnings' }, { id: 'action', label: 'Decisions' }]} />}>
        <ul className="divide-y divide-line">
          {log.slice(0, 150).map((l, i) => (
            <li key={i} className="py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">{monthLabel(l.month)}</span>
                <span className="font-medium text-ink">{l.title}</span>
              </div>
              <div className="text-ink-2">{l.text}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
