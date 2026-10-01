/**
 * Money is stored as integer pence everywhere in the engine. Floats never enter the ledger:
 * every calculation that produces a money amount must round to a whole number of pence
 * before it is posted.
 */
export type Pence = number;

export const gbp = (pounds: number): Pence => Math.round(pounds * 100);
export const toPounds = (p: Pence): number => p / 100;

/** Multiply a money amount by a factor, rounding to the nearest penny. */
export const scale = (p: Pence, factor: number): Pence => Math.round(p * factor);

export const sum = (values: Pence[]): Pence => values.reduce((a, b) => a + b, 0);

/**
 * Split an integer amount into integer parts proportional to `weights`, preserving the exact
 * total (largest-remainder method). Used for payment schedules and pro-rata write-offs so that
 * subledgers always reconcile to the control account to the penny.
 */
export function allocate(total: Pence, weights: number[]): Pence[] {
  if (!Number.isInteger(total)) throw new Error(`allocate: total must be integer pence, got ${total}`);
  const weightSum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (weights.length === 0 || weightSum <= 0) {
    if (total === 0) return weights.map(() => 0);
    throw new Error('allocate: cannot allocate a non-zero amount across zero weights');
  }
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const raw = weights.map((w) => (abs * Math.max(0, w)) / weightSum);
  const parts = raw.map((r) => Math.floor(r));
  let remainder = abs - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ frac: r - Math.floor(r), i }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0; k++, remainder--) parts[order[k % order.length].i] += 1;
  return parts.map((p) => p * sign);
}

const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** £1,234 / -£1,234. `compact` gives £1.2k, £3.4m. */
export function formatGBP(p: Pence, opts: { compact?: boolean; pence?: boolean } = {}): string {
  const pounds = p / 100;
  const neg = pounds < 0;
  const abs = Math.abs(pounds);
  let body: string;
  if (opts.compact && abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}m`;
  else if (opts.compact && abs >= 10_000) body = `${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  else body = opts.pence ? nf2.format(abs) : nf0.format(abs);
  return `${neg ? '-' : ''}£${body}`;
}

/** Whole number with thousands separators (cached formatter: toLocaleString is slow). */
export const formatInt = (n: number): string => nf0.format(Math.round(n));

/** Accounting presentation: whole pounds, negatives in brackets, zero as a dash. */
export function formatAccounting(p: Pence): string {
  const pounds = Math.round(p / 100);
  if (pounds === 0) return '–';
  const body = nf0.format(Math.abs(pounds));
  return pounds < 0 ? `(${body})` : body;
}

export function formatPct(x: number, decimals = 1): string {
  if (!Number.isFinite(x)) return 'n/a';
  return `${(x * 100).toFixed(decimals)}%`;
}
