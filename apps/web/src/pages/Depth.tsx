import {
  buildingCheck, buildingPrice, buildingSaving, BUILDING_MONTHS, candidatesOf, currencyOf, designCheck, designOf, exportMult, INDUSTRIES, marketCheck, MARKETS, MAX_REPLIES_PER_MONTH, MAX_STARS, monthlyRent, openMarkets,
  ownsBuilding, recruitmentFee, replyCheck, reviewsOf, starCheck, starFeeMultiple, starsOf,
  franchiseCheck, franchiseCount, formatGBP, formatPct, MAX_FRANCHISES, royaltyEach, ROYALTY_RATE, segmentsOf, supplierCheck, supplierDef, SUPPLIERS, type GameState, type SupplierId,
} from '@cfx/engine';
import { useState } from 'react';
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

/** One slider for how loaded your product is: more features sell more but cost more. */
export function DesignCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const [features, setFeatures] = useState(designOf(game));
  const check = designCheck(game, features);
  const demand = (1 + ((features - 50) / 50) * 0.06 - 1) * 100;
  const cost = (((features - 50) / 50) * 0.05) * 100;
  return (
    <Fold id="card-design" title="Product designer" summary={`${designOf(game)} features. Open to redesign.`}
      subtitle="One slider from a bare-bones product to a fully loaded one. 50 is how the game has always worked. More features win more customers but cost more to build. You can redesign once a quarter, for a fee.">
      <div className="space-y-3">
        <label className="block text-xs font-black tracking-wider text-ink-2">FEATURES: {features}
          <input type="range" min={0} max={100} step={5} value={features} aria-label="Features" onChange={(e) => setFeatures(Number(e.target.value))} className="mt-1 w-full" />
        </label>
        <p className="text-sm">At {features}: demand {demand >= 0 ? '+' : ''}{demand.toFixed(1)}% and unit costs {cost >= 0 ? '+' : ''}{cost.toFixed(1)}%. Redesign fee {formatGBP(check.fee, { compact: true })}.</p>
        <Button variant="primary" disabled={!check.ok || game.status !== 'playing'} onClick={() => act({ type: 'setDesign', features }, 'Product redesigned.')}>Redesign</Button>
        {!check.ok && <p className="text-xs text-muted">{check.reason}</p>}
      </div>
    </Fold>
  );
}

/** Four named candidates a month. Hiring one costs extra and brings a lasting perk. */
export function HiringMarketCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const cands = candidatesOf(game);
  const stars = starsOf(game);
  return (
    <Fold id="card-market-hire" title="Hiring market" summary={`${stars.length} star${stars.length === 1 ? '' : 's'} on the team. Open to meet this month's candidates.`}
      subtitle={`Four named candidates are looking for work each month. A star costs more to hire but brings a lasting perk. One hire a month, up to ${MAX_STARS} stars.`}>
      <div className="space-y-3">
        {stars.length > 0 && <p className="text-sm">Your stars: {stars.map((x) => `${x.name} (${'★'.repeat(x.skill)})`).join(', ')}.</p>}
        <ul className="grid gap-2">
          {cands.map((c) => {
            const check = starCheck(game, c.id);
            const fee = recruitmentFee(game, c.role) * starFeeMultiple(c);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{c.name} <span aria-label={`${c.skill} stars`}>{'★'.repeat(c.skill)}</span></div>
                  <div className="text-xs text-ink-2">{INDUSTRIES[game.industryId].roles[c.role].title}. {c.quirk}. Perk: {c.perk}.</div>
                </div>
                <Button disabled={!check.ok || game.status !== 'playing'} onClick={() => act({ type: 'hireStar', id: c.id }, `${c.name} joins the team.`)}>Hire ({formatGBP(fee, { compact: true })})</Button>
              </li>
            );
          })}
        </ul>
      </div>
    </Fold>
  );
}

/** Buy your headquarters and stop paying base rent. */
export function PropertyCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const check = buildingCheck(game);
  return (
    <Fold id="card-property" title="Real estate" summary={ownsBuilding(game) ? 'You own your headquarters.' : `Buy your building for ${formatGBP(buildingPrice(game), { compact: true })}. Open for details.`}
      subtitle={`Buying costs ${BUILDING_MONTHS} months of base rent. After that you stop paying base rent (saving ${formatGBP(buildingSaving(game), { compact: true })} a month) and pay a small yearly upkeep. It is a long-term commitment: you cannot sell it in this version.`}>
      <div className="space-y-3">
        <KeyValue rows={[['Price', formatGBP(buildingPrice(game), { compact: true })], ['Rent you would stop paying', `${formatGBP(buildingSaving(game), { compact: true })} a month`], ['Rent you pay now', `${formatGBP(monthlyRent(game), { compact: true })} a month`]]} />
        <Button variant="primary" disabled={!check.ok || game.status !== 'playing'} onClick={() => act({ type: 'buyBuilding' }, 'You own your headquarters.')}>Buy the building</Button>
        {!check.ok && <p className="text-xs text-muted">{check.reason}</p>}
      </div>
    </Fold>
  );
}

/** Sell abroad: more demand, a monthly upkeep and a currency that swings. */
export function ExportCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const open = openMarkets(game);
  return (
    <Fold id="card-export" title="Export markets" summary={open.length ? `${open.length} market${open.length === 1 ? '' : 's'} open, demand ${formatPct(exportMult(game) - 1, 1)} higher this month.` : 'Sell abroad. Open to see the markets.'}
      subtitle="Each market adds demand, costs a set-up fee and a monthly upkeep, and has a currency that swings from month to month: bigger sales in a good month, smaller in a bad one.">
      <ul className="grid gap-2">
        {MARKETS.map((m) => {
          const check = marketCheck(game, m.id);
          const isOpen = open.includes(m.id);
          return (
            <li key={m.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{m.name}{isOpen ? ` · open (currency ${currencyOf(game, m) >= 0 ? '+' : ''}${(currencyOf(game, m) * 100).toFixed(1)}% this month)` : ''}</div>
                <div className="text-xs text-ink-2">{m.blurb} About +{Math.round(m.base * 100)}% demand.</div>
                {!isOpen && !check.ok && <div className="text-xs text-muted">{check.reason}</div>}
              </div>
              {!isOpen && <Button disabled={!check.ok || game.status !== 'playing'} onClick={() => act({ type: 'openMarket', market: m.id }, `${m.name} market opens.`)}>Open ({formatGBP(check.fee, { compact: true })})</Button>}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** What customers are saying this month. Replying lifts your reputation a little. */
export function ReviewsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const rs = reviewsOf(game);
  return (
    <Fold id="card-reviews" title="Customer reviews" summary={`${rs.map((r) => r.stars).join(' · ')} stars this month. Open to reply.`}
      subtitle={`Five reviews a month, written from your real quality, price and how stretched your team is. Reply to up to ${MAX_REPLIES_PER_MONTH} for a small reputation lift (more for a bad one).`}>
      <ul className="space-y-2">
        {rs.map((r) => {
          const check = replyCheck(game, r.index);
          return (
            <li key={r.index} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-bold">{r.who} <span aria-label={`${r.stars} stars`}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span></div>
                <div className="text-xs text-ink-2">"{r.text}"</div>
              </div>
              <Button disabled={!check.ok || game.status !== 'playing'} aria-label={`Reply to ${r.who}`} onClick={() => act({ type: 'replyReview', index: r.index }, 'Reply sent.')}>{r.replied ? 'Replied' : 'Reply'}</Button>
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}
