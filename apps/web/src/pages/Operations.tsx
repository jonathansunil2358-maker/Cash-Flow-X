import {
  attractiveness, capacityMultiplier, capacityOf, demandFor, formatGBP, formatInt, formatPct, INDUSTRIES, reachOf,
  recruitmentFee, ROLE_IDS, supplierCostMultiplier, termsDemandMultiplier, upgradeOptions, type GameState, type RoleId,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, Card, Field, Info, KeyValue, MoneyInput, NumberInput, PageTitle } from '../components/ui';
import { suggestedMarketing } from '../lib/coach';
import { useDerived } from '../lib/derived';
import { useGame } from '../store';

export function Operations({ game }: { game: GameState }) {
  const d = useDerived(game);
  const ind = d.ind;
  const demand = demandFor(game, ind);
  const capacity = capacityOf(game, ind);
  return (
    <div>
      <PageTitle title="Run the business" subtitle="Hiring, pricing, marketing, stock and credit terms. One-off costs (recruitment, equipment, redundancy) post straight away; see Books › Ledger." />
      <nav className="sticky top-[52px] z-[5] -mx-1 mb-3 flex gap-1.5 overflow-x-auto bg-surface px-1 py-1.5" aria-label="Jump to">
        {[['card-team', 'Staff'], ['card-pricing', 'Pricing'], ['card-marketing', 'Marketing'], ...(ind.model === 'unit' ? [['card-inventory', 'Stock']] : []), ['card-credit', 'Credit']].map(([id, label]) => (
          <button key={id} type="button" className="cfx-btn is-soft is-sm shrink-0 !min-h-8 !px-3 !text-sm"
            onClick={() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>{label}</button>
        ))}
      </nav>
      <div className="grid gap-5">
        <Card id="card-team" title="Team" subtitle={`Salaries shown include wage inflation (index ${game.salaryIndex.toFixed(3)}). Employer NI & pension add 15%.`}>
          <div className="space-y-4">
            {ROLE_IDS.map((r) => <RoleRow key={r} game={game} role={r} />)}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card title="Capacity" subtitle="Operations staff (plus you, the founder) set how many customers you can serve.">
            <KeyValue rows={[
              [ind.model === 'subscription' ? `${ind.unitPlural} you can serve` : `${ind.unitPlural} you can deliver / month`, formatInt(capacity)],
              ['Current load', d.last ? formatPct(d.last.kpis.utilisation, 0) : '—'],
              ['Automation uplift', `+${formatPct(capacityMultiplier(game, ind) - 1, 0)}`],
            ]} />
          </Card>
          <PriceCard game={game} />
          <MarketingCard game={game} reach={demand.reach} />
        </div>

        {ind.model === 'unit' && <StockCard game={game} />}
        <TermsCard game={game} />
      </div>
    </div>
  );
}

/** Sector upgrades and automation capex (the Upgrades dock panel). */
export function UpgradesPanel({ game }: { game: GameState }) {
  return (
    <div>
      <PageTitle title="Upgrades" subtitle="Build out your business. Every upgrade is capex: it hits cash now and the P&L gradually through depreciation." />
      <div className="grid gap-5">
        <UpgradesCard game={game} />
        <AutomationCard game={game} />
      </div>
    </div>
  );
}

function RoleRow({ game, role }: { game: GameState; role: RoleId }) {
  const d = useDerived(game);
  const act = useGame((s) => s.act);
  const [count, setCount] = useState(1);
  const def = d.ind.roles[role];
  const salary = Math.round(def.salary * game.salaryIndex);
  const oneOff = recruitmentFee(game, role) * count + d.ind.equipmentPerHire * count;
  const monthly = Math.round((salary * 1.15 * count) / 12);
  const playing = game.status === 'playing';
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-ink">{def.title}</div>
          <div className="text-xs text-ink-2">{formatGBP(salary)}/yr · {def.effect}</div>
        </div>
        <div className="text-right">
          <div className="tnum text-2xl font-semibold">{game.staff[role]}</div>
          <div className="text-[11px] text-muted">employed</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="w-20"><NumberInput aria-label={`Number of ${def.title}`} min={1} max={50} value={count} onChange={(n) => setCount(Math.max(1, Math.min(50, Math.round(n) || 1)))} /></div>
        <Button variant="primary" disabled={!playing} onClick={() => act({ type: 'hire', role, count }, `Hired ${count} × ${def.title}.`)}>Hire</Button>
        <Button variant="danger" disabled={!playing || game.staff[role] < count} onClick={() => act({ type: 'fire', role, count }, `${count} × ${def.title} made redundant.`)}>Let go</Button>
        <span className="text-xs text-muted">Hiring: {formatGBP(oneOff)} now, then {formatGBP(monthly)}/month. Redundancy: 1 month's salary each.</span>
      </div>
    </div>
  );
}

function PriceCard({ game }: { game: GameState }) {
  const d = useDerived(game);
  const act = useGame((s) => s.act);
  const ind = d.ind;
  const [price, setPrice] = useState(game.price / 100);
  const pence = Math.round(price * 100);
  const comp = game.competitors.reduce((a, c) => a + attractiveness(c.quality, c.price, ind.basePrice, ind.priceElasticity, c.strength), 0);
  const shareAt = (p: number) => { const a = attractiveness(game.quality, p, ind.basePrice, ind.priceElasticity); return a / (a + comp); };
  const shareNow = shareAt(game.price);
  const shareNew = shareAt(pence);
  const unitMargin = ind.model === 'unit' ? pence - ind.unitCost : pence - ind.unitCost;
  return (
    <Card id="card-pricing" title="Pricing" subtitle={`Reference price ${formatGBP(ind.basePrice, { pence: true })} per ${ind.unitSingular}${ind.model === 'subscription' ? ' per month' : ''}. Demand elasticity ${ind.priceElasticity}: a 10% price rise cuts preference by roughly ${formatPct(1 - Math.pow(1 / 1.1, ind.priceElasticity), 0)}.`}>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Your price (£)">
          <input type="number" step="0.5" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-32 rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm tnum" />
        </Field>
        <Button variant="primary" disabled={game.status !== 'playing' || pence === game.price} onClick={() => act({ type: 'setPrice', price: pence }, `Price set to ${formatGBP(pence, { pence: true })}.`)}>Set price</Button>
      </div>
      <div className="mt-3">
        <KeyValue rows={[
          ['Preference share now → at new price', `${formatPct(shareNow)} → ${formatPct(shareNew)}`],
          [<span className="inline-flex items-center gap-1">Margin per {ind.unitSingular} before staff <Info text={ind.model === 'subscription' ? 'Monthly price less the monthly cost of serving one customer (hosting, utilities).' : 'Price less the purchase cost of one unit.'} /></span>, formatGBP(unitMargin, { pence: true })],
          ['Competitor prices', game.competitors.map((c) => `${c.name} ${formatGBP(c.price, { pence: true })}`).join(' · ')],
        ]} />
      </div>
    </Card>
  );
}

function MarketingCard({ game, reach }: { game: GameState; reach: number }) {
  const d = useDerived(game);
  const act = useGame((s) => s.act);
  const [amount, setAmount] = useState(game.marketingBudget);
  const steadyBrand = amount / d.ind.marketingPerBrandPoint / 0.1;
  const steadyReach = reachOf({ ...game, brand: steadyBrand }, d.ind);
  const suggested = suggestedMarketing(game);
  return (
    <Card id="card-marketing" title="Marketing" subtitle="Spend builds brand, which decays 10% a month. Brand and sales staff drive reach: the share of the market that knows you exist.">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Monthly budget"><MoneyInput value={amount} onChange={setAmount} step={500} /></Field>
        <Button variant="primary" disabled={game.status !== 'playing' || amount === game.marketingBudget} onClick={() => act({ type: 'setMarketing', amount }, `Marketing set to ${formatGBP(amount)}/month.`)}>Set budget</Button>
      </div>
      {suggested !== amount && (
        <p className="mt-2 text-xs text-ink-2">
          Suggested for your size: about {formatGBP(suggested)}/month (8% of revenue).{' '}
          <button type="button" className="font-extrabold text-ink underline" onClick={() => setAmount(suggested)}>Use it</button>
        </p>
      )}
      <div className="mt-3">
        <KeyValue rows={[
          ['Brand points', game.brand.toFixed(0)],
          ['Reach now', formatPct(reach, 0)],
          ['Reach if sustained at this budget', formatPct(steadyReach, 0)],
          ['Paid on supplier terms', `${game.supplierDays} days`],
        ]} />
      </div>
    </Card>
  );
}

function StockCard({ game }: { game: GameState }) {
  const d = useDerived(game);
  const act = useGame((s) => s.act);
  const [cover, setCover] = useState(game.stockCoverMonths);
  const avgCost = game.inventoryUnits ? game.ledger.balances.inventory / game.inventoryUnits : d.ind.unitCost;
  return (
    <Card id="card-inventory" title="Inventory policy" subtitle={`Each month you buy enough stock to meet expected sales plus a buffer. More cover means fewer stock-outs but more cash tied up and more write-offs (${formatPct(d.ind.spoilage)} of stock per month).`}>
      <Field label={`Stock cover: ${cover.toFixed(2)} months of sales`}>
        <input type="range" min={0} max={6} step={0.25} value={cover} onChange={(e) => setCover(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
      </Field>
      <div className="mt-2 flex gap-2">
        <Button variant="primary" disabled={game.status !== 'playing' || cover === game.stockCoverMonths} onClick={() => act({ type: 'setStockCover', months: cover }, 'Stock policy updated.')}>Apply</Button>
      </div>
      <div className="mt-3">
        <KeyValue rows={[
          ['Units in stock', formatInt(game.inventoryUnits)],
          ['Inventory value (weighted average cost)', formatGBP(game.ledger.balances.inventory)],
          ['Average cost per unit', formatGBP(Math.round(avgCost), { pence: true })],
          ['Current unit cost incl. supply conditions', formatGBP(Math.round(d.ind.unitCost * game.economy.unitCostMult * supplierCostMultiplier(game, d.ind)), { pence: true })],
        ]} />
      </div>
    </Card>
  );
}

function TermsCard({ game }: { game: GameState }) {
  const d = useDerived(game);
  const act = useGame((s) => s.act);
  const [cust, setCust] = useState(game.customerDays);
  const [supp, setSupp] = useState(game.supplierDays);
  const cash = d.ind.receivableDays === 0;
  const preview = { ...game, customerDays: cust, supplierDays: supp };
  return (
    <Card id="card-credit" title="Credit terms (working capital)" subtitle={`The fastest lever on cash. Industry norms: customers pay ${cash ? 'at the point of sale' : `in ${d.ind.receivableDays} days`}; suppliers expect payment in ${d.ind.payableDays} days.`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Customer terms: ${cust} days`} hint={cash ? 'Not applicable in this industry.' : `Demand ×${termsDemandMultiplier(preview, d.ind).toFixed(3)}. Longer terms win B2B customers but tie up cash and raise bad debts.`}>
          <input type="range" min={0} max={120} step={5} value={cust} disabled={cash} onChange={(e) => setCust(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
        </Field>
        <Field label={`Supplier terms: ${supp} days`} hint={`Purchase cost ×${supplierCostMultiplier(preview, d.ind).toFixed(3)}. Longer terms fund you but suppliers charge for it; paying early earns a discount.`}>
          <input type="range" min={0} max={120} step={5} value={supp} onChange={(e) => setSupp(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
        </Field>
      </div>
      <Button className="mt-3" variant="primary" disabled={game.status !== 'playing' || (cust === game.customerDays && supp === game.supplierDays)}
        onClick={() => act({ type: 'setCreditTerms', customerDays: cust, supplierDays: supp }, 'Credit terms updated for new invoices.')}>Apply terms</Button>
    </Card>
  );
}

function UpgradesCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const options = upgradeOptions(game);
  return (
    <Card title={`${INDUSTRIES[game.industryId].name} upgrades`} subtitle="Each level is capex: capitalised as PP&E and depreciated over 5 years. Prestige resets them.">
      <div className="space-y-2">
        {options.map((o) => (
          <div key={o.def.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
            <div className="min-w-0">
              <div className="font-medium">{o.def.name} <span className="text-xs font-normal text-ink-2">Lv {o.level}/{o.def.maxLevel}</span></div>
              <div className="text-xs text-ink-2">{o.def.description}{o.locked ? ` · ${o.locked}` : ''}</div>
              <div className="mt-1 flex gap-1" aria-label={`Level ${o.level} of ${o.def.maxLevel}`}>
                {Array.from({ length: o.def.maxLevel }, (_, i) => (
                  <span key={i} className={`h-2 w-5 rounded-sm ${i < o.level ? 'bg-accent' : 'bg-surface-2'}`} />
                ))}
              </div>
            </div>
            <Button variant="primary" disabled={game.status !== 'playing' || o.maxed || !!o.locked}
              onClick={() => act({ type: 'buyUpgrade', upgradeId: o.def.id }, `${o.def.name} upgraded to level ${o.level + 1}.`)}>
              {o.maxed ? 'Maxed' : `Upgrade ${formatGBP(o.cost, { compact: true })}`}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AutomationCard({ game }: { game: GameState }) {
  const d = useDerived(game);
  const act = useGame((s) => s.act);
  const [amount, setAmount] = useState(25_000_00);
  const after = capacityMultiplier({ ...game, automationSpend: game.automationSpend + amount }, d.ind);
  return (
    <Card title="Automation & systems (capex)" subtitle="Capitalised as PP&E and depreciated over 5 years: it hits cash now but the P&L gradually. Raises output per operations employee, up to +50%.">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Investment"><MoneyInput value={amount} onChange={setAmount} step={5000} /></Field>
        <Button variant="primary" disabled={game.status !== 'playing'} onClick={() => act({ type: 'buyAutomation', amount }, `Invested ${formatGBP(amount)} in automation.`)}>Invest</Button>
      </div>
      <p className="mt-3 text-sm text-ink-2">Capacity uplift: +{formatPct(capacityMultiplier(game, d.ind) - 1, 0)} now → +{formatPct(after - 1, 0)} after. Monthly depreciation +{formatGBP(Math.round(amount / 60))}.</p>
    </Card>
  );
}
