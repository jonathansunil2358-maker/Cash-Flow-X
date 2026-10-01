import type { Pence } from '../money';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type AccountGroup =
  | 'currentAssets'
  | 'nonCurrentAssets'
  | 'currentLiabilities'
  | 'borrowings'
  | 'leases'
  | 'equity'
  | 'revenue'
  | 'otherIncome'
  | 'costOfSales'
  | 'opex'
  | 'depreciation'
  | 'impairment'
  | 'financeIncome'
  | 'financeCosts'
  | 'tax';

export interface AccountDef {
  name: string;
  type: AccountType;
  group: AccountGroup;
  /** Short explanation shown in the trial balance / general ledger. */
  help: string;
}

/**
 * Chart of accounts. Balances are signed: debit = positive, credit = negative.
 * A trial balance therefore always sums to exactly zero.
 */
export const ACCOUNTS = {
  cash: { name: 'Cash at bank', type: 'asset', group: 'currentAssets', help: 'Bank balance. A negative balance is an overdraft.' },
  receivables: { name: 'Trade receivables', type: 'asset', group: 'currentAssets', help: 'Invoices issued to customers but not yet paid.' },
  inventory: { name: 'Inventory', type: 'asset', group: 'currentAssets', help: 'Stock held at weighted-average cost.' },
  prepayments: { name: 'Prepayments', type: 'asset', group: 'currentAssets', help: 'Rent paid quarterly in advance, released monthly.' },
  investments: { name: 'Short-term investments', type: 'asset', group: 'currentAssets', help: 'Deposits and fund holdings (fair value through profit or loss).' },
  ppe: { name: 'Property, plant & equipment (cost)', type: 'asset', group: 'nonCurrentAssets', help: 'Equipment, fit-out and automation at cost.' },
  accumDepreciation: { name: 'Accumulated depreciation', type: 'asset', group: 'nonCurrentAssets', help: 'Contra-asset: depreciation charged to date.' },
  goodwill: { name: 'Goodwill', type: 'asset', group: 'nonCurrentAssets', help: 'Price paid for acquisitions above the fair value of net assets.' },
  rightOfUse: { name: 'Right-of-use assets (cost)', type: 'asset', group: 'nonCurrentAssets', help: 'Leased equipment recognised on the balance sheet under IFRS 16.' },
  rouAccumDepreciation: { name: 'Right-of-use accumulated depreciation', type: 'asset', group: 'nonCurrentAssets', help: 'Contra-asset: depreciation of leased equipment over the lease term.' },
  payables: { name: 'Trade payables', type: 'liability', group: 'currentLiabilities', help: 'Supplier invoices not yet paid.' },
  accruals: { name: 'Accruals (PAYE, NI & pension)', type: 'liability', group: 'currentLiabilities', help: 'Payroll taxes and pension owed, paid the following month.' },
  deferredRevenue: { name: 'Deferred revenue', type: 'liability', group: 'currentLiabilities', help: 'Annual subscriptions billed in advance but not yet earned (IFRS 15).' },
  taxPayable: { name: 'Corporation tax payable', type: 'liability', group: 'currentLiabilities', help: 'Tax accrued, paid 9 months and 1 day after the year end.' },
  loans: { name: 'Bank loans', type: 'liability', group: 'borrowings', help: 'Term loans, split into current and non-current portions on the balance sheet.' },
  leaseLiability: { name: 'Lease liabilities', type: 'liability', group: 'leases', help: 'Present value of remaining lease payments (IFRS 16), split into current and non-current portions.' },
  shareCapital: { name: 'Share capital & premium', type: 'equity', group: 'equity', help: 'Money invested by shareholders.' },
  retainedEarnings: { name: 'Retained earnings', type: 'equity', group: 'equity', help: 'Accumulated profits less dividends. Closed from the P&L each year end.' },
  revenue: { name: 'Revenue', type: 'income', group: 'revenue', help: 'Sales recognised when earned.' },
  otherIncome: { name: 'Other operating income', type: 'income', group: 'otherIncome', help: 'Grants, insurance payouts and one-off gains from events.' },
  cogs: { name: 'Cost of sales', type: 'expense', group: 'costOfSales', help: 'Direct cost of goods sold or of serving customers.' },
  inventoryWriteOff: { name: 'Inventory write-offs', type: 'expense', group: 'costOfSales', help: 'Spoiled, obsolete or damaged stock.' },
  wages: { name: 'Staff costs', type: 'expense', group: 'opex', help: 'Salaries plus employer NI and pension (15% on-cost).' },
  marketing: { name: 'Marketing', type: 'expense', group: 'opex', help: 'Advertising and brand spend.' },
  rent: { name: 'Rent & occupancy', type: 'expense', group: 'opex', help: 'Premises cost, scaling with headcount.' },
  insurance: { name: 'Insurance', type: 'expense', group: 'opex', help: 'Premiums for your business insurance cover.' },
  research: { name: 'Research & development', type: 'expense', group: 'opex', help: 'Spend on R&D projects (new products, cost savings, quality).' },
  recruitment: { name: 'Recruitment', type: 'expense', group: 'opex', help: 'Agency fees on hiring.' },
  restructuring: { name: 'Redundancy costs', type: 'expense', group: 'opex', help: 'One month of salary per leaver.' },
  badDebts: { name: 'Bad debts', type: 'expense', group: 'opex', help: 'Receivables written off as uncollectable.' },
  dealCosts: { name: 'Deal & integration costs', type: 'expense', group: 'opex', help: 'Due diligence fees and acquisition integration.' },
  otherCosts: { name: 'Other operating costs', type: 'expense', group: 'opex', help: 'Repairs, penalties, professional fees and other one-off costs from events.' },
  depreciation: { name: 'Depreciation', type: 'expense', group: 'depreciation', help: 'Straight-line depreciation of PP&E.' },
  impairment: { name: 'Goodwill impairment', type: 'expense', group: 'impairment', help: 'Write-down when goodwill exceeds recoverable amount (IAS 36).' },
  interestIncome: { name: 'Interest income', type: 'income', group: 'financeIncome', help: 'Interest earned on deposits.' },
  fairValueGains: { name: 'Fair value gains/(losses)', type: 'income', group: 'financeIncome', help: 'Revaluation of fund investments.' },
  interestExpense: { name: 'Interest & finance charges', type: 'expense', group: 'financeCosts', help: 'Loan and overdraft interest, arrangement and waiver fees.' },
  taxExpense: { name: 'Corporation tax', type: 'expense', group: 'tax', help: 'Current tax charge for the period.' },
} as const satisfies Record<string, AccountDef>;

export type AccountId = keyof typeof ACCOUNTS;
export const ACCOUNT_IDS = Object.keys(ACCOUNTS) as AccountId[];

const PL_FLAGS = Object.fromEntries(
  ACCOUNT_IDS.map((id) => [id, ACCOUNTS[id].type === 'income' || ACCOUNTS[id].type === 'expense']),
) as Record<AccountId, boolean>;

/** True for income statement accounts (a lookup table: this runs for every ledger line). */
export const isPL = (id: AccountId): boolean => PL_FLAGS[id];

export type Balances = Record<AccountId, Pence>;

export function emptyBalances(): Balances {
  const b = {} as Balances;
  for (const id of ACCOUNT_IDS) b[id] = 0;
  return b;
}
