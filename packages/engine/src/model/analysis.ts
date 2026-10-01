import type { PLSummary } from '../ledger/statements';
import type { Pence } from '../money';
import { industryOf } from './industries';
import { annualise, currentBalanceSheet, revenueGrowth, trailingPL } from './metrics';
import { headcount, loanPrincipal, type GameState } from './state';

export type RatioFormat = 'pct' | 'x' | 'days' | 'months' | 'gbp';
export type RatioStatus = 'good' | 'ok' | 'bad' | 'na';

export interface Ratio {
  id: string;
  group: 'Profitability' | 'Liquidity' | 'Efficiency' | 'Leverage';
  label: string;
  value: number | null;
  format: RatioFormat;
  formula: string;
  definition: string;
  benchmark: number | null;
  better: 'higher' | 'lower';
}

export function ratioStatus(r: Ratio): RatioStatus {
  if (r.value === null || !Number.isFinite(r.value)) return 'na';
  if (r.benchmark === null) return 'ok';
  const rel = r.better === 'higher' ? r.value - r.benchmark : r.benchmark - r.value;
  const tolerance = Math.abs(r.benchmark) * 0.15 + (r.format === 'days' ? 3 : 0.005);
  if (rel >= 0) return 'good';
  if (rel >= -tolerance) return 'ok';
  return 'bad';
}

const div = (a: number, b: number): number | null => (b === 0 ? null : a / b);

/** Key ratios on a trailing-twelve-month basis (annualised if there is less history). */
export function ratios(s: GameState): Ratio[] {
  const ind = industryOf(s);
  const bm = ind.benchmarks;
  const t = trailingPL(s, 12);
  const a = (v: Pence) => annualise(v, t.months);
  const p = t.summary;
  const revenue = a(p.revenue);
  const bs = currentBalanceSheet(s);
  const debt = loanPrincipal(s) + bs.overdraft;
  const capitalEmployed = bs.totalAssets - bs.currentLiabilities;
  const purchases = a(p.cogs + p.marketing);

  const dso = div(bs.receivables * 365, revenue);
  const dio = div(bs.inventory * 365, a(p.cogs));
  const dpo = div(bs.payables * 365, purchases);

  const recent = s.history.slice(-3);
  const netCash = recent.length ? recent.reduce((acc, r) => acc + (r.closing.cash - r.period.openingCash), 0) / recent.length : 0;
  const runway = netCash < 0 ? (bs.cash - bs.overdraft) / -netCash : null;

  return [
    { id: 'grossMargin', group: 'Profitability', label: 'Gross margin', value: div(a(p.grossProfit), revenue), format: 'pct', formula: 'Gross profit ÷ Revenue', definition: 'How much of each £1 of sales is left after the direct cost of delivering it.', benchmark: bm.grossMargin, better: 'higher' },
    { id: 'ebitdaMargin', group: 'Profitability', label: 'EBITDA margin', value: div(a(p.ebitda), revenue), format: 'pct', formula: 'EBITDA ÷ Revenue', definition: 'Operating cash profitability before financing, tax and depreciation. The basis of most valuation multiples.', benchmark: bm.ebitdaMargin, better: 'higher' },
    { id: 'netMargin', group: 'Profitability', label: 'Net profit margin', value: div(a(p.profit), revenue), format: 'pct', formula: 'Profit after tax ÷ Revenue', definition: 'What is left for shareholders from each £1 of sales.', benchmark: null, better: 'higher' },
    { id: 'roce', group: 'Profitability', label: 'ROCE', value: div(a(p.ebit), capitalEmployed), format: 'pct', formula: 'EBIT ÷ (Total assets − Current liabilities)', definition: 'Return on capital employed: how efficiently the long-term capital in the business generates operating profit. Compare it with your cost of capital.', benchmark: 0.15, better: 'higher' },
    { id: 'growth', group: 'Profitability', label: 'Revenue growth (annualised)', value: s.history.length >= 6 ? revenueGrowth(s) : null, format: 'pct', formula: 'Year-on-year (or annualised quarter-on-quarter) change in revenue', definition: 'Growth drives valuation multiples, but it usually consumes cash first.', benchmark: null, better: 'higher' },
    { id: 'currentRatio', group: 'Liquidity', label: 'Current ratio', value: div(bs.currentAssets, bs.currentLiabilities), format: 'x', formula: 'Current assets ÷ Current liabilities', definition: 'Ability to meet obligations due within a year from assets that turn into cash within a year.', benchmark: bm.currentRatio, better: 'higher' },
    { id: 'quickRatio', group: 'Liquidity', label: 'Quick (acid-test) ratio', value: div(bs.currentAssets - bs.inventory, bs.currentLiabilities), format: 'x', formula: '(Current assets − Inventory) ÷ Current liabilities', definition: 'Liquidity excluding stock, which may be slow to sell.', benchmark: 1, better: 'higher' },
    { id: 'runway', group: 'Liquidity', label: 'Cash runway', value: runway, format: 'months', formula: 'Cash ÷ average monthly cash burn (last 3 months)', definition: 'Months until cash runs out at the recent burn rate. Blank when the business is cash generative.', benchmark: 12, better: 'higher' },
    { id: 'dso', group: 'Efficiency', label: 'Receivable days (DSO)', value: dso, format: 'days', formula: 'Trade receivables ÷ Revenue × 365', definition: 'Average time customers take to pay. Every extra day ties up cash.', benchmark: bm.receivableDays, better: 'lower' },
    { id: 'dio', group: 'Efficiency', label: 'Inventory days (DIO)', value: ind.model === 'unit' ? dio : null, format: 'days', formula: 'Inventory ÷ Cost of sales × 365', definition: 'How long stock sits before it is sold.', benchmark: ind.model === 'unit' ? bm.inventoryDays : null, better: 'lower' },
    { id: 'dpo', group: 'Efficiency', label: 'Payable days (DPO)', value: dpo, format: 'days', formula: 'Trade payables ÷ (Cost of sales + Marketing) × 365', definition: 'How long you take to pay suppliers. Longer terms fund your working capital.', benchmark: ind.payableDays, better: 'higher' },
    { id: 'ccc', group: 'Efficiency', label: 'Cash conversion cycle', value: dso === null && dio === null ? null : (dso ?? 0) + (ind.model === 'unit' ? dio ?? 0 : 0) - (dpo ?? 0), format: 'days', formula: 'DSO + DIO − DPO', definition: 'Days between paying for inputs and collecting cash from customers. Negative means customers fund you.', benchmark: bm.receivableDays + (ind.model === 'unit' ? bm.inventoryDays : 0) - ind.payableDays, better: 'lower' },
    { id: 'revPerHead', group: 'Efficiency', label: 'Revenue per employee', value: headcount(s) ? revenue / headcount(s) : null, format: 'gbp', formula: 'Revenue ÷ Headcount', definition: 'Productivity of your team.', benchmark: null, better: 'higher' },
    { id: 'gearing', group: 'Leverage', label: 'Gearing', value: div(debt, debt + bs.totalEquity), format: 'pct', formula: 'Debt ÷ (Debt + Equity)', definition: 'Share of long-term funding that comes from lenders. Higher gearing magnifies returns and risk.', benchmark: 0.4, better: 'lower' },
    { id: 'debtEbitda', group: 'Leverage', label: 'Net debt / EBITDA', value: a(p.ebitda) > 0 ? (debt - bs.cash) / a(p.ebitda) : null, format: 'x', formula: '(Borrowings − Cash) ÷ EBITDA', definition: 'Years of EBITDA needed to repay debt. Banks covenant gross debt/EBITDA at 3.5x here.', benchmark: 2.5, better: 'lower' },
    { id: 'interestCover', group: 'Leverage', label: 'Interest cover', value: p.financeCosts > 0 ? a(p.ebitda) / a(p.financeCosts) : null, format: 'x', formula: 'EBITDA ÷ Finance costs', definition: 'How many times operating earnings cover interest. The bank covenant minimum is 3x.', benchmark: 4, better: 'higher' },
  ];
}

export interface BridgeStep {
  label: string;
  delta: Pence;
}

/** Profit bridge (waterfall) explaining the change in profit between two periods. */
export function profitBridge(prev: PLSummary, cur: PLSummary): BridgeStep[] {
  return [
    { label: 'Revenue', delta: cur.revenue - prev.revenue },
    { label: 'Cost of sales', delta: -(cur.costOfSales - prev.costOfSales) },
    { label: 'Staff costs', delta: -(cur.staff - prev.staff) },
    { label: 'Marketing', delta: -(cur.marketing - prev.marketing) },
    { label: 'Rent', delta: -(cur.rent - prev.rent) },
    { label: 'Other opex', delta: -(cur.otherOpex - prev.otherOpex) },
    { label: 'Depreciation & impairment', delta: -(cur.depreciation + cur.impairment - prev.depreciation - prev.impairment) },
    { label: 'Net finance', delta: cur.financeIncome - cur.financeCosts - (prev.financeIncome - prev.financeCosts) },
    { label: 'Tax', delta: -(cur.tax - prev.tax) },
  ];
}
