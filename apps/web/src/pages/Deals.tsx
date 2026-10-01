import { formatGBP, monthLabel, targetNetAssets, type AcquisitionTarget, type GameState } from '@cfx/engine';
import { Button, Card, KeyValue, PageTitle, StatusPill } from '../components/ui';
import { useDerived } from '../lib/derived';
import { useGame } from '../store';

export function Deals({ game }: { game: GameState }) {
  const d = useDerived(game);
  return (
    <div>
      <PageTitle title="Mergers & acquisitions" subtitle="Buy competitors to add customers, staff and assets. You pay cash; anything above the fair value of net assets becomes goodwill, tested for impairment every year end (IAS 36). New targets each January." />
      <div className="grid gap-5 lg:grid-cols-3">
        {game.targets.length === 0 && <Card><p className="text-sm text-ink-2">No targets on the market. Check back in January.</p></Card>}
        {game.targets.map((t) => <TargetCard key={t.id} game={game} t={t} multiple={d.ind.multiples.evEbitda} />)}
      </div>
      <Card className="mt-5" title="Completed acquisitions" subtitle={`Goodwill on the balance sheet: ${formatGBP(game.ledger.balances.goodwill)}`}>
        {game.acquisitions.length === 0 ? <p className="text-sm text-ink-2">None yet.</p> : (
          <table className="w-full text-sm tnum">
            <thead><tr className="border-b border-line text-xs text-muted"><th className="py-2 text-left font-medium">Company</th><th className="py-2 text-left font-medium">Date</th><th className="py-2 text-right font-medium">Price</th><th className="py-2 text-right font-medium">Net assets</th><th className="py-2 text-right font-medium">Goodwill</th></tr></thead>
            <tbody>{game.acquisitions.map((a) => (
              <tr key={a.name + a.month} className="border-b border-line/60"><td className="py-1.5">{a.name}</td><td>{monthLabel(a.month)}</td><td className="text-right">{formatGBP(a.price)}</td><td className="text-right">{formatGBP(a.netAssets)}</td><td className="text-right">{formatGBP(a.goodwill)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function TargetCard({ game, t, multiple }: { game: GameState; t: AcquisitionTarget; multiple: number }) {
  const act = useGame((s) => s.act);
  const net = targetNetAssets(t);
  const ev = t.askingPrice - t.cash + t.debt;
  const ebitda = t.diligenceDone ? t.trueEbitda : t.reportedEbitda;
  const implied = ebitda > 0 ? ev / ebitda : null;
  const playing = game.status === 'playing';
  const redFlag = t.diligenceDone && t.reportedEbitda > t.trueEbitda;
  return (
    <Card title={t.name} subtitle={`Offer expires ${monthLabel(t.expiresMonth - 1)}`}>
      <KeyValue rows={[
        ['Revenue (annual)', formatGBP(t.annualRevenue)],
        ['EBITDA (seller-reported)', formatGBP(t.reportedEbitda)],
        ['EBITDA (after due diligence)', t.diligenceDone ? formatGBP(t.trueEbitda) : 'Unknown'],
        ['Asking price (equity)', formatGBP(t.askingPrice)],
        ['Implied EV / EBITDA', implied === null ? 'n/a (loss-making)' : `${implied.toFixed(1)}x vs industry ${multiple}x`],
        ['Net assets acquired', formatGBP(net)],
        ['Goodwill you would book', formatGBP(t.askingPrice - net)],
        ['Debt assumed', formatGBP(t.debt)],
        ['Staff joining', `${t.heads.ops + t.heads.rnd + t.heads.sales}`],
      ]} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {t.diligenceDone ? <StatusPill kind={redFlag ? 'bad' : 'good'} label={redFlag ? 'EBITDA overstated' : 'Clean diligence'} /> : (
          <Button disabled={!playing} onClick={() => act({ type: 'diligence', targetId: t.id }, 'Due diligence completed. See the findings on the card.')}>Due diligence ({formatGBP(t.diligenceFee)})</Button>
        )}
        <Button variant="primary" disabled={!playing} onClick={() => act({ type: 'acquire', targetId: t.id }, `Acquired ${t.name}.`)}>Acquire</Button>
      </div>
      <p className="mt-2 text-xs text-muted">Plus 3% integration costs, expensed.</p>
    </Card>
  );
}
