import {
  acceptCheck, capacityOf, COVER, extraSites, floatCheck, formatGBP, formatPct, INDUSTRIES, INSURANCE_TIERS, LIST_DISCOUNT, LIST_FEE, LIST_SELL_FRACTION,
  LISTED_MONTHLY_COST, listCheck, marketCap, MAX_CONTRACTS, MAX_SITES, openSiteCheck, ownership, premiumFor, publicFloat, SITE_BREAK_MONTHS, SITE_CAPACITY,
  SITE_DEMAND, SITE_DRAG, sharePrice, siteRent, type GameState, type InsuranceTier,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, Field, KeyValue, MoneyInput, StatusPill } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';
import {
  complianceCost, complianceRate, CULTURES, cultureOf, OPTIONAL_MODIFIERS, rankCostMult, rivalPressure, saturationFactor, wageInflation, RENT_INFLATION, trailingPL, annualise, modifierBonus,
} from '@cfx/engine';

export function SitesCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const playing = game.status === 'playing';
  const check = openSiteCheck(game);
  const ind = INDUSTRIES[game.industryId];
  const extra = extraSites(game);
  const building = game.pendingSites.length;
  const summary = `${game.sites} site${game.sites === 1 ? '' : 's'}${building ? `, ${building} being built` : ''}. Open to add a location.`;
  return (
    <Fold id="card-sites" title="Locations" summary={summary}
      subtitle="A second location adds capacity and reach, but costs a fit-out, rent from day one, and some of your attention.">
      <div className="space-y-4">
        <KeyValue rows={[
          ['Open now', `${game.sites} of ${MAX_SITES}${building ? ` (+${building} opening)` : ''}`],
          ['Capacity', `${Math.round(capacityOf(game, ind))} a month`],
          ['Each extra site adds', `+${Math.round(SITE_CAPACITY * 100)}% capacity, +${Math.round(SITE_DEMAND * 100)}% reach, −${Math.round(SITE_DRAG * 100)}% productivity`],
          ['Fit-out (capitalised)', formatGBP(check.cost)],
          ['Rent for each extra site', `${formatGBP(siteRent(game, ind))} a month`],
        ]} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={!playing || !check.allowed} onClick={() => act({ type: 'openSite' }, 'Fit-out started. It opens in 2 months.')}>Open a new site</Button>
          {(extra > 0 || building > 0) && (
            <Button variant="danger" disabled={!playing} onClick={() => act({ type: 'closeSite' }, building ? 'Fit-out cancelled.' : 'Site closed.')}>
              {building ? 'Cancel the fit-out' : `Close a site (${SITE_BREAK_MONTHS} months of rent)`}
            </Button>
          )}
          {!check.allowed && <span className="text-xs text-muted">{check.reason}</span>}
        </div>
      </div>
    </Fold>
  );
}

export function InsuranceCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const playing = game.status === 'playing';
  return (
    <Fold id="card-insurance" title="Insurance"
      summary={`${COVER[game.insurance].name}${game.insurance === 'none' ? '' : `, ${formatGBP(premiumFor(game))} a month`}. Open to change cover.`}
      subtitle="Theft, breakdowns, inspections, fires and cyber attacks all cost real money. Cover pays most of it back, for a monthly premium.">
      <div className="space-y-3">
        <div className="grid gap-2" role="group" aria-label="Cover level">
          {INSURANCE_TIERS.map((t: InsuranceTier) => (
            <Button key={t} variant={game.insurance === t ? 'primary' : 'secondary'} aria-pressed={game.insurance === t} disabled={!playing || game.insurance === t}
              onClick={() => act({ type: 'setInsurance', tier: t }, `Cover: ${COVER[t].name.toLowerCase()}.`)}>
              <span className="block text-left leading-tight">
                {COVER[t].name}{t !== 'none' && <> · {formatGBP(premiumFor(game, t))} a month</>}<br />
                <span className="text-[11px] font-bold opacity-80">{COVER[t].blurb}</span>
              </span>
            </Button>
          ))}
        </div>
        {game.insurance !== 'none' && <p className="text-xs text-ink-2">Each claim has an excess of {formatGBP(COVER[game.insurance].excess)}.</p>}
      </div>
    </Fold>
  );
}

export function ContractsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const playing = game.status === 'playing';
  const offers = game.contractOffers.filter((o) => o.expiresMonth >= game.month);
  const unit = INDUSTRIES[game.industryId].model === 'subscription' ? 'seats' : INDUSTRIES[game.industryId].unitPlural;
  return (
    <Fold id="card-contracts" title="Big contracts"
      summary={`${game.contracts.length} signed · ${offers.length} offer${offers.length === 1 ? '' : 's'} waiting. Open for details.`}
      subtitle="A client wants a fixed volume at a fixed price for months. Guaranteed sales, but your capacity is committed to them first and every unit you cannot deliver costs a penalty.">
      <div className="space-y-4">
        {game.contracts.length > 0 && (
          <ul className="space-y-2">
            {game.contracts.map((c) => (
              <li key={c.id} className="rounded-lg border border-line p-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">{c.client}</span>
                  <StatusPill kind="ok" label={`${c.monthsLeft} of ${c.months} months left`} />
                </div>
                <div className="text-xs text-ink-2">{c.units} {unit} a month at {formatGBP(c.price, { pence: true })} · paid in {c.paymentDays} days · {c.penaltyPct}% penalty on shortfalls</div>
              </li>
            ))}
          </ul>
        )}
        {offers.length === 0 && <p className="text-sm text-ink-2">No offers right now. Clients get in touch about once a quarter once you have a track record (from month 9).</p>}
        <ul className="space-y-2">
          {offers.map((o) => {
            const check = acceptCheck(game, o.id);
            const cap = capacityOf(game, INDUSTRIES[game.industryId]);
            return (
              <li key={o.id} className="rounded-lg border border-line p-3">
                <div className="font-medium text-ink">{o.client}</div>
                <div className="text-xs text-ink-2">
                  {o.units} {unit} a month at {formatGBP(o.price, { pence: true })} ({formatPct(1 - o.price / Math.max(1, game.price), 0)} below your price) for {o.months} months,
                  paid in {o.paymentDays} days. {formatGBP(o.units * o.price)} a month. {o.penaltyPct}% penalty on shortfalls. Expires in {Math.max(0, o.expiresMonth - game.month)} month(s).
                </div>
                {o.units > cap * 0.6 && <div className="mt-1 text-xs font-bold text-critical-text">Careful: this is a big share of your capacity ({Math.round(cap)} a month).</div>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button variant="primary" disabled={!playing || !check.allowed} onClick={() => act({ type: 'acceptContract', offerId: o.id }, `Contract signed with ${o.client}.`)}>Sign</Button>
                  <Button variant="secondary" disabled={!playing} onClick={() => act({ type: 'declineContract', offerId: o.id }, 'Offer declined.')}>Decline</Button>
                  {!check.allowed && <span className="text-xs text-muted">{check.reason}</span>}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted">You can hold up to {MAX_CONTRACTS} contracts at once.</p>
      </div>
    </Fold>
  );
}

export function ListingCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const [amount, setAmount] = useState(0);
  const playing = game.status === 'playing';
  const check = listCheck(game);
  const price = sharePrice(game);
  const hist = game.priceHistory;
  const hi = Math.max(1, ...hist), lo = Math.min(...(hist.length ? hist : [0]));
  const bb = floatCheck(game, Math.max(1, amount));
  return (
    <Fold id="card-listing" title="Stock market"
      summary={game.listed ? `Listed. Share price ${formatGBP(price, { pence: true })}. Open for details.` : `Not listed. ${check.allowed ? 'You can float now.' : 'Open to see what it takes.'}`}
      subtitle="Float the company to raise a lot of cash from the public. You are diluted, a share price follows the business and the market's mood, and every quarter it expects a profit.">
      {!game.listed ? (
        <div className="space-y-3">
          <KeyValue rows={[
            ['You sell', `${Math.round(LIST_SELL_FRACTION * 100)}% of the company, at a ${Math.round((1 - LIST_DISCOUNT) * 100)}% discount`],
            [`Cash raised (after ${Math.round(LIST_FEE * 100)}% costs)`, formatGBP(check.proceeds)],
            ['Your ownership', `${formatPct(ownership(game), 1)} → ${formatPct((game.shares.owner) / (game.shares.total + check.shares), 1)}`],
            ['Running costs once listed', `${formatGBP(LISTED_MONTHLY_COST)} a month, and +3% demand from being a household name`],
          ]} />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={!playing || !check.allowed} onClick={() => act({ type: 'listCompany' }, 'You are listed on the stock market!')}>List the company</Button>
            {!check.allowed && <span className="text-xs text-muted">{check.reason}</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <KeyValue rows={[
            ['Share price', formatGBP(price, { pence: true })],
            ['Market value', formatGBP(marketCap(game))],
            ['Market mood', `${game.sentiment >= 1.05 ? 'Bullish' : game.sentiment <= 0.92 ? 'Gloomy' : 'Calm'} (${game.sentiment.toFixed(2)}×)`],
            ['Your ownership', formatPct(ownership(game), 1)],
            ['Held by the public', `${publicFloat(game).toLocaleString('en-GB')} shares`],
            ['Market expects next quarter', game.guidance ? `${formatGBP(game.guidance.target)} profit, by month ${game.guidance.month + 1}` : 'n/a'],
          ]} />
          {hist.length > 1 && (
            <svg viewBox="0 0 100 30" className="h-16 w-full" role="img" aria-label="Share price over the last months">
              <polyline fill="none" stroke="var(--go)" strokeWidth="1.5" points={hist.map((p, i) => `${(i / (hist.length - 1)) * 100},${28 - ((p - lo) / Math.max(1, hi - lo)) * 26}`).join(' ')} />
            </svg>
          )}
          <Field label="Buy back shares (£)" hint="Cheap when the mood is gloomy. Needs cash and distributable profit; at most 5% at a time.">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-40"><MoneyInput value={amount} step={1000} onChange={setAmount} aria-label="Buy-back amount" /></div>
              <Button variant="primary" disabled={!playing || amount <= 0 || !bb.ok} onClick={() => act({ type: 'buyBack', amount }, 'Shares bought back.')}>Buy back</Button>
              {amount > 0 && !bb.ok && <span className="text-xs text-muted">{bb.reason}</span>}
            </div>
          </Field>
        </div>
      )}
    </Fold>
  );
}

/** The slow squeeze in one place: what is pushing back on the company, and how hard. */
export function PressuresCard({ game }: { game: GameState }) {
  const sat = saturationFactor(game);
  const t = trailingPL(game, 12);
  const annual = annualise(t.summary.revenue, t.months);
  const compliance = complianceCost(game);
  const rank = game.prestigeLevel ?? 0;
  const cultureId = cultureOf(game.modifiers);
  const mods = OPTIONAL_MODIFIERS.filter((m) => (game.modifiers ?? []).includes(m.id));
  const share = game.history.at(-1)?.kpis.preferenceShare ?? 0;
  const parts: string[] = [];
  if (sat < 0.99) parts.push(`saturation −${Math.round((1 - sat) * 100)}%`);
  if (compliance > 0) parts.push(`compliance ${formatGBP(compliance, { compact: true })}/mo`);
  if (rank > 0) parts.push(`rank ${rank} costs`);
  return (
    <Fold id="card-pressures" title="Pressures"
      summary={parts.length ? `${parts.join(' · ')}. Open for details.` : 'Nothing squeezing you yet. Open to see what is coming.'}
      subtitle="The bigger and more successful you get, the harder the world pushes back: crowded markets, rising wages and rents, compliance, and the cost of your own prestige rank.">
      <div className="space-y-3">
        <KeyValue rows={[
          ['Market saturation', sat >= 0.99 ? `None yet (you hold ${formatPct(share, 0)} of preference; it starts above 35%)` : `Demand −${Math.round((1 - sat) * 100)}% (you hold ${formatPct(share, 0)} of preference)`],
          ['Wages each new year', `+${Math.round(wageInflation(game) * 100)}%`],
          ['Rent each new year', `+${Math.round(RENT_INFLATION * 100)}%`],
          ['Compliance, audit and legal', annual > 0 ? `${formatPct(complianceRate(annual), 1)} of revenue (${formatGBP(compliance, { compact: true })} a month); free below £2m a year` : 'Free below £2m a year'],
          ...(cultureId ? [['Company culture', `${CULTURES.find((c) => c.id === cultureId)!.name}: ${CULTURES.find((c) => c.id === cultureId)!.blurb}`] as [string, string]] : []),
          ['Prestige rank', rank > 0 ? `Supplier costs +${Math.round((rankCostMult(game) - 1) * 100)}%, rivals ${Math.round((rivalPressure(game) - 1) * 100)}% sharper` : 'No rank yet'],
        ]} />
        {mods.length > 0 && (
          <div className="rounded-lg border border-line p-2.5 text-sm">
            <div className="font-bold">Extra challenges (+{Math.round((modifierBonus(game.modifiers) - 1) * 100)}% score and Legacy)</div>
            <ul className="list-disc pl-5 text-xs text-ink-2">{mods.map((m) => <li key={m.id}>{m.name}: {m.blurb}</li>)}</ul>
          </div>
        )}
      </div>
    </Fold>
  );
}
