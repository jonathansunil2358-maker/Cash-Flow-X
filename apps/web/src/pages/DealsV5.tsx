import {
  acquiredOf, BRAND_INFO, CHECKS, checkAdvice, checkFee, checked, closingCosts, DEFAULT_TERMS, divestCheck, fitOf, formatGBP, HOSTILE_PREMIUMS, hostileChance, hostileCheck,
  MAX_ROUNDS, mergerCheck, monthLabel, needsReview, PLAN_INFO, rivalPrice, RETENTION_PCT, STRUCTURES, synergyOf, talkOf, targetNetAssets,
  type AcquisitionTarget, type BrandPlan, type DealPlan, type GameState, type Structure, type Terms,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, KeyValue, MoneyInput, StatusPill } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (game: GameState): boolean => game.status === 'playing';
const small = (p: number): string => formatGBP(p, { compact: true });

/** One company for sale: look at it, check it, haggle, then close on terms you choose. */
function Listing({ game, t }: { game: GameState; t: AcquisitionTarget }) {
  const act = useGame((s) => s.act);
  const talk = talkOf(game, t.id);
  const syn = synergyOf(game, t);
  const fit = fitOf(game, t);
  const [offer, setOffer] = useState(Math.round((t.askingPrice * 0.92) / 1000) * 1000);
  const [terms, setTerms] = useState<Terms>(DEFAULT_TERMS);
  const set = (p: Partial<Terms>) => setTerms({ ...terms, ...p });
  const net = targetNetAssets(t);
  const price = talk?.price ?? t.askingPrice;
  const costs = closingCosts(game, t, price, terms);
  const ready = (talk?.status === 'agreed' && !talk.rival) ? true : false;
  const done = (kind: string) => checked(t, kind);
  const flags = CHECKS.filter((c) => done(c.id));
  return (
    <li className="rounded-2xl border-2 border-outline p-3 text-sm" data-testid="listing">
      <div className="flex flex-wrap items-center gap-2">
        <b className="min-w-0 flex-1">{t.name}</b>
        {talk?.status === 'agreed' && <StatusPill kind="good" label="Price agreed" />}
        {talk?.status === 'review' && <StatusPill kind="warn" label="Regulator reviewing" />}
        <span className="text-xs text-muted">Expires {monthLabel(t.expiresMonth - 1)}</span>
      </div>
      <KeyValue rows={[
        ['Asking price', formatGBP(t.askingPrice, { compact: true })],
        ['Revenue / EBITDA (reported)', `${small(t.annualRevenue)} / ${small(t.reportedEbitda)}`],
        ['EBITDA (after financial check)', t.diligenceDone ? small(t.trueEbitda) : 'Unknown'],
        ['Goodwill you would book', small(Math.max(0, price - net))],
        ['Savings forecast a month (low / likely / high)', `${small(syn.low)} / ${small(syn.mid)} / ${small(syn.high)}`],
        ['Culture fit', checked(t, 'people') ? fit : 'Check the people'],
      ]} />
      <div className="mt-2 flex flex-wrap gap-2">
        {!t.diligenceDone && <Button disabled={!live(game)} onClick={() => act({ type: 'diligence', targetId: t.id }, 'Financial check done.')}>Financial check ({small(t.diligenceFee)})</Button>}
        {CHECKS.filter((c) => !done(c.id)).map((c) => (
          <Button key={c.id} disabled={!live(game)} title={c.blurb} onClick={() => act({ type: 'check', targetId: t.id, kind: c.id }, `${c.name} check done.`)}>{c.name} check ({small(checkFee(t))})</Button>
        ))}
      </div>
      {flags.length > 0 && <ul className="mt-2 space-y-1 text-xs text-ink-2">{flags.map((c) => <li key={c.id}><b>{c.name}:</b> {checkAdvice(game, t, c.id)}</li>)}</ul>}

      {(!talk || talk.status === 'open') && (
        <div className="mt-3 space-y-2">
          {talk?.counter ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">They counter at <b>{formatGBP(talk.counter, { compact: true })}</b> (round {talk.rounds} of {MAX_ROUNDS}).</span>
              <Button variant="primary" disabled={!live(game)} onClick={() => act({ type: 'acceptCounter', targetId: t.id }, 'Price agreed.')}>Accept</Button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40"><MoneyInput value={offer} onChange={setOffer} step={1000} aria-label={`Your offer for ${t.name}`} /></div>
            <Button variant="primary" disabled={!live(game) || offer <= 0} onClick={() => act({ type: 'makeOffer', targetId: t.id, price: offer }, 'Offer made.')}>Make an offer</Button>
            <Button disabled={!live(game)} onClick={() => act({ type: 'makeOffer', targetId: t.id, price: t.askingPrice }, 'Price agreed.')}>Pay the asking price</Button>
          </div>
          <p className="text-xs text-muted">The seller has a secret lowest price. Too low and they walk away; close and they counter. You get {MAX_ROUNDS} rounds.</p>
        </div>
      )}

      {talk?.status === 'agreed' && talk.rival && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill kind="bad" label="Bidding war" />
          <span className="min-w-0 flex-1">A rival offers {small(talk.rival.bid)}. Answer by {monthLabel(talk.rival.until - 1)}.</span>
          <Button variant="primary" disabled={!live(game)} onClick={() => act({ type: 'raiseBid', targetId: t.id, price: talk.rival!.bid }, 'You matched the rival.')}>Match {small(talk.rival.bid)}</Button>
        </div>
      )}

      {ready && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-ink-2">Agreed price {formatGBP(price, { compact: true })}. Choose how to pay and how to join the businesses.{needsReview(game, t) && ' The competition regulator will review this deal first (about two months).'}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="How to pay">
            {(Object.keys(STRUCTURES) as Exclude<Structure, 'allshares'>[]).map((k) => (
              <Button key={k} variant={terms.structure === k ? 'primary' : 'secondary'} aria-pressed={terms.structure === k} title={STRUCTURES[k].blurb} onClick={() => set({ structure: k })}>{STRUCTURES[k].name}</Button>
            ))}
            <Button variant={terms.loan ? 'primary' : 'secondary'} aria-pressed={terms.loan} onClick={() => set({ loan: !terms.loan })} title="Borrow 60% of the cash part from the bank">Acquisition loan</Button>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Integration plan">
            {(Object.keys(PLAN_INFO) as DealPlan[]).map((k) => (
              <Button key={k} variant={terms.plan === k ? 'primary' : 'secondary'} aria-pressed={terms.plan === k} title={PLAN_INFO[k].blurb} onClick={() => set({ plan: k })}>{PLAN_INFO[k].name}</Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Brand">
            {(Object.keys(BRAND_INFO) as BrandPlan[]).map((k) => (
              <Button key={k} variant={terms.brand === k ? 'primary' : 'secondary'} aria-pressed={terms.brand === k} title={BRAND_INFO[k].blurb} onClick={() => set({ brand: k })}>{BRAND_INFO[k].name}</Button>
            ))}
            <Button variant={terms.retention ? 'primary' : 'secondary'} aria-pressed={terms.retention} onClick={() => set({ retention: !terms.retention })} title={`Pay ${RETENTION_PCT * 100}% of the price over 12 months to keep their best people`}>Retention bonuses</Button>
          </div>
          <p className="text-xs text-muted">{STRUCTURES[terms.structure as Exclude<Structure, 'allshares'>].blurb} {PLAN_INFO[terms.plan].blurb} {BRAND_INFO[terms.brand].blurb}</p>
          <p className="text-xs"><b>Cash needed now: {formatGBP(costs.cash, { compact: true })}</b>{costs.shares > 0 && ` · ${small(costs.shares)} in shares`}{costs.deferred > 0 && ` · ${small(costs.deferred)} later`}{costs.loan > 0 && ` · loan ${small(costs.loan)}`}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={!live(game)} onClick={() => act({ type: 'closeDeal', targetId: t.id, terms }, `You bought ${t.name}.`)}>Close the deal</Button>
            <Button variant="danger" disabled={!live(game)} onClick={() => act({ type: 'walkAway', targetId: t.id }, 'You walked away.')}>Walk away (2% fee)</Button>
          </div>
        </div>
      )}

      {talk?.status === 'review' && <p className="mt-2 text-xs text-ink-2">The regulator decides in {Math.max(0, (talk.reviewUntil ?? game.month) - game.month)} months. You can still walk away for the 2% fee.</p>}
      {talk?.status === 'review' && <Button className="mt-2" variant="danger" disabled={!live(game)} onClick={() => act({ type: 'walkAway', targetId: t.id }, 'You walked away.')}>Walk away (2% fee)</Button>}
      <div className="mt-3">
        <Button disabled={!live(game) || mergerCheck(game, t.id).ok === false} title="All-shares merger with a company at least 80% of your size" onClick={() => act({ type: 'mergerOfEquals', targetId: t.id }, 'Merged as equals.')}>Merger of equals</Button>
        {!mergerCheck(game, t.id).ok && <span className="ml-2 text-xs text-muted">{mergerCheck(game, t.id).reason}</span>}
      </div>
    </li>
  );
}

/** The deal room: every company for sale, with new listings through the year. */
export function DealRoom({ game, open }: { game: GameState; open?: boolean }) {
  const body = (
    <ul className="space-y-3">
      {game.targets.length === 0 && <li className="text-sm text-ink-2">Nothing is for sale right now. New listings appear through the year.</li>}
      {game.targets.map((t) => <Listing key={t.id} game={game} t={t} />)}
    </ul>
  );
  if (open) return body;
  return (
    <Fold id="card-dealroom" title="Deal room" summary={`${game.targets.length} companies for sale. Check them, haggle, then close.`}
      subtitle="Companies come up for sale all year. Run checks to find hidden problems, haggle over the price, then choose how to pay and how to bring the business in. Unlocks at M&A level.">
      {body}
    </Fold>
  );
}

/** A bid for a rival the board did not ask for. */
export function HostileCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const h = game.mna?.hostile;
  return (
    <Fold id="card-hostile" title="Hostile bid for a rival" summary={h ? `A bid for ${h.name} is out.` : 'Offer more than a rival is worth over its board.'}
      subtitle="You offer a premium over a rival's price. Its board answers in two months: it may accept, refuse, or find a friendlier buyer, which makes the rival stronger. Fees are lost whatever happens. A higher premium is more likely to succeed.">
      {h ? <p className="text-sm">Waiting for {h.name} to answer your {formatGBP(h.bid, { compact: true })} bid.</p> : (
        <ul className="space-y-2">
          {game.competitors.map((c, i) => (
            <li key={c.name} className="text-sm">
              <b>{c.name}</b> · base {small(rivalPrice(game, i))}
              <div className="mt-1 flex flex-wrap gap-2">
                {HOSTILE_PREMIUMS.map((p) => {
                  const chk = hostileCheck(game, i, p, rivalPrice(game, i));
                  return <Button key={p} disabled={!chk.ok || !live(game)} title={chk.reason} onClick={() => act({ type: 'hostileBid', index: i, premium: p }, `Bid made for ${c.name}.`)}>+{Math.round(p * 100)}% ({Math.round(hostileChance(game, c.name, p) * 100)}% chance)</Button>;
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Fold>
  );
}

/** Sell a business you bought, and keep a record of every deal. */
export function DealBookCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const mine = acquiredOf(game);
  const ended = (game.mna?.talks ?? []).filter((x) => x.status === 'dead').length;
  const sold = game.acquisitions.filter((a) => a.divested);
  const events: { m: number; text: string }[] = [];
  for (const a of game.acquisitions) {
    events.push({ m: a.month, text: `Bought ${a.name} for ${small(a.price)}${a.plan ? ` (${a.plan} plan)` : ''}` });
    if (a.divested) events.push({ m: a.divested.month, text: `Sold ${a.name} for ${small(a.divested.proceeds)}` });
  }
  events.sort((a, b) => b.m - a.m);
  return (
    <Fold id="card-dealbook" title="Your deals" summary={`${mine.length} businesses owned, ${sold.length} sold.`}
      subtitle="Businesses you bought can be sold on after six months; their people and customers leave with them. Below is a timeline of every deal.">
      {mine.length === 0 ? <p className="text-sm text-ink-2">You have not bought anything yet.</p> : (
        <ul className="space-y-2">
          {mine.map((a) => {
            const chk = divestCheck(game, a.name);
            return (
              <li key={a.name + a.month} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 flex-1"><b>{a.name}</b> · paid {small(a.price)} · savings so far {small(a.realised ?? 0)}</span>
                <Button variant="danger" disabled={!chk.ok || !live(game)} title={chk.reason} onClick={() => { if (window.confirm(`Sell ${a.name} for about ${formatGBP(chk.offer)}?`)) act({ type: 'divest', name: a.name }, `Sold ${a.name}.`); }}>Sell ({small(chk.offer)})</Button>
              </li>
            );
          })}
        </ul>
      )}
      {ended > 0 && <p className="mt-2 text-xs text-muted">{ended} sets of talks ended without a deal.</p>}
      {events.length > 0 && (
        <ol className="mt-3 space-y-1 border-t border-line pt-2 text-xs text-ink-2" aria-label="Deal history">
          {events.map((e, i) => <li key={i}><b>{monthLabel(e.m)}</b> · {e.text}</li>)}
        </ol>
      )}
    </Fold>
  );
}
