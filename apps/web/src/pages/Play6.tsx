import {
  BID_DISCOUNTS, eventCardsOf, formatGBP, founderBook, inspectionScore, layoutCheck, layoutCost, layoutFee, layoutWeights, MASCOTS, mascotMood, mascotOf, monthLabel, nextAnniversary,
  play6Of, SHELVES, tempCost, tempsActive, tempsCheck, TENDERS, tenderBids, tenderCheck, tenderFee, TIERS, tierCheck, tierOf, type GameState,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, KeyValue } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (game: GameState): boolean => game.status === 'playing';
const small = (p: number): string => formatGBP(p, { compact: true });

/** Hire extra hands for a busy three months. */
export function TempsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const on = tempsActive(game);
  const quick = tempsCheck(game, false); const trained = tempsCheck(game, true);
  return (
    <Fold id="card-temps" title="Seasonal temps" summary={on ? 'Temps are on the team.' : 'Extra hands for three busy months.'}
      subtitle="Hire temps for three months, once a year. Untrained temps add 4% capacity; trained ones cost more and add 8%.">
      {on ? <p className="text-sm">Your temps leave in {monthLabel(play6Of(game).temps!.until)}.</p> : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={!quick.ok || !live(game)} title={quick.reason} onClick={() => act({ type: 'temps', trained: false }, 'Temps hired.')}>Quick hire ({small(tempCost(game, false))})</Button>
          <Button disabled={!trained.ok || !live(game)} title={trained.reason} onClick={() => act({ type: 'temps', trained: true }, 'Trained temps hired.')}>Trained temps ({small(tempCost(game, true))})</Button>
        </div>
      )}
      {!on && !quick.ok && <p className="mt-2 text-xs text-muted">{quick.reason}</p>}
    </Fold>
  );
}

/** Bronze, silver or gold perks for your customers. */
export function TiersCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const now = tierOf(game);
  return (
    <Fold id="card-tiers" title="Loyalty tiers" summary={`Tier: ${TIERS[now].name}.`}
      subtitle="Reward customers with tiered perks. Richer tiers keep more customers and lift demand, but cost a share of sales every month. Watch the margin.">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Loyalty tier">
        {TIERS.map((t, i) => <Button key={t.name} variant={now === i ? 'primary' : 'secondary'} aria-pressed={now === i} disabled={now === i || !tierCheck(game, i).ok || !live(game)} title={t.blurb} onClick={() => act({ type: 'tiers', level: i }, `Tier: ${t.name}.`)}>{t.name}</Button>)}
      </div>
      <p className="mt-2 text-xs text-ink-2">{TIERS[now].blurb}</p>
    </Fold>
  );
}

/** Arrange eight shelves so the busiest are nearest the door. */
export function LayoutCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const weights = layoutWeights(game);
  const [order, setOrder] = useState<number[]>(() => SHELVES.map((_, i) => i));
  const chk = layoutCheck(game, order);
  const last = game.play6?.layout;
  const move = (pos: number, d: number) => { const j = pos + d; if (j < 0 || j >= order.length) return; const o = [...order]; [o[pos], o[j]] = [o[j], o[pos]]; setOrder(o); };
  return (
    <Fold id="card-layout" title="Warehouse layout" summary={last ? `Last layout scored ${Math.round(last.score * 100)}.` : 'Put the busiest shelves nearest the door.'}
      subtitle={`Each shelf is picked a different number of times a month. Shelves nearer the door save walking, and a good layout lifts capacity up to 2% for a year. Moving the shelves costs ${small(layoutFee(game))}, once a year.`}>
      <ol className="space-y-1 text-sm" aria-label="Shelf order, door first">
        {order.map((item, pos) => (
          <li key={item} className="flex items-center gap-2">
            <span className="w-16 text-xs text-muted">{pos === 0 ? 'Door' : `Spot ${pos + 1}`}</span>
            <span className="min-w-0 flex-1"><b>{SHELVES[item]}</b> · picked {weights[item]}× a month</span>
            <Button className="!min-h-8 !px-2" aria-label={`Move ${SHELVES[item]} towards the door`} disabled={pos === 0} onClick={() => move(pos, -1)}>↑</Button>
            <Button className="!min-h-8 !px-2" aria-label={`Move ${SHELVES[item]} away from the door`} disabled={pos === order.length - 1} onClick={() => move(pos, 1)}>↓</Button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-ink-2">Walking cost of this order: {layoutCost(weights, order)}.</p>
      <Button className="mt-2" variant="primary" disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'layout', order }, 'Warehouse re-laid.')}>Lock in this layout ({small(chk.fee)})</Button>
      {!chk.ok && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

/** Undercut a hidden rival bid to win a big contract. */
export function TenderCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const bids = tenderBids(game);
  const [disc, setDisc] = useState<number[]>(TENDERS.map(() => 10));
  return (
    <Fold id="card-tender" title="Tenders" summary="Bid for big contracts against a hidden rival."
      subtitle={`Each tender asks for your lowest price. Offer a bigger discount to beat the rival's hidden bid, but a deeper discount squeezes your margin for the whole year. Preparing a bid costs ${small(tenderFee(game))} even if you lose.`}>
      <ul className="space-y-2">
        {TENDERS.map((t, i) => {
          const chk = tenderCheck(game, i, disc[i]);
          return (
            <li key={t.name} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{t.name}</b>: demand +{Math.round((t.demand - 1) * 100)}% for a year{typeof bids[i] === 'boolean' ? (bids[i] ? ' (won)' : ' (lost)') : ''}</span>
              <select aria-label={`Discount for ${t.name}`} value={disc[i]} onChange={(e) => setDisc(disc.map((d, j) => (j === i ? Number(e.target.value) : d)))} className="rounded-lg border border-line bg-page px-2 py-1">
                {BID_DISCOUNTS.map((d) => <option key={d} value={d}>{d}% off</option>)}
              </select>
              <Button disabled={!chk.ok || !live(game)} title={chk.reason} onClick={() => act({ type: 'tender', index: i, discount: disc[i] }, 'Bid submitted.')}>Bid</Button>
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** The yearly quality inspection and the next anniversary. */
export function InspectionCard({ game }: { game: GameState }) {
  const ins = game.play6?.inspection;
  return (
    <Fold id="card-inspection" title="Inspections and anniversaries" summary={ins ? `Last inspection: ${ins.score} out of 100.` : 'An inspector visits each autumn.'}
      subtitle="Each autumn an inspector scores your quality, reputation and morale. 70 or more lifts your reputation and brand; under 45 means quality, reputation and morale need work. Each anniversary gives a little morale.">
      <KeyValue rows={[
        ['Score if inspected now', `${inspectionScore(game)} / 100`],
        ['Last inspection', ins ? `${ins.score} in ${monthLabel(ins.month)}` : 'None yet'],
        ['Next anniversary', `in ${nextAnniversary(game)} months`],
      ]} />
    </Fold>
  );
}

/** An office mascot whose mood follows your results. */
export function MascotCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const m = mascotOf(game);
  const mood = mascotMood(game);
  return (
    <Fold id="card-mascot" title="Office mascot" summary={m ? `${m.label} the ${m.name.toLowerCase()} is ${mood.mood}.` : 'Adopt a mascot.'}
      subtitle="A cosmetic friend whose mood follows your morale, profit and reputation.">
      {m && <p className="mb-2 text-sm"><span className="text-3xl" aria-hidden>{m.emoji}</span> <b>{m.label}</b> {mood.text}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a mascot">
        {MASCOTS.map((x) => <Button key={x.id} variant={m?.id === x.id ? 'primary' : 'secondary'} aria-pressed={m?.id === x.id} disabled={!live(game)} onClick={() => act({ type: 'mascot', id: x.id }, `${x.name} adopted.`)}>{x.emoji} {x.name}</Button>)}
      </div>
    </Fold>
  );
}

/** A collection of the events this company has lived through. */
export function EventCardsCard({ game }: { game: GameState }) {
  const cards = eventCardsOf(game);
  return (
    <Fold id="card-evcards" title="Event cards" summary={`${cards.length} kinds of event survived.`}
      subtitle="Each kind of event you have lived through becomes a card. The number shows how many times it happened to this company.">
      {cards.length === 0 ? <p className="text-sm text-ink-2">No decisions yet. Cards appear as events happen.</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {cards.map((c) => <li key={c.title} className="rounded-xl border-2 border-outline p-2 text-sm"><b>{c.title}</b><span className="block text-xs text-ink-2">×{c.times} · first in {monthLabel(c.first)}</span></li>)}
        </ul>
      )}
    </Fold>
  );
}

/** The company's story, written for you and ready to copy. */
export function BookCard({ game }: { game: GameState }) {
  const toast = useGame((s) => s.toast);
  const text = founderBook(game);
  return (
    <Fold id="card-book" title="Founder's book" summary="Your story so far, ready to share."
      subtitle="A short written history built from your milestones and awards. Copy it or save it as a file.">
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-xs" aria-label="The book">{text}</pre>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button onClick={async () => { try { await navigator.clipboard.writeText(text); toast('success', 'Copied.'); } catch { toast('error', 'Copying is blocked here. Use Save instead.'); } }}>Copy</Button>
        <Button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = `${game.companyName}-book.txt`; a.click(); URL.revokeObjectURL(a.href); }}>Save as a file</Button>
      </div>
    </Fold>
  );
}
