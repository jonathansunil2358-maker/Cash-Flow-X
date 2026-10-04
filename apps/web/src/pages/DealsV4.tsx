import {
  acquireCheck, bidsFor, CROWD_TIERS, crowdChance, crowdCheck, crowdGoal, dealsOf, formatGBP, grantedPatents, hedgeCheck, HEDGE_MONTHS, LICENCE_RATE, MAX_PATENTS,
  openMarkets, patentCheck, patentChance, PATENT_MONTHS, rivalPrice, saleCheck, vcCheck, vcOffers, type GameState,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, KeyValue } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (game: GameState): boolean => game.status === 'playing';

/** Buy one of your named rivals: its customers join you, and you pay for it in goodwill. */
export function AcquireCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const d = dealsOf(game);
  return (
    <Fold id="card-acquire" title="Buy a rival" summary={`${d.acquired ?? 0} bought so far. Open to see who is for sale.`}
      subtitle="Buying a competitor takes it off the market and grows the market you can reach 6%. You pay a price above its net assets (goodwill), then integration costs for six months, and after a year the deal may be written down if it disappointed.">
      <ul className="space-y-2">
        {game.competitors.map((c, i) => {
          const chk = acquireCheck(game, i);
          return (
            <li key={c.name} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{c.name}</b> · quality {Math.round(c.quality)} · {formatGBP(rivalPrice(game, i), { compact: true })}</span>
              <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'acquireRival', index: i }, `You bought ${c.name}.`)}>Buy</Button>
              {!chk.ok && i === 0 && <span className="basis-full text-xs text-muted">{chk.reason}</span>}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** Sell the whole company to one of three bidders: it ends the run, and the price counts in your score. */
export function SaleCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const chk = saleCheck(game);
  const [ask, setAsk] = useState('');
  const askNum = ask.trim() === '' ? undefined : Number(ask);
  return (
    <Fold id="card-sale" title="Sell the company" summary="Three bidders. Selling ends this company." subtitle="Selling ends the run. The price compared with the valuation (a premium or a discount) is added to or taken from your final score. You can also just keep playing.">
      <ul className="space-y-2">
        {bidsFor(game).map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 flex-1"><b>{b.buyer}</b>: {b.mult.toFixed(2)} × valuation. {b.blurb}</span>
            <Button variant="danger" disabled={!chk.ok || !live(game)} onClick={() => { if (window.confirm(`Sell to ${b.buyer.toLowerCase()}? This ends the company.`)) act({ type: 'tradeSale', bid: b.id, ask: askNum }, 'Sold!'); }}>Sell</Button>
          </li>
        ))}
      </ul>
      <label className="mt-3 block text-xs text-ink-2">Negotiate: ask for this many times the valuation (leave empty to take the bid)
        <input type="number" step="0.01" min="0.8" max="1.6" value={ask} onChange={(e) => setAsk(e.target.value)} aria-label="Ask for a multiple of the valuation"
          className="mt-1 block w-28 rounded-xl border-[3px] border-outline bg-surface-2 px-2 py-1 text-sm font-extrabold text-ink" />
      </label>
      {!chk.ok && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

/** Venture-capital term sheets: money now for a slice of the company, with strings. */
export function VcCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  return (
    <Fold id="card-vc" title="Venture capital" summary="Three term sheets each year. Open to compare them."
      subtitle="Each fund buys new shares, so you own less. Outside investors can never own more than 49%. One round per year.">
      <ul className="space-y-3">
        {vcOffers(game).map((o) => {
          const chk = vcCheck(game, o.id);
          return (
            <li key={o.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1"><b>{o.name}</b>: {formatGBP(o.amount, { compact: true })} at a {formatGBP(o.preMoney, { compact: true })} valuation</span>
                <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'takeVc', offer: o.id }, `${o.name} invests.`)}>Take it</Button>
              </div>
              <p className="text-xs text-ink-2">{o.terms}</p>
              {!chk.ok && <p className="text-xs text-muted">{chk.reason}</p>}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** A crowdfunding campaign: backers' money is a promise to deliver rewards. */
export function CrowdCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const c = dealsOf(game).crowd;
  return (
    <Fold id="card-crowd" title="Crowdfunding" summary={c ? 'A campaign is running or being delivered.' : 'Raise money from fans for rewards.'}
      subtitle="A campaign runs for two months and costs 5% of its goal. If it reaches the goal, backers' money arrives at once but is a liability (deferred revenue) until you deliver the rewards over six months. If not, you lose the campaign costs.">
      {c ? (
        <KeyValue rows={[['Goal', formatGBP(c.goal, { compact: true })], ['Status', c.pledged === undefined ? `Closes in month ${c.end + 1}` : `Delivering, ${c.left} months left`]]} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {CROWD_TIERS.map((t, i) => {
            const chk = crowdCheck(game, i);
            return <Button key={t.name} disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'startCrowd', tier: i }, 'Campaign launched.')}>{t.name}: {formatGBP(crowdGoal(game, i), { compact: true })} ({Math.round(crowdChance(game, i) * 100)}%)</Button>;
          })}
        </div>
      )}
    </Fold>
  );
}

/** Lock in currency or costs for six months. */
export function HedgeCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const fx = hedgeCheck(game, 'fx');
  const cost = hedgeCheck(game, 'cost');
  return (
    <Fold id="card-hedge" title="Hedging" summary="Pay a fee to remove a swing for six months."
      subtitle={`A currency hedge stops exchange swings touching your export sales; a cost hedge freezes your unit costs. Each lasts ${HEDGE_MONTHS} months, costs about 1% of monthly sales, and gives up any swing in your favour too.`}>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!fx.ok || !live(game)} onClick={() => act({ type: 'hedge', kind: 'fx' }, 'Currency hedged.')}>Hedge currency ({formatGBP(fx.fee, { compact: true })})</Button>
        <Button disabled={!cost.ok || !live(game)} onClick={() => act({ type: 'hedge', kind: 'cost' }, 'Costs locked in.')}>Lock in costs ({formatGBP(cost.fee, { compact: true })})</Button>
      </div>
      {!fx.ok && openMarkets(game).length === 0 && <p className="mt-2 text-xs text-muted">{fx.reason}</p>}
      {!cost.ok && <p className="mt-2 text-xs text-muted">{cost.reason}</p>}
    </Fold>
  );
}

/** Patents: pay to protect an idea; if granted it earns licence income. */
export function PatentCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const chk = patentCheck(game);
  const list = dealsOf(game).patents ?? [];
  return (
    <Fold id="card-patents" title="Patents" summary={`${grantedPatents(game)} granted of ${MAX_PATENTS} possible.`}
      subtitle={`Filing costs ${formatGBP(chk.fee, { compact: true })} and a decision takes ${PATENT_MONTHS} months (${Math.round(patentChance(game) * 100)}% chance now; more R&D staff helps). A granted patent earns licence income of ${(LICENCE_RATE * 100).toFixed(1)}% of monthly sales, with a yearly renewal fee.`}>
      <div className="space-y-2">
        {list.length > 0 && <KeyValue rows={list.map((p, i) => [`Patent ${i + 1}`, p.decided ? (p.granted ? 'Granted' : 'Refused') : `Filed in month ${p.filed + 1}`] as [string, string])} />}
        <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'filePatent' }, 'Patent filed.')}>File a patent</Button>
        {!chk.ok && <p className="text-xs text-muted">{chk.reason}</p>}
      </div>
    </Fold>
  );
}
