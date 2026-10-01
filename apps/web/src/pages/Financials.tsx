import {
  balanceSheet, cashFlowStatement, currentPortion, leasesCurrentPortion, incomeStatementLines, monthLabel, plSummary, type BalanceSheet,
  type Balances, type CashFlowStatement, type GameState, type PeriodAccumulator,
} from '@cfx/engine';
import { useMemo, useState } from 'react';
import { StatementTable, type Row } from '../components/StatementTable';
import { Card, PageTitle, StatusPill, Tabs } from '../components/ui';
import { useDerived, yearPeriod, yearsOf } from '../lib/derived';

interface Period {
  id: string;
  label: string;
  period: PeriodAccumulator;
  closing: Balances;
  loansCurrent: number;
  leasesCurrent: number;
}

type Mode = 'month' | 'year';
type Statement = 'pl' | 'bs' | 'cf';

export function Financials({ game }: { game: GameState }) {
  const d = useDerived(game);
  const [mode, setMode] = useState<Mode>('month');
  const [tab, setTab] = useState<Statement>('pl');

  const periods = useMemo<Period[]>(() => {
    if (mode === 'month') {
      const list: Period[] = game.history.map((r) => ({ id: `m${r.month}`, label: monthLabel(r.month), period: r.period, closing: r.closing, loansCurrent: r.loansCurrentPortion, leasesCurrent: r.leasesCurrentPortion ?? 0 }));
      if (game.status === 'playing') {
        list.push({ id: 'open', label: `${monthLabel(game.month)} (open)`, period: game.ledger.period, closing: game.ledger.balances, loansCurrent: currentPortion(game.loans), leasesCurrent: leasesCurrentPortion(game.leases) });
      }
      return list;
    }
    return yearsOf(game).map((y) => {
      const yp = yearPeriod(game, y);
      return { id: `y${y}`, label: yp.label, period: yp.period, closing: yp.closing.closing, loansCurrent: yp.closing.loansCurrentPortion, leasesCurrent: yp.closing.leasesCurrentPortion ?? 0 };
    });
  }, [game, mode]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const idx = Math.max(0, selectedId ? periods.findIndex((p) => p.id === selectedId) : periods.length - (mode === 'month' && game.status === 'playing' && periods.length > 1 ? 2 : 1));
  const cur = periods[idx];
  const cmp = idx > 0 ? periods[idx - 1] : undefined;

  if (!cur) {
    return (
      <div>
        <PageTitle title="Financial statements" />
        <Card><p className="text-sm text-ink-2">Close your first month to produce a set of accounts.</p></Card>
      </div>
    );
  }

  const columns = [cur.label, ...(cmp ? [cmp.label] : [])];
  const curBs = balanceSheet(cur.closing, cur.loansCurrent, cur.leasesCurrent);
  const cmpBs = cmp ? balanceSheet(cmp.closing, cmp.loansCurrent, cmp.leasesCurrent) : undefined;
  const curCf = cashFlowStatement(cur.period, cur.closing.cash);
  const cmpCf = cmp ? cashFlowStatement(cmp.period, cmp.closing.cash) : undefined;

  return (
    <div>
      <PageTitle
        title="Financial statements"
        subtitle={`${game.companyName} · ${d.ind.name}. Built entirely from the general ledger: nothing here is calculated separately.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={mode} onChange={(m) => { setMode(m); setSelectedId(null); }} items={[{ id: 'month', label: 'Monthly' }, { id: 'year', label: 'Annual' }]} />
            <select aria-label="Period" value={cur.id} onChange={(e) => setSelectedId(e.target.value)} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm">
              {[...periods].reverse().map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} items={[{ id: 'pl', label: 'Income statement' }, { id: 'bs', label: 'Balance sheet' }, { id: 'cf', label: 'Cash flow' }]} />
        <IntegrityBadges bs={curBs} cf={curCf} />
      </div>
      <Card>
        {tab === 'pl' && <IncomeStatement cur={cur.period} cmp={cmp?.period} columns={columns} />}
        {tab === 'bs' && <BalanceSheetView cur={curBs} cmp={cmpBs} columns={columns} />}
        {tab === 'cf' && <CashFlowView cur={curCf} cmp={cmpCf} columns={columns} />}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Accounting policies: revenue recognised when earned (annual subscriptions deferred and released monthly), inventory at weighted average cost,
        PP&E depreciated straight line, interest paid classified as operating cash flow (IAS 7 option), identifiable net assets of acquisitions at book value as a proxy for fair value.
      </p>
    </div>
  );
}

function IntegrityBadges({ bs, cf }: { bs: BalanceSheet; cf: CashFlowStatement }) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill kind={bs.difference === 0 ? 'good' : 'bad'} label={bs.difference === 0 ? 'Assets = Liabilities + Equity' : `BS out by ${bs.difference}p`} />
      <StatusPill kind={cf.reconciles ? 'good' : 'bad'} label={cf.reconciles ? 'Cash flow reconciles to cash' : 'Cash flow does not reconcile'} />
      <StatusPill kind={cf.operatingTies ? 'good' : 'bad'} label={cf.operatingTies ? 'Operating CF ties to profit' : 'Operating CF mismatch'} />
    </div>
  );
}

function IncomeStatement({ cur, cmp, columns }: { cur: PeriodAccumulator; cmp?: PeriodAccumulator; columns: string[] }) {
  const a = plSummary(cur.pl);
  const b = cmp ? plSummary(cmp.pl) : undefined;
  const la = incomeStatementLines(a);
  const lb = b ? incomeStatementLines(b) : [];
  const keys = [...la.map((l) => l.key)];
  for (const l of lb) if (!keys.includes(l.key)) keys.splice(Math.max(0, keys.indexOf('ebitda')), 0, l.key);
  const rows: Row[] = keys.map((k) => {
    const x = la.find((l) => l.key === k) ?? lb.find((l) => l.key === k)!;
    const vb = lb.find((l) => l.key === k);
    return {
      label: x.label, kind: x.kind === 'line' ? 'line' : x.kind, negative: x.negative, help: x.help,
      values: [la.find((l) => l.key === k)?.amount ?? 0, ...(b ? [vb?.amount ?? 0] : [])],
    };
  });
  return <StatementTable columns={columns} rows={rows} caption="Income statement" />;
}

function BalanceSheetView({ cur, cmp, columns }: { cur: BalanceSheet; cmp?: BalanceSheet; columns: string[] }) {
  const v = (k: keyof BalanceSheet) => [cur[k] as number, ...(cmp ? [cmp[k] as number] : [])];
  const rows: Row[] = [
    { label: 'Non-current assets', values: [], kind: 'header' },
    { label: 'Property, plant & equipment', values: v('ppeNet'), indent: true, help: 'Cost less accumulated depreciation.' },
    { label: 'Goodwill', values: v('goodwill'), indent: true },
    { label: 'Right-of-use assets', values: v('rightOfUseNet'), indent: true, help: 'Leased equipment (IFRS 16), cost less depreciation.' },
    { label: 'Total non-current assets', values: v('nonCurrentAssets'), kind: 'subtotal' },
    { label: 'Current assets', values: [], kind: 'header' },
    { label: 'Inventory', values: v('inventory'), indent: true },
    { label: 'Trade receivables', values: v('receivables'), indent: true },
    { label: 'Prepayments', values: v('prepayments'), indent: true },
    { label: 'Short-term investments', values: v('investments'), indent: true },
    { label: 'Cash at bank', values: v('cash'), indent: true },
    { label: 'Total current assets', values: v('currentAssets'), kind: 'subtotal' },
    { label: 'Total assets', values: v('totalAssets'), kind: 'total' },
    { label: '', values: [], kind: 'spacer' },
    { label: 'Current liabilities', values: [], kind: 'header' },
    { label: 'Bank overdraft', values: v('overdraft'), indent: true },
    { label: 'Trade payables', values: v('payables'), indent: true },
    { label: 'Accruals (PAYE, NI & pension)', values: v('accruals'), indent: true },
    { label: 'Deferred revenue', values: v('deferredRevenue'), indent: true, help: 'Cash received for annual subscriptions not yet earned (IFRS 15).' },
    { label: 'Corporation tax', values: v('taxPayable'), indent: true },
    { label: 'Borrowings due within one year', values: v('borrowingsCurrent'), indent: true },
    { label: 'Lease liabilities due within one year', values: v('leaseLiabilitiesCurrent'), indent: true },
    { label: 'Total current liabilities', values: v('currentLiabilities'), kind: 'subtotal' },
    { label: 'Non-current liabilities', values: [], kind: 'header' },
    { label: 'Borrowings due after one year', values: v('borrowingsNonCurrent'), indent: true },
    { label: 'Lease liabilities due after one year', values: v('leaseLiabilitiesNonCurrent'), indent: true },
    { label: 'Total liabilities', values: v('totalLiabilities'), kind: 'subtotal' },
    { label: 'Net assets', values: v('netAssets'), kind: 'total' },
    { label: '', values: [], kind: 'spacer' },
    { label: 'Equity', values: [], kind: 'header' },
    { label: 'Share capital & premium', values: v('shareCapital'), indent: true },
    { label: 'Retained earnings', values: v('retainedEarnings'), indent: true },
    { label: 'Profit for the year to date', values: v('currentYearProfit'), indent: true, help: 'Closed into retained earnings at each year end.' },
    { label: 'Total equity', values: v('totalEquity'), kind: 'total' },
  ];
  return <StatementTable columns={columns} rows={rows} caption="Balance sheet" />;
}

function CashFlowView({ cur, cmp, columns }: { cur: CashFlowStatement; cmp?: CashFlowStatement; columns: string[] }) {
  const pick = (list: (s: CashFlowStatement) => { label: string; amount: number }[]): Row[] => {
    const labels = [...new Set([...list(cur).map((l) => l.label), ...(cmp ? list(cmp).map((l) => l.label) : [])])];
    return labels.map((label) => ({
      label, indent: true,
      values: [list(cur).find((l) => l.label === label)?.amount ?? 0, ...(cmp ? [list(cmp).find((l) => l.label === label)?.amount ?? 0] : [])],
    }));
  };
  const v = (f: (s: CashFlowStatement) => number) => [f(cur), ...(cmp ? [f(cmp)] : [])];
  const rows: Row[] = [
    { label: 'Operating activities', values: [], kind: 'header' },
    { label: 'Profit for the period', values: v((s) => s.profit), indent: true },
    ...pick((s) => s.adjustments),
    ...pick((s) => s.workingCapital),
    { label: 'Net cash from operating activities', values: v((s) => s.operating), kind: 'subtotal', help: 'Indirect method: profit adjusted for non-cash items and working capital movements. Interest is included here (IAS 7 permits this).' },
    { label: 'Investing activities', values: [], kind: 'header' },
    ...pick((s) => s.investing),
    { label: 'Net cash from investing activities', values: v((s) => s.investingTotal), kind: 'subtotal' },
    { label: 'Financing activities', values: [], kind: 'header' },
    ...pick((s) => s.financing),
    { label: 'Net cash from financing activities', values: v((s) => s.financingTotal), kind: 'subtotal' },
    { label: 'Net increase/(decrease) in cash', values: v((s) => s.netChange), kind: 'subtotal' },
    { label: 'Cash at start of period', values: v((s) => s.openingCash) },
    { label: 'Cash at end of period', values: v((s) => s.closingCash), kind: 'total', help: 'Negative means the business is using its overdraft.' },
  ];
  return <StatementTable columns={columns} rows={rows} caption="Cash flow statement" />;
}
