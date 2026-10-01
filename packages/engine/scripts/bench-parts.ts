/** Where does replay time go? Times the per-month building blocks on a finished 10-year game. */
import { checkIntegrity, currentBalanceSheet, demandFor, industryOf, modifiersOf, overdraftLimit, replay, toSubmission, valuationOf, ytdPL } from '../src/index';
import { playPolicy } from '../test/helpers';

const s = playPolicy('software', 'BENCH', 120);
const sub = toSubmission(s);
const time = (label: string, n: number, fn: () => unknown) => {
  for (let i = 0; i < 20; i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) fn();
  console.log(`${label.padEnd(22)} ${(((performance.now() - t0) / n) * 120).toFixed(2)} ms per 120 calls`);
};
time('replay (whole game)', 20, () => replay(sub));
const ind = industryOf(s);
time('valuationOf', 500, () => valuationOf(s));
time('checkIntegrity', 500, () => checkIntegrity(s, s.history.at(-1)));
time('ytdPL', 500, () => ytdPL(s));
time('currentBalanceSheet', 500, () => currentBalanceSheet(s));
time('demandFor', 500, () => demandFor(s, ind));
time('overdraftLimit', 500, () => overdraftLimit(s));
time('modifiersOf', 500, () => modifiersOf(s));
time('structuredClone(state)', 50, () => structuredClone(s));
console.log('journal entries', s.ledger.journal.length, 'log', s.log.length, 'history', s.history.length);
