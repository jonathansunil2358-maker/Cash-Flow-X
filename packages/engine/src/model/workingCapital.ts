import { allocate, type Pence } from '../money';

/**
 * Receivables and payables are held as month-bucketed queues (the subledger): index 0 is due
 * this month, index 1 next month, and so on. The sum of each queue must always equal its control
 * account in the ledger; the integrity check verifies this every month.
 *
 * Credit terms of `days` spread each invoice across buckets so that, in steady state, the
 * month-end balance equals days/30 months of billing (e.g. 45 days -> 1.5 months).
 */
export function lagWeights(days: number): number[] {
  const m = Math.max(0, days) / 30;
  const lo = Math.floor(m);
  const frac = m - lo;
  const w: number[] = new Array(lo + 2).fill(0);
  w[lo] = 1 - frac;
  w[lo + 1] = frac;
  return w;
}

export function scheduleIntoQueue(queue: Pence[], amount: Pence, days: number): void {
  if (amount === 0) return;
  const parts = allocate(amount, lagWeights(days));
  parts.forEach((p, i) => {
    while (queue.length <= i) queue.push(0);
    queue[i] += p;
  });
}

/** Remove and return the amount due this month. */
export function takeDue(queue: Pence[]): Pence {
  return queue.length ? (queue.shift() ?? 0) : 0;
}

/** Reduce a queue pro rata (bad-debt write-off), returning the exact amount removed. */
export function writeDownQueue(queue: Pence[], amount: Pence): Pence {
  const total = queue.reduce((a, b) => a + b, 0);
  const take = Math.min(Math.max(0, amount), Math.max(0, total));
  if (take === 0) return 0;
  const parts = allocate(take, queue.map((q) => Math.max(0, q)));
  parts.forEach((p, i) => (queue[i] -= p));
  return take;
}

export const queueTotal = (queue: Pence[]): Pence => queue.reduce((a, b) => a + b, 0);
