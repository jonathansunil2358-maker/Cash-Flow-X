import { AcquireCard, CrowdCard, HedgeCard, PatentCard, SaleCard, VcCard } from './DealsV4';
import { DealBookCard, DealRoom, HostileCard } from './DealsV5';
import { PolicyGroupCard } from './Policies';
import { VentureCard } from './Progress';
import {
  COVENANT_MAX_DEBT_EBITDA, COVENANT_MIN_INTEREST_COVER, covenantTest, distributableReserves, EQUITY_FEE, equityRaiseTerms,
  formatGBP, formatPct, leasesCurrentPortion, loanOffer, loanRate, monthLabel, overdraftLimit, ownership, scheduledRepayment, spreadFor, type GameState,
} from '@cfx/engine';
import { useState } from 'react';
import { Fold } from './Strategy';
import { Grouped } from '../components/Grouped';
import { Button, Card, Field, KeyValue, MoneyInput, NumberInput, PageTitle, StatusPill } from '../components/ui';
import { useGame } from '../store';

export function Finance({ game }: { game: GameState }) {
  return (
    <div>
      <PageTitle title="Finance" subtitle="How the business is funded: debt, equity, retained profit. Each choice has a cost: interest and covenants, dilution, or growth you did not fund." />
      <Grouped id="finance" gridClass="grid gap-5 lg:grid-cols-2" groups={[
        {
          id: 'borrow', label: 'Borrow', blurb: 'Loans, your overdraft and the covenants banks hold you to.',
          items: <><LoanCard game={game} /><div className="space-y-5"><CovenantCard game={game} /><OverdraftCard game={game} /></div>{game.leases.length > 0 && <LeasesCard game={game} />}</>,
        },
        {
          id: 'equity', label: 'Equity', blurb: 'Raising money from investors, paying yourself, and funds.',
          items: <><EquityCard game={game} /><VcCard game={game} /><CrowdCard game={game} /><DividendCard game={game} /></>,
        },
        {
          id: 'invest', label: 'Invest', blurb: 'Put spare cash to work, and protect it.',
          items: <><PolicyGroupCard game={game} group="finance" /><TreasuryCard game={game} /><VentureCard game={game} /><HedgeCard game={game} /><PatentCard game={game} /></>,
        },
        {
          id: 'deals', label: 'Deals', blurb: 'Buy a rival or sell the company.',
          items: <><DealRoom game={game} /><AcquireCard game={game} /><HostileCard game={game} /><DealBookCard game={game} /><SaleCard game={game} /></>,
        },
        {
          id: 'tax', label: 'Tax', blurb: 'What you owe the taxman.',
          items: <TaxCard game={game} />,
        },
      ]} />
    </div>
  );
}

function LoanCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const offer = loanOffer(game);
  const [amount, setAmount] = useState(Math.min(offer.maxAmount, 50_000_00));
  const [term, setTerm] = useState(36);
  const spread = spreadFor(game, amount);
  const rate = game.economy.baseRate + spread;
  const monthly = Math.round(amount / Math.max(1, term) + (amount * rate) / 12);
  return (
    <Card title="Bank loans" subtitle="Amortising term loans at base rate + a credit spread priced on your leverage. 1% arrangement fee.">
      <KeyValue rows={[
        ['Bank will lend up to', <span key="o">{formatGBP(offer.maxAmount)} <span className="text-xs font-normal text-muted">({offer.basis})</span></span>],
        ['Base rate', formatPct(game.economy.baseRate, 2)],
        ['Rate for this loan', `${formatPct(rate, 2)} (spread ${formatPct(spread, 2)})`],
        ['First monthly payment (approx.)', formatGBP(monthly)],
      ]} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Amount"><MoneyInput value={amount} onChange={setAmount} step={5000} /></Field>
        <Field label="Term (months)"><div className="w-24"><NumberInput min={12} max={84} value={term} onChange={(n) => setTerm(Math.round(n))} /></div></Field>
        <Button variant="primary" disabled={game.status !== 'playing' || offer.maxAmount < 5_000_00} onClick={() => act({ type: 'takeLoan', amount, termMonths: term }, `Borrowed ${formatGBP(amount)}.`)}>Borrow</Button>
      </div>
      <div className="mt-4 space-y-2">
        {game.loans.length === 0 && <p className="text-sm text-ink-2">No loans outstanding.</p>}
        {game.loans.map((l) => <LoanRow key={l.id} game={game} loanId={l.id} />)}
      </div>
    </Card>
  );
}

function LoanRow({ game, loanId }: { game: GameState; loanId: string }) {
  const act = useGame((s) => s.act);
  const l = game.loans.find((x) => x.id === loanId)!;
  const [repay, setRepay] = useState(l.principal);
  return (
    <div className="rounded-lg border border-line p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{l.label}</span>
        {l.consecutiveBreaches > 0 ? <StatusPill kind="bad" label="Covenant breach" /> : <StatusPill kind="good" label="Compliant" />}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-ink-2 sm:grid-cols-4">
        <span>Outstanding <strong className="tnum text-ink">{formatGBP(l.principal)}</strong></span>
        <span>Rate <strong className="tnum text-ink">{formatPct(loanRate(l, game.economy), 2)}</strong></span>
        <span>Repayment <strong className="tnum text-ink">{formatGBP(scheduledRepayment(l))}</strong>/mo</span>
        <span>{l.monthsRemaining} months left</span>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="w-36"><MoneyInput aria-label="Repayment amount" value={repay} onChange={setRepay} step={1000} /></div>
        <Button disabled={game.status !== 'playing'} onClick={() => act({ type: 'repayLoan', loanId: l.id, amount: Math.min(repay, l.principal) }, 'Early repayment made.')}>Repay early</Button>
      </div>
    </div>
  );
}

function CovenantCard({ game }: { game: GameState }) {
  const t = covenantTest(game);
  const hasLoans = game.loans.length > 0;
  return (
    <Fold id="card-covenants" title="Loan covenants" summary="Tested every quarter. Open to see your headroom." subtitle={`Tested quarterly on trailing-12-month figures, from 6 months after drawdown. One breach: 1% fee and +3% penalty rate. Two in a row: the loan is recalled.`}>
      <KeyValue rows={[
        [`Debt / EBITDA (max ${COVENANT_MAX_DEBT_EBITDA}x)`, t.debtToEbitda === null ? (t.debt > 0 ? 'EBITDA ≤ 0: breach' : 'no debt') : `${t.debtToEbitda.toFixed(2)}x`],
        [`Interest cover (min ${COVENANT_MIN_INTEREST_COVER}x)`, t.interestCover === null ? 'n/a' : `${t.interestCover.toFixed(1)}x`],
        ['Trailing EBITDA', formatGBP(t.ttmEbitda)],
      ]} />
      <div className="mt-3">
        {!hasLoans ? <StatusPill kind="na" label="No covenants apply" /> : t.breach ? <StatusPill kind="bad" label="Would breach if tested today" /> : <StatusPill kind="good" label="Within covenants" />}
      </div>
    </Fold>
  );
}

function OverdraftCard({ game }: { game: GameState }) {
  const limit = overdraftLimit(game);
  const used = Math.max(0, -game.ledger.balances.cash);
  return (
    <Fold id="card-overdraft" title="Overdraft facility" summary="Open to see your limit and what you owe." subtitle="Asset-based: 50% of receivables + 25% of inventory + £10k, cut in a credit crunch. Interest at base + 5%. Going beyond it means insolvency.">
      <KeyValue rows={[['Facility limit', formatGBP(limit)], ['Drawn', formatGBP(used)], ['Headroom', formatGBP(limit - used)]]} />
    </Fold>
  );
}

function EquityCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const terms = equityRaiseTerms(game);
  const [amount, setAmount] = useState(100_000_00);
  const own = ownership(game);
  const newOwn = terms.preMoney > 0 ? own * (terms.preMoney / (terms.preMoney + amount)) : own;
  return (
    <Fold id="card-equity" title="Raise equity" summary="Sell new shares to investors. Open to raise money." subtitle={`Sell new shares to investors at a 15% discount to your equity valuation. No repayments or covenants, but you own less of the upside. ${formatPct(EQUITY_FEE, 0)} fees are deducted from equity.`}>
      <KeyValue rows={[
        ['Your ownership', formatPct(own)],
        ['Pre-money valuation', formatGBP(terms.preMoney)],
        ['Maximum raise', terms.available ? formatGBP(terms.maxAmount) : terms.reason ?? '—'],
        ['Your ownership after this raise', formatPct(newOwn)],
      ]} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Amount"><MoneyInput value={amount} onChange={setAmount} step={10000} /></Field>
        <Button variant="primary" disabled={game.status !== 'playing' || !terms.available} onClick={() => act({ type: 'raiseEquity', amount }, `Raised ${formatGBP(amount)} of equity.`)}>Raise</Button>
      </div>
    </Fold>
  );
}

function DividendCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const reserves = distributableReserves(game);
  const [amount, setAmount] = useState(10_000_00);
  return (
    <Fold id="card-dividends" title="Dividends" summary="Pay yourself from reserves. Open to pay a dividend." subtitle="Dividends come out of distributable reserves (retained earnings + this year's profit). Your share counts towards your final score, but cash paid out cannot fund growth.">
      <KeyValue rows={[
        ['Distributable reserves', formatGBP(reserves)],
        ['Cash', formatGBP(game.ledger.balances.cash)],
        ['Dividends received by you to date', formatGBP(game.ownerDividends)],
      ]} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Dividend"><MoneyInput value={amount} onChange={setAmount} step={5000} /></Field>
        <Button variant="primary" disabled={game.status !== 'playing' || reserves <= 0} onClick={() => act({ type: 'payDividend', amount }, `Dividend of ${formatGBP(amount)} paid.`)}>Pay dividend</Button>
      </div>
    </Fold>
  );
}

function TreasuryCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const [amount, setAmount] = useState(20_000_00);
  const [product, setProduct] = useState<'deposit' | 'fund'>('deposit');
  const playing = game.status === 'playing';
  return (
    <Fold id="card-treasury" title="Treasury: invest surplus cash" summary="A deposit or the equity fund. Open to invest spare cash." subtitle="A deposit earns base rate − 0.5%. The equity fund is volatile and revalued monthly at fair value through profit or loss (it falls in recessions).">
      <KeyValue rows={[['Deposit', formatGBP(game.deposit)], ['Equity fund (fair value)', formatGBP(game.fundValue)]]} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Product">
          <select value={product} onChange={(e) => setProduct(e.target.value as 'deposit' | 'fund')} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm">
            <option value="deposit">Deposit</option>
            <option value="fund">Equity fund</option>
          </select>
        </Field>
        <Field label="Amount"><MoneyInput value={amount} onChange={setAmount} step={5000} /></Field>
        <Button variant="primary" disabled={!playing} onClick={() => act({ type: 'invest', product, amount }, 'Invested.')}>Invest</Button>
        <Button disabled={!playing} onClick={() => act({ type: 'withdraw', product, amount: Math.min(amount, product === 'deposit' ? game.deposit : game.fundValue) }, 'Withdrawn.')}>Withdraw</Button>
      </div>
    </Fold>
  );
}

function LeasesCard({ game }: { game: GameState }) {
  return (
    <Fold id="card-leases" title="Leases (IFRS 16)" summary="Open to see your leases." subtitle="Leased equipment sits on the balance sheet as a right-of-use asset, depreciated straight line, with a lease liability that earns interest. Payments split into interest (operating cash flow) and principal (financing cash flow).">
      {game.leases.map((l) => (
        <KeyValue key={l.id} rows={[
          [l.label, `${formatGBP(l.payment)}/month · ${l.monthsRemaining} of ${l.termMonths} months left`],
          ['Right-of-use asset (net)', formatGBP(l.cost - l.accumulated)],
          ['Lease liability', formatGBP(l.liability)],
          ['Implicit rate', formatPct(l.annualRate, 2)],
        ]} />
      ))}
      <p className="mt-2 text-xs text-ink-2">Due within 12 months: {formatGBP(leasesCurrentPortion(game.leases))} (current liability).</p>
    </Fold>
  );
}

function TaxCard({ game }: { game: GameState }) {
  return (
    <Fold id="card-tax" title="Corporation tax" summary="What you owe the taxman. Open for details." subtitle="19% small profits rate up to £50k, 25% main rate above £250k, marginal relief between. Accrued monthly on year-to-date profit; paid 9 months and 1 day after the year end. Losses carry forward.">
      <KeyValue rows={[
        ['Accrued this year', formatGBP(game.tax.ytdBooked)],
        ['Liability for last year', game.tax.due ? `${formatGBP(game.tax.due)} due ${monthLabel(game.tax.dueMonth ?? 0)}` : 'None outstanding'],
        ['Losses carried forward', formatGBP(game.tax.lossesCarriedForward)],
      ]} />
    </Fold>
  );
}
