import { formatGBP, monthLabel, type GameState } from '@cfx/engine';
import { Card, PageTitle } from '../components/ui';
import { DealRoom, DealBookCard, HostileCard } from './DealsV5';

export function Deals({ game }: { game: GameState }) {
  return (
    <div>
      <PageTitle title="Mergers & acquisitions" subtitle="Companies come up for sale all year. Check them for hidden problems, haggle over the price, choose how to pay and how to join the businesses. Anything above the fair value of net assets becomes goodwill, tested for impairment every year end (IAS 36)." />
      <DealRoom game={game} open />
      <Card className="mt-5" title="Completed acquisitions" subtitle={`Goodwill on the balance sheet: ${formatGBP(game.ledger.balances.goodwill)}`}>
        {game.acquisitions.length === 0 ? <p className="text-sm text-ink-2">None yet.</p> : (
          <table className="w-full text-sm tnum">
            <thead><tr className="border-b border-line text-xs text-muted"><th className="py-2 text-left font-medium">Company</th><th className="py-2 text-left font-medium">Date</th><th className="py-2 text-right font-medium">Price</th><th className="py-2 text-right font-medium">Net assets</th><th className="py-2 text-right font-medium">Goodwill</th></tr></thead>
            <tbody>{game.acquisitions.map((a) => (
              <tr key={a.name + a.month} className="border-b border-line/60"><td className="py-1.5">{a.name}{a.divested ? ' (sold)' : ''}</td><td>{monthLabel(a.month)}</td><td className="text-right">{formatGBP(a.price)}</td><td className="text-right">{formatGBP(a.netAssets)}</td><td className="text-right">{formatGBP(a.goodwill)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      <div className="mt-5 space-y-3"><DealBookCard game={game} /><HostileCard game={game} /></div>
    </div>
  );
}
