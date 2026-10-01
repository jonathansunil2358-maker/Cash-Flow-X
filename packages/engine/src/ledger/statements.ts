import type { Pence } from '../money';
import { ACCOUNTS, ACCOUNT_IDS, isPL, type AccountId, type Balances } from './accounts';
import type { PeriodAccumulator } from './journal';

const v = (m: Partial<Record<AccountId, Pence>>, k: AccountId): Pence => m[k] ?? 0;
/** Negate without producing -0 (which would render as "-£0"). */
const neg = (x: Pence): Pence => (x === 0 ? 0 : -x);

// ---------------------------------------------------------------------------------------------
// Income statement
// ---------------------------------------------------------------------------------------------

/** All figures presented with natural signs: income positive, expenses positive. */
export interface PLSummary {
  revenue: Pence;
  cogs: Pence;
  inventoryWriteOff: Pence;
  costOfSales: Pence;
  grossProfit: Pence;
  otherIncome: Pence;
  staff: Pence;
  marketing: Pence;
  rent: Pence;
  recruitment: Pence;
  research: Pence;
  restructuring: Pence;
  badDebts: Pence;
  dealCosts: Pence;
  otherCosts: Pence;
  otherOpex: Pence;
  opex: Pence;
  ebitda: Pence;
  depreciation: Pence;
  impairment: Pence;
  ebit: Pence;
  interestIncome: Pence;
  fairValueGains: Pence;
  financeIncome: Pence;
  financeCosts: Pence;
  pbt: Pence;
  tax: Pence;
  profit: Pence;
}

export function plSummary(pl: Partial<Record<AccountId, Pence>>): PLSummary {
  const revenue = neg(v(pl, 'revenue'));
  const cogs = v(pl, 'cogs');
  const inventoryWriteOff = v(pl, 'inventoryWriteOff');
  const costOfSales = cogs + inventoryWriteOff;
  const grossProfit = revenue - costOfSales;
  const otherIncome = neg(v(pl, 'otherIncome'));
  const staff = v(pl, 'wages');
  const marketing = v(pl, 'marketing');
  const rent = v(pl, 'rent');
  const recruitment = v(pl, 'recruitment');
  const research = v(pl, 'research');
  const restructuring = v(pl, 'restructuring');
  const badDebts = v(pl, 'badDebts');
  const dealCosts = v(pl, 'dealCosts');
  const otherCosts = v(pl, 'otherCosts');
  const otherOpex = recruitment + research + restructuring + badDebts + dealCosts + otherCosts;
  const opex = staff + marketing + rent + otherOpex;
  const ebitda = grossProfit + otherIncome - opex;
  const depreciation = v(pl, 'depreciation');
  const impairment = v(pl, 'impairment');
  const ebit = ebitda - depreciation - impairment;
  const interestIncome = neg(v(pl, 'interestIncome'));
  const fairValueGains = neg(v(pl, 'fairValueGains'));
  const financeIncome = interestIncome + fairValueGains;
  const financeCosts = v(pl, 'interestExpense');
  const pbt = ebit + financeIncome - financeCosts;
  const tax = v(pl, 'taxExpense');
  const profit = pbt - tax;
  return {
    revenue, cogs, inventoryWriteOff, costOfSales, grossProfit, otherIncome, staff, marketing, rent, recruitment, research,
    restructuring, badDebts, dealCosts, otherCosts, otherOpex, opex, ebitda, depreciation, impairment, ebit,
    interestIncome, fairValueGains, financeIncome, financeCosts, pbt, tax, profit,
  };
}

export type LineKind = 'line' | 'subtotal' | 'total' | 'header';
export interface StatementLine {
  key: string;
  label: string;
  amount: Pence;
  kind: LineKind;
  /** Amount is shown as a deduction (in brackets) in the presentation. */
  negative?: boolean;
  help?: string;
}

export function incomeStatementLines(s: PLSummary): StatementLine[] {
  const L = (key: string, label: string, amount: Pence, kind: LineKind = 'line', negative = false, help?: string): StatementLine =>
    ({ key, label, amount, kind, negative, help });
  const lines: StatementLine[] = [
    L('revenue', 'Revenue', s.revenue, 'line', false, ACCOUNTS.revenue.help),
    L('cogs', 'Cost of sales', s.cogs, 'line', true, ACCOUNTS.cogs.help),
  ];
  if (s.inventoryWriteOff) lines.push(L('inventoryWriteOff', 'Inventory write-offs', s.inventoryWriteOff, 'line', true));
  lines.push(
    L('grossProfit', 'Gross profit', s.grossProfit, 'subtotal', false, 'Revenue less cost of sales.'),
  );
  if (s.otherIncome) lines.push(L('otherIncome', 'Other operating income', s.otherIncome, 'line', false, ACCOUNTS.otherIncome.help));
  lines.push(
    L('staff', 'Staff costs', s.staff, 'line', true, ACCOUNTS.wages.help),
    L('marketing', 'Marketing', s.marketing, 'line', true),
    L('rent', 'Rent & occupancy', s.rent, 'line', true),
  );
  if (s.recruitment) lines.push(L('recruitment', 'Recruitment', s.recruitment, 'line', true));
  if (s.research) lines.push(L('research', 'Research & development', s.research, 'line', true, ACCOUNTS.research.help));
  if (s.restructuring) lines.push(L('restructuring', 'Redundancy costs', s.restructuring, 'line', true));
  if (s.badDebts) lines.push(L('badDebts', 'Bad debts', s.badDebts, 'line', true));
  if (s.dealCosts) lines.push(L('dealCosts', 'Deal & integration costs', s.dealCosts, 'line', true));
  if (s.otherCosts) lines.push(L('otherCosts', 'Other operating costs', s.otherCosts, 'line', true, ACCOUNTS.otherCosts.help));
  lines.push(
    L('ebitda', 'EBITDA', s.ebitda, 'subtotal', false, 'Earnings before interest, tax, depreciation and amortisation.'),
    L('depreciation', 'Depreciation', s.depreciation, 'line', true),
  );
  if (s.impairment) lines.push(L('impairment', 'Goodwill impairment', s.impairment, 'line', true));
  lines.push(L('ebit', 'Operating profit (EBIT)', s.ebit, 'subtotal'));
  if (s.financeIncome) lines.push(L('financeIncome', 'Finance income', s.financeIncome, 'line'));
  lines.push(
    L('financeCosts', 'Finance costs', s.financeCosts, 'line', true),
    L('pbt', 'Profit before tax', s.pbt, 'subtotal'),
    L('tax', 'Corporation tax', s.tax, 'line', true),
    L('profit', 'Profit for the period', s.profit, 'total'),
  );
  return lines;
}

// ---------------------------------------------------------------------------------------------
// Balance sheet
// ---------------------------------------------------------------------------------------------

export interface BalanceSheet {
  cash: Pence;
  receivables: Pence;
  inventory: Pence;
  prepayments: Pence;
  investments: Pence;
  currentAssets: Pence;
  ppeCost: Pence;
  accumDepreciation: Pence;
  ppeNet: Pence;
  goodwill: Pence;
  rightOfUseCost: Pence;
  rightOfUseNet: Pence;
  nonCurrentAssets: Pence;
  totalAssets: Pence;
  overdraft: Pence;
  payables: Pence;
  accruals: Pence;
  deferredRevenue: Pence;
  taxPayable: Pence;
  borrowingsCurrent: Pence;
  leaseLiabilitiesCurrent: Pence;
  currentLiabilities: Pence;
  borrowingsNonCurrent: Pence;
  leaseLiabilitiesNonCurrent: Pence;
  nonCurrentLiabilities: Pence;
  totalLiabilities: Pence;
  netAssets: Pence;
  shareCapital: Pence;
  retainedEarnings: Pence;
  currentYearProfit: Pence;
  totalEquity: Pence;
  /** totalAssets - totalLiabilities - totalEquity. Always 0 if the ledger is sound. */
  difference: Pence;
}

/**
 * Build the balance sheet from ledger balances. `loansCurrentPortion` (principal due within
 * 12 months, from the loan schedules) splits borrowings into current and non-current; likewise
 * `leasesCurrentPortion` for IFRS 16 lease liabilities.
 */
export function balanceSheet(b: Balances, loansCurrentPortion: Pence, leasesCurrentPortion: Pence = 0): BalanceSheet {
  const cash = Math.max(0, b.cash);
  const overdraft = Math.max(0, neg(b.cash));
  const currentAssets = cash + b.receivables + b.inventory + b.prepayments + b.investments;
  const ppeNet = b.ppe + b.accumDepreciation;
  const rightOfUseNet = b.rightOfUse + b.rouAccumDepreciation;
  const nonCurrentAssets = ppeNet + b.goodwill + rightOfUseNet;
  const totalAssets = currentAssets + nonCurrentAssets;

  const loans = neg(b.loans);
  const borrowingsCurrent = Math.min(loans, Math.max(0, loansCurrentPortion));
  const borrowingsNonCurrent = loans - borrowingsCurrent;
  const leases = neg(b.leaseLiability);
  const leaseLiabilitiesCurrent = Math.min(leases, Math.max(0, leasesCurrentPortion));
  const leaseLiabilitiesNonCurrent = leases - leaseLiabilitiesCurrent;
  const payables = neg(b.payables);
  const accruals = neg(b.accruals);
  const deferredRevenue = neg(b.deferredRevenue);
  const taxPayable = neg(b.taxPayable);
  const currentLiabilities = overdraft + payables + accruals + deferredRevenue + taxPayable + borrowingsCurrent + leaseLiabilitiesCurrent;
  const nonCurrentLiabilities = borrowingsNonCurrent + leaseLiabilitiesNonCurrent;
  const totalLiabilities = currentLiabilities + nonCurrentLiabilities;

  const shareCapital = neg(b.shareCapital);
  const retainedEarnings = neg(b.retainedEarnings);
  let plTotal = 0;
  for (const id of ACCOUNT_IDS) if (isPL(id)) plTotal += b[id];
  const currentYearProfit = neg(plTotal);
  const totalEquity = shareCapital + retainedEarnings + currentYearProfit;

  return {
    cash, receivables: b.receivables, inventory: b.inventory, prepayments: b.prepayments, investments: b.investments,
    currentAssets, ppeCost: b.ppe, accumDepreciation: b.accumDepreciation, ppeNet, goodwill: b.goodwill,
    rightOfUseCost: b.rightOfUse, rightOfUseNet, nonCurrentAssets, totalAssets, overdraft, payables, accruals, deferredRevenue,
    taxPayable, borrowingsCurrent, leaseLiabilitiesCurrent, currentLiabilities, borrowingsNonCurrent, leaseLiabilitiesNonCurrent, nonCurrentLiabilities, totalLiabilities,
    netAssets: totalAssets - totalLiabilities, shareCapital, retainedEarnings, currentYearProfit, totalEquity,
    difference: totalAssets - totalLiabilities - totalEquity,
  };
}

// ---------------------------------------------------------------------------------------------
// Cash flow statement (indirect method)
// ---------------------------------------------------------------------------------------------

export interface CashFlowLine {
  label: string;
  amount: Pence;
}

export interface CashFlowStatement {
  profit: Pence;
  adjustments: CashFlowLine[];
  workingCapital: CashFlowLine[];
  operating: Pence;
  investing: CashFlowLine[];
  investingTotal: Pence;
  financing: CashFlowLine[];
  financingTotal: Pence;
  netChange: Pence;
  openingCash: Pence;
  closingCash: Pence;
  /** Opening cash + net cash flow === closing cash. */
  reconciles: boolean;
  /** Operating cash rebuilt from profit + adjustments equals the operating cash posted. */
  operatingTies: boolean;
}

const ADJUSTMENT_LABELS: Partial<Record<AccountId, string>> = {
  accumDepreciation: 'Depreciation',
  rouAccumDepreciation: 'Depreciation of right-of-use assets',
  shareCapital: 'Share-based payments (non-cash)',
  goodwill: 'Goodwill impairment',
  investments: 'Fair value (gains)/losses on investments',
};

const WORKING_CAPITAL_LABELS: Partial<Record<AccountId, string>> = {
  receivables: '(Increase)/decrease in trade receivables',
  inventory: '(Increase)/decrease in inventory',
  prepayments: '(Increase)/decrease in prepayments',
  payables: 'Increase/(decrease) in trade payables',
  accruals: 'Increase/(decrease) in accruals',
  deferredRevenue: 'Increase/(decrease) in deferred revenue',
  taxPayable: 'Increase/(decrease) in corporation tax payable',
};

export function cashFlowStatement(period: PeriodAccumulator, closingCash: Pence): CashFlowStatement {
  const profit = plSummary(period.pl).profit;
  let plFromOperating = 0;
  const adjustments: CashFlowLine[] = [];
  const workingCapital: CashFlowLine[] = [];
  for (const id of ACCOUNT_IDS) {
    const amount = period.operating[id] ?? 0;
    if (isPL(id)) {
      plFromOperating += amount;
      continue;
    }
    if (amount === 0) continue;
    const wc = WORKING_CAPITAL_LABELS[id];
    if (wc) workingCapital.push({ label: wc, amount });
    else adjustments.push({ label: ADJUSTMENT_LABELS[id] ?? `Movement in ${ACCOUNTS[id].name.toLowerCase()}`, amount });
  }
  const operating = profit + adjustments.reduce((s, l) => s + l.amount, 0) + workingCapital.reduce((s, l) => s + l.amount, 0);
  const investing = Object.entries(period.investing).filter(([, a]) => a !== 0).map(([label, amount]) => ({ label, amount }));
  const financing = Object.entries(period.financing).filter(([, a]) => a !== 0).map(([label, amount]) => ({ label, amount }));
  const investingTotal = investing.reduce((s, l) => s + l.amount, 0);
  const financingTotal = financing.reduce((s, l) => s + l.amount, 0);
  const netChange = operating + investingTotal + financingTotal;
  return {
    profit, adjustments, workingCapital, operating, investing, investingTotal, financing, financingTotal, netChange,
    openingCash: period.openingCash, closingCash,
    reconciles: period.openingCash + netChange === closingCash,
    operatingTies: plFromOperating === profit,
  };
}

/** Sum only the P&L movements of several periods (hot path: TTM and YTD figures every month). */
export function sumPL(periods: PeriodAccumulator[]): Partial<Record<AccountId, Pence>> {
  const out: Partial<Record<AccountId, Pence>> = {};
  for (const p of periods) {
    for (const k in p.pl) {
      const id = k as AccountId;
      out[id] = (out[id] ?? 0) + (p.pl[id] ?? 0);
    }
  }
  return out;
}

/** Combine consecutive monthly periods into one (e.g. a financial year). */
export function mergePeriods(periods: PeriodAccumulator[]): PeriodAccumulator {
  const out: PeriodAccumulator = { openingCash: periods[0]?.openingCash ?? 0, pl: {}, operating: {}, investing: {}, financing: {} };
  for (const p of periods) {
    for (const [k, a] of Object.entries(p.pl)) out.pl[k as AccountId] = (out.pl[k as AccountId] ?? 0) + (a ?? 0);
    for (const [k, a] of Object.entries(p.operating)) out.operating[k as AccountId] = (out.operating[k as AccountId] ?? 0) + (a ?? 0);
    for (const [k, a] of Object.entries(p.investing)) out.investing[k] = (out.investing[k] ?? 0) + a;
    for (const [k, a] of Object.entries(p.financing)) out.financing[k] = (out.financing[k] ?? 0) + a;
  }
  return out;
}
