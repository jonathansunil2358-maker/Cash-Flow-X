import {
  franchiseCheck, franchiseCount, formatGBP, formatPct, MAX_FRANCHISES, royaltyEach, ROYALTY_RATE, segmentsOf, supplierCheck, supplierDef, SUPPLIERS, type GameState, type SupplierId,
} from '@cfx/engine';
import { Button, Card, KeyValue, Meter } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

/** Choose who supplies you: cheap and risky, the usual, or dear and dependable. */
export function SupplierCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const current = supplierDef(game.supplier);
  return (
    <Fold id="card-supplier" title="Supplier" summary={`${current.name}. Open to change who supplies you.`}
      subtitle="Cheap suppliers save money but sometimes let you down; premium ones cost more but never do and quality creeps up. You can switch once every three months.">
      <div className="grid gap-2">
        {SUPPLIERS.map((x) => {
          const check = supplierCheck(game, x.id);
          const active = current.id === x.id;
          return (
            <div key={x.id} className={`flex items-center gap-3 rounded-lg border p-2.5 ${active ? 'border-[var(--go)]' : 'border-line'}`}>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{x.name}{active ? ' · current' : ''}</div>
                <div className="text-xs text-ink-2">{x.blurb}</div>
                {!active && !check.ok && <div className="text-xs text-muted">{check.reason}</div>}
              </div>
              {!active && <Button disabled={!check.ok || game.status !== 'playing'} onClick={() => act({ type: 'setSupplier', supplier: x.id as SupplierId }, `Now using the ${x.name.toLowerCase()}.`)}>Switch</Button>}
            </div>
          );
        })}
      </div>
    </Fold>
  );
}

/** Franchise your brand: royalties in, reputation risk out. */
export function FranchiseCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const check = franchiseCheck(game);
  const n = franchiseCount(game);
  return (
    <Fold id="card-franchise" title="Franchising" summary={n ? `${n} franchise${n === 1 ? '' : 's'}, about ${formatGBP(royaltyEach(game) * n, { compact: true })} a month in royalties. Open for details.` : 'License your name to others. Open to see how it works.'}
      subtitle={`Each franchise pays ${Math.round(ROYALTY_RATE * 100)}% of your monthly sales as a royalty. Setting one up costs half a month of sales. Franchisees are not you: now and then one lets standards slip and your reputation falls.`}>
      <div className="space-y-3">
        <KeyValue rows={[
          ['Franchises open', `${n} of ${MAX_FRANCHISES}`],
          ['Royalty for each', formatGBP(royaltyEach(game), { compact: true }) + ' a month'],
          ['Set-up cost for the next', formatGBP(check.fee, { compact: true })],
        ]} />
        <Button variant="primary" disabled={!check.ok || game.status !== 'playing'} onClick={() => act({ type: 'addFranchise' }, 'A new franchise opens.')}>Open a franchise</Button>
        {!check.ok && <p className="text-xs text-muted">{check.reason}</p>}
      </div>
    </Fold>
  );
}

/** Who buys from you: bargain hunters, loyal regulars and big spenders. */
export function SegmentsCard({ game }: { game: GameState }) {
  const segs = segmentsOf(game);
  return (
    <Fold id="card-segments" title="Customer segments" summary={`${segs.map((x) => `${formatPct(x.share, 0)} ${x.name.toLowerCase()}`).join(' · ')}. Open for what they want.`}
      subtitle="A picture of who buys from you, from your price, quality and brand. It explains the demand model; it does not change it.">
      <div className="space-y-3">
        {segs.map((x) => (
          <div key={x.id}>
            <Meter value={Math.round(x.share * 100)} max={100} label={x.name} text={formatPct(x.share, 0)} />
            <p className="mt-1 text-xs text-ink-2">{x.blurb} {x.tip}</p>
          </div>
        ))}
      </div>
    </Fold>
  );
}
