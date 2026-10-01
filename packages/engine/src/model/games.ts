import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { ACCOUNTS, type AccountId } from '../ledger/accounts';
import { ratios } from './analysis';
import { industryOf } from './industries';
import type { GameState } from './state';

/** Small deterministic generator so everyone gets the same puzzle on the same day. */
function gen(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(r: () => number, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Accountant's desk: which journal entry records this?
// ---------------------------------------------------------------------------------------------
export interface Entry { debit: AccountId; credit: AccountId }
export interface Transaction { id: string; story: (amount: string) => string; entry: Entry; why: string }
export const TRANSACTIONS: Transaction[] = [
  { id: 'stockCredit', story: (a) => `You buy ${a} of stock from a supplier, to pay next month.`, entry: { debit: 'inventory', credit: 'payables' }, why: 'Stock you own is an asset, so it is a debit. You owe the supplier, a liability, so that is a credit.' },
  { id: 'saleCredit', story: (a) => `You sell ${a} of goods to a customer who will pay next month.`, entry: { debit: 'receivables', credit: 'revenue' }, why: 'The customer owes you (an asset: debit receivables) and you have earned income (credit revenue).' },
  { id: 'customerPays', story: (a) => `A customer pays an invoice of ${a} that you sent last month.`, entry: { debit: 'cash', credit: 'receivables' }, why: 'Cash rises (debit) and what the customer owed you falls (credit receivables). Revenue was already counted when you sold.' },
  { id: 'payRent', story: (a) => `You pay ${a} of rent from the bank.`, entry: { debit: 'rent', credit: 'cash' }, why: 'Rent is an expense (debit) and cash leaves the bank (credit).' },
  { id: 'payWages', story: (a) => `You pay ${a} of wages from the bank.`, entry: { debit: 'wages', credit: 'cash' }, why: 'Wages are an expense (debit) and cash goes down (credit).' },
  { id: 'loanIn', story: (a) => `The bank lends you ${a}.`, entry: { debit: 'cash', credit: 'loans' }, why: 'Cash goes up (debit). You now owe the bank, a liability (credit).' },
  { id: 'shares', story: (a) => `You put ${a} of your own money into the company for shares.`, entry: { debit: 'cash', credit: 'shareCapital' }, why: 'Cash comes in (debit) and the owners\' stake grows (credit share capital).' },
  { id: 'buyEquipment', story: (a) => `You buy ${a} of equipment and pay from the bank.`, entry: { debit: 'ppe', credit: 'cash' }, why: 'Equipment is an asset you will use for years (debit PPE), paid for with cash (credit).' },
  { id: 'payInvoice', story: (a) => `You pay a supplier ${a} that you owed from last month.`, entry: { debit: 'payables', credit: 'cash' }, why: 'What you owed falls (debit payables) and cash goes down (credit). The cost was already recorded when you bought.' },
  { id: 'marketing', story: (a) => `You pay ${a} for an advert from the bank.`, entry: { debit: 'marketing', credit: 'cash' }, why: 'Marketing is an expense (debit); cash leaves (credit).' },
  { id: 'prepaidCustomer', story: (a) => `A customer pays ${a} in advance for a year of service.`, entry: { debit: 'cash', credit: 'deferredRevenue' }, why: 'You have the cash (debit) but have not delivered yet, so you owe service: deferred revenue is a liability (credit).' },
  { id: 'repayLoan', story: (a) => `You repay ${a} of a bank loan.`, entry: { debit: 'loans', credit: 'cash' }, why: 'The debt falls (debit loans) and cash goes down (credit). Repaying principal is not an expense.' },
];
export const entryLabel = (e: Entry): string => `Debit ${ACCOUNTS[e.debit].name}, credit ${ACCOUNTS[e.credit].name}`;

export interface JournalPuzzle { day: string; tx: Transaction; amount: Pence; story: string; options: { id: string; label: string }[]; answer: string }
export function journalPuzzle(day: string): JournalPuzzle {
  const r = gen(`journal|${day}`);
  const tx = TRANSACTIONS[Math.floor(r() * TRANSACTIONS.length)];
  const amount = (10 + Math.floor(r() * 90)) * 100_00;
  const right: Entry = tx.entry;
  const swapped: Entry = { debit: right.credit, credit: right.debit };
  const others = shuffled(r, TRANSACTIONS.filter((t) => t.id !== tx.id));
  const wrong: Entry[] = [swapped];
  for (const o of others) {
    if (wrong.length >= 3) break;
    const e = o.entry;
    if ((e.debit === right.debit && e.credit === right.credit) || wrong.some((w) => w.debit === e.debit && w.credit === e.credit)) continue;
    wrong.push(e);
  }
  const options = shuffled(r, [right, ...wrong]).map((e) => ({ id: `${e.debit}|${e.credit}`, label: entryLabel(e) }));
  return { day, tx, amount, story: tx.story(formatGBP(amount)), options, answer: `${right.debit}|${right.credit}` };
}

// ---------------------------------------------------------------------------------------------
// Mock interview: an investor asks about your own numbers
// ---------------------------------------------------------------------------------------------
export interface InterviewQuestion { id: string; ask: string; options: { id: string; text: string }[]; answer: string; explain: string }
const fmtR = (v: number | null, f: (x: number) => string): string => (v === null ? 'not measurable yet' : f(v));
export function interviewOf(s: GameState): InterviewQuestion[] {
  const ind = industryOf(s);
  const rs = ratios(s);
  const get = (id: string): number | null => rs.find((x) => x.id === id)?.value ?? null;
  const cr = get('currentRatio');
  const gm = get('grossMargin');
  const dso = get('dso');
  const gear = get('gearing');
  const out: InterviewQuestion[] = [];
  out.push({
    id: 'liquidity',
    ask: `"Your current ratio is ${fmtR(cr, (x) => `${x.toFixed(2)}x`)}. What does that tell me?"`,
    options: [
      { id: 'safe', text: 'You can comfortably cover what you owe in the next year.' },
      { id: 'tight', text: 'You may struggle to pay what you owe in the next year.' },
      { id: 'profit', text: 'You are very profitable.' },
    ],
    answer: cr !== null && cr >= 1 ? 'safe' : 'tight',
    explain: 'The current ratio compares assets that turn into cash within a year with bills due within a year. Above 1 means you can cover them; below 1 is a warning. It says nothing directly about profit.',
  });
  const hi = gm !== null && gm >= ind.benchmarks.grossMargin;
  out.push({
    id: 'margin',
    ask: `"Your gross margin is ${fmtR(gm, (x) => `${Math.round(x * 100)}%`)} and firms like yours usually make about ${Math.round(ind.benchmarks.grossMargin * 100)}%. Where do you stand?"`,
    options: [
      { id: 'above', text: 'At or above the usual level for your sector.' },
      { id: 'below', text: 'Below the usual level for your sector.' },
      { id: 'same', text: 'The margin does not matter, only the sales.' },
    ],
    answer: hi ? 'above' : 'below',
    explain: 'Gross margin is what is left of each pound of sales after the direct cost of delivering it. Comparing it with the sector shows whether you price and buy well.',
  });
  if (ind.receivableDays > 0) {
    const slow = dso !== null && dso > ind.receivableDays * 1.2;
    out.push({
      id: 'collections',
      ask: `"Customers take ${fmtR(dso, (x) => `${Math.round(x)} days`)} to pay you; the norm is ${ind.receivableDays}. Is collecting money a problem?"`,
      options: [
        { id: 'problem', text: 'Yes: customers pay noticeably slower than normal.' },
        { id: 'fine', text: 'No: you are paid about as fast as usual or faster.' },
        { id: 'unrelated', text: 'It is unrelated to cash.' },
      ],
      answer: slow ? 'problem' : 'fine',
      explain: 'Receivable days are how long customers take to pay. The longer they take, the more of your cash is tied up in unpaid invoices.',
    });
  } else {
    const high = gear !== null && gear > 0.5;
    out.push({
      id: 'gearing',
      ask: `"Your gearing is ${fmtR(gear, (x) => `${Math.round(x * 100)}%`)}. Are you leaning too heavily on borrowing?"`,
      options: [
        { id: 'yes', text: 'Yes: more than half your funding is borrowed.' },
        { id: 'no', text: 'No: borrowing is half or less of your funding.' },
        { id: 'na', text: 'Gearing is about stock, not debt.' },
      ],
      answer: high ? 'yes' : 'no',
      explain: 'Gearing is the share of your long-term funding that is borrowed. High gearing magnifies both gains and risks.',
    });
  }
  return out;
}
export const INTERVIEW_GEMS = 10;
export const interviewKey = (s: GameState): string => `${s.seedLabel}:${Math.floor(s.month / 12)}`;

// ---------------------------------------------------------------------------------------------
// Tax season sprint: sort the items on a tax return, against the clock
// ---------------------------------------------------------------------------------------------
export type TaxBin = 'income' | 'allowed' | 'notAllowed';
export interface TaxItem { id: string; text: string; bin: TaxBin; why: string }
export const TAX_ITEMS: TaxItem[] = [
  { id: 'sales', text: 'Sales to customers', bin: 'income', why: 'Sales are taxable income.' },
  { id: 'interestIn', text: 'Interest earned on a deposit', bin: 'income', why: 'Interest you earn is taxable income.' },
  { id: 'grant', text: 'A grant for innovation', bin: 'income', why: 'Grants are normally taxable income.' },
  { id: 'wages', text: 'Staff wages', bin: 'allowed', why: 'Wages are an allowable business expense.' },
  { id: 'rent', text: 'Office rent', bin: 'allowed', why: 'Rent is an allowable expense.' },
  { id: 'advert', text: 'Advertising', bin: 'allowed', why: 'Marketing is an allowable expense.' },
  { id: 'insurance', text: 'Business insurance', bin: 'allowed', why: 'Insurance for the business is allowable.' },
  { id: 'deprec', text: 'Depreciation of equipment', bin: 'notAllowed', why: 'Accounting depreciation is not deductible; capital allowances replace it.' },
  { id: 'dividend', text: 'Dividends paid to owners', bin: 'notAllowed', why: 'Dividends are a share of profit, not a business expense.' },
  { id: 'fine', text: 'A parking fine for the company van', bin: 'notAllowed', why: 'Fines and penalties are never deductible.' },
  { id: 'entertain', text: 'Entertaining clients', bin: 'notAllowed', why: 'Client entertaining is not deductible.' },
  { id: 'loanRepay', text: 'Repaying a loan (the principal)', bin: 'notAllowed', why: 'Repaying debt is not an expense. (Interest on it is.)' },
];
export const SPRINT_SECONDS = 60;
export const SPRINT_ITEMS = 10;
export function sprintOf(day: string): TaxItem[] {
  const r = gen(`sprint|${day}`);
  return shuffled(r, TAX_ITEMS).slice(0, SPRINT_ITEMS);
}
/** Points: 10 for each right answer, minus 5 for a wrong one, never below zero. Up to 100. */
export function sprintScore(items: readonly TaxItem[], answers: Record<string, TaxBin>): { right: number; wrong: number; points: number } {
  let right = 0;
  let wrong = 0;
  for (const it of items) {
    const a = answers[it.id];
    if (a === undefined) continue;
    if (a === it.bin) right++; else wrong++;
  }
  return { right, wrong, points: Math.max(0, right * 10 - wrong * 5) };
}
export const sprintGems = (points: number): number => (points >= 90 ? 15 : points >= 60 ? 8 : points >= 30 ? 3 : 0);
