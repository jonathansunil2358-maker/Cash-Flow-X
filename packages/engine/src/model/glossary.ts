import { formatGBP } from '../money';
import { trailingPL } from './metrics';
import { currentBalanceSheet } from './metrics';
import { ratios } from './analysis';
import type { GameState } from './state';

/** Plain-English explanations, each with an example taken from the player's own company. */
export interface Term { id: string; name: string; plain: string; example: (s: GameState) => string }
const ratioText = (s: GameState, id: string, f: (v: number) => string): string | null => {
  const v = ratios(s).find((r) => r.id === id)?.value;
  return v === null || v === undefined ? null : f(v);
};
export const TERMS: Term[] = [
  { id: 'revenue', name: 'Revenue', plain: 'All the money customers owe you for what you sold, before any costs come off.',
    example: (s) => `In the last 12 months (or fewer, if younger) your revenue was ${formatGBP(trailingPL(s, 12).summary.revenue, { compact: true })}.` },
  { id: 'grossMargin', name: 'Gross margin', plain: 'The share of each pound of sales left after the direct cost of making or buying what you sold.',
    example: (s) => ratioText(s, 'grossMargin', (v) => `Out of every £1 you sell, ${Math.round(v * 100)}p is left after direct costs.`) ?? 'It appears once you have a month of sales.' },
  { id: 'ebitda', name: 'EBITDA', plain: 'Profit before interest, tax, depreciation and amortisation. A quick measure of how well the day-to-day business earns.',
    example: (s) => `Over the last year your EBITDA was ${formatGBP(trailingPL(s, 12).summary.ebitda, { compact: true })}.` },
  { id: 'netProfit', name: 'Net profit', plain: 'What is left after every cost, interest and tax. It belongs to the owners.',
    example: (s) => `Your net profit over the last year was ${formatGBP(trailingPL(s, 12).summary.profit, { compact: true })}.` },
  { id: 'cashFlow', name: 'Cash flow', plain: 'The money actually moving in and out of the bank. A company can be profitable and still run out of cash.',
    example: (s) => `You hold ${formatGBP(s.ledger.balances.cash, { compact: true })} in the bank right now.` },
  { id: 'receivables', name: 'Receivables', plain: 'Money customers owe you for sales you have already made but not yet been paid for.',
    example: (s) => `Customers currently owe you ${formatGBP(currentBalanceSheet(s).receivables, { compact: true })}.` },
  { id: 'payables', name: 'Payables', plain: 'Money you owe suppliers for things you have already received.',
    example: (s) => `You owe suppliers ${formatGBP(currentBalanceSheet(s).payables, { compact: true })}.` },
  { id: 'inventory', name: 'Inventory (stock)', plain: 'Goods you have bought or made but not sold yet. It ties up cash until it sells.',
    example: (s) => `You hold ${formatGBP(currentBalanceSheet(s).inventory, { compact: true })} of stock.` },
  { id: 'depreciation', name: 'Depreciation', plain: 'Spreading the cost of a long-lasting asset over the years you use it, instead of counting it all at once.',
    example: (s) => `Last year you booked ${formatGBP(trailingPL(s, 12).summary.depreciation, { compact: true })} of depreciation.` },
  { id: 'overdraft', name: 'Overdraft', plain: 'A bank lets you spend more than you have, up to a limit, and charges interest on what you borrow.',
    example: (s) => (s.ledger.balances.cash < 0 ? `You are overdrawn by ${formatGBP(-s.ledger.balances.cash, { compact: true })}.` : 'You are not overdrawn at the moment.') },
  { id: 'gearing', name: 'Gearing', plain: 'How much of the company is funded by borrowing rather than by the owners. High gearing magnifies both gains and risks.',
    example: (s) => ratioText(s, 'gearing', (v) => `${Math.round(v * 100)}% of your long-term funding comes from lenders.`) ?? 'It appears once you have some funding history.' },
  { id: 'currentRatio', name: 'Current ratio', plain: 'Whether what you own and will soon turn into cash is enough to pay what you owe soon. Below 1 is a warning.',
    example: (s) => ratioText(s, 'currentRatio', (v) => `Your current ratio is ${v.toFixed(2)}x.`) ?? 'It appears once the books are open.' },
  { id: 'equity', name: 'Equity value', plain: 'What the whole company is worth to its owners if you sold it today, after paying off debts.',
    example: (s) => `Your latest valuation is ${formatGBP(s.history.at(-1)?.valuation?.equityValue ?? 0, { compact: true })}.` },
  { id: 'tax', name: 'Corporation tax', plain: 'A tax on company profits. You pay it after the year ends, so you need the cash set aside.',
    example: (s) => (s.tax.due > 0 ? `You owe ${formatGBP(s.tax.due, { compact: true })} of tax.` : 'You owe no tax right now.') },
  { id: 'covenant', name: 'Loan covenant', plain: 'A promise to the bank to keep certain ratios healthy. Break it and the bank can charge more or ask for its money back.',
    example: (s) => (s.loans.length ? `You have ${s.loans.length} loan${s.loans.length > 1 ? 's' : ''} with covenants.` : 'You have no loans, so no covenants.') },
];
export const termOf = (id: string): Term | undefined => TERMS.find((t) => t.id === id);
