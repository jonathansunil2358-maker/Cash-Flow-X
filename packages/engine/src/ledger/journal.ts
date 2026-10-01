import type { Pence } from '../money';
import { ACCOUNTS, emptyBalances, isPL, type AccountId, type Balances } from './accounts';

/** Signed amount: debit positive, credit negative. */
export interface JournalLine {
  account: AccountId;
  amount: Pence;
}

/**
 * How the cash movement in an entry is classified in the cash flow statement.
 * Interest paid and received are classified as operating (an IAS 7 policy choice), which lets
 * every P&L-bearing entry live in the operating section.
 */
export type CfCategory = 'operating' | 'investing' | 'financing' | 'none';

export interface JournalEntry {
  id: number;
  month: number;
  memo: string;
  cf: CfCategory;
  cfLabel?: string;
  kind?: 'opening' | 'closing';
  lines: JournalLine[];
}

/**
 * Running totals for the open period. Statements are derived from these, which in turn are
 * derived only from posted entries: nothing in the engine edits a balance directly.
 */
export interface PeriodAccumulator {
  openingCash: Pence;
  /** P&L movements (signed, debit positive) excluding year-end closing entries. */
  pl: Partial<Record<AccountId, Pence>>;
  /** Cash effect of non-cash lines in operating entries, by account (indirect method). */
  operating: Partial<Record<AccountId, Pence>>;
  investing: Record<string, Pence>;
  financing: Record<string, Pence>;
}

export interface Ledger {
  balances: Balances;
  journal: JournalEntry[];
  nextId: number;
  period: PeriodAccumulator;
}

export const MAX_JOURNAL = 1500;
const JOURNAL_TRIM_BATCH = 300;

export class LedgerError extends Error {}

export function emptyPeriod(openingCash: Pence): PeriodAccumulator {
  return { openingCash, pl: {}, operating: {}, investing: {}, financing: {} };
}

export function createLedger(): Ledger {
  return { balances: emptyBalances(), journal: [], nextId: 1, period: emptyPeriod(0) };
}

export interface PostOptions {
  cf: CfCategory;
  cfLabel?: string;
  kind?: 'opening' | 'closing';
}

const add = <K extends string>(map: Partial<Record<K, number>>, key: K, v: number) => {
  map[key] = (map[key] ?? 0) + v;
};

/**
 * Post a journal entry. Rejects anything that would break double entry:
 * - debits must equal credits exactly (integer pence)
 * - P&L lines may only appear in operating entries (or the year-end close), so the indirect
 *   cash flow can start from profit for the period
 * - 'none' entries may not move cash (except the opening balance entry)
 */
export function post(
  ledger: Ledger,
  month: number,
  memo: string,
  lines: JournalLine[],
  opts: PostOptions,
): JournalEntry | null {
  const merged = new Map<AccountId, Pence>();
  for (const l of lines) {
    if (!(l.account in ACCOUNTS)) throw new LedgerError(`Unknown account "${l.account}" in "${memo}"`);
    if (!Number.isInteger(l.amount)) throw new LedgerError(`Non-integer amount ${l.amount} on ${l.account} in "${memo}"`);
    merged.set(l.account, (merged.get(l.account) ?? 0) + l.amount);
  }
  const clean: JournalLine[] = [...merged.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([account, amount]) => ({ account, amount }));
  if (clean.length === 0) return null;

  const total = clean.reduce((s, l) => s + l.amount, 0);
  if (total !== 0) throw new LedgerError(`Unbalanced entry "${memo}": debits and credits differ by ${total}p`);

  const hasPL = clean.some((l) => isPL(l.account));
  if (hasPL && opts.cf !== 'operating' && opts.kind !== 'closing') {
    throw new LedgerError(`P&L lines must be posted in operating entries ("${memo}")`);
  }
  const cashLine = clean.find((l) => l.account === 'cash');
  if (cashLine && opts.cf === 'none' && opts.kind !== 'opening') {
    throw new LedgerError(`Entry "${memo}" moves cash but has no cash flow classification`);
  }

  for (const l of clean) ledger.balances[l.account] += l.amount;

  const p = ledger.period;
  if (opts.kind !== 'opening' && opts.kind !== 'closing') {
    for (const l of clean) if (isPL(l.account)) add(p.pl, l.account, l.amount);
    const cash = cashLine?.amount ?? 0;
    if (opts.cf === 'operating') {
      for (const l of clean) if (l.account !== 'cash') add(p.operating, l.account, -l.amount);
    } else if (opts.cf === 'investing' && cash !== 0) {
      add(p.investing, opts.cfLabel ?? memo, cash);
    } else if (opts.cf === 'financing' && cash !== 0) {
      add(p.financing, opts.cfLabel ?? memo, cash);
    }
  }

  const entry: JournalEntry = { id: ledger.nextId++, month, memo, cf: opts.cf, lines: clean };
  if (opts.cfLabel) entry.cfLabel = opts.cfLabel;
  if (opts.kind) entry.kind = opts.kind;
  ledger.journal.push(entry);
  // Trim in batches: splicing the front of a full array on every post is O(n) per entry.
  if (ledger.journal.length > MAX_JOURNAL + JOURNAL_TRIM_BATCH) ledger.journal.splice(0, ledger.journal.length - MAX_JOURNAL);
  return entry;
}

/** Start a new period (month) with the current cash balance as its opening cash. */
export function resetPeriod(ledger: Ledger): void {
  ledger.period = emptyPeriod(ledger.balances.cash);
}

/** Convenience helpers for building lines. */
export const dr = (account: AccountId, amount: Pence): JournalLine => ({ account, amount });
export const cr = (account: AccountId, amount: Pence): JournalLine => ({ account, amount: -amount });

export function trialBalanceTotal(balances: Balances): Pence {
  let t = 0;
  for (const k in balances) t += balances[k as AccountId];
  return t;
}
