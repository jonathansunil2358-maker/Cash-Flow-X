import { formatGBP } from '../money';
import { checkIntegrity } from '../integrity';
import { ratios } from './analysis';
import { industryOf } from './industries';
import { logItem, yearOf, type GameState } from './state';

/**
 * Audit day: once a year the auditors go through the books. Every finding is something a real
 * auditor would raise, and is explained in plain words. A clean audit raises your reputation; findings
 * lower it a little. It uses only the books as they stand, so there is no randomness.
 */
export interface Finding { id: string; title: string; detail: string; fix: string }

export function auditOf(s: GameState): Finding[] {
  const out: Finding[] = [];
  const b = s.ledger.balances;
  const ind = industryOf(s);
  const all = ratios(s);
  const r = (id: string): number | null => all.find((x) => x.id === id)?.value ?? null;

  if (checkIntegrity(s).length) out.push({ id: 'books', title: 'The books do not agree with each other', detail: 'A register and the ledger disagree.', fix: 'This should never happen. Please report it.' });
  if (s.tax.due > 0 && s.tax.dueMonth !== null && s.month > s.tax.dueMonth) {
    out.push({ id: 'tax', title: 'Tax is overdue', detail: `${formatGBP(s.tax.due)} of corporation tax was due in month ${s.tax.dueMonth + 1}.`, fix: 'Pay tax on its due date: interest and penalties are pure waste.' });
  }
  if (b.cash < 0) out.push({ id: 'overdraft', title: 'The company is living in its overdraft', detail: `The bank balance is ${formatGBP(b.cash)}.`, fix: 'Overdrafts are the most expensive money there is. Raise cash or cut costs.' });
  const dso = r('dso');
  if (dso !== null && ind.receivableDays > 0 && dso > ind.receivableDays * 1.5) {
    out.push({ id: 'receivables', title: 'Customers are paying very late', detail: `They take ${Math.round(dso)} days to pay; normal for your sector is ${ind.receivableDays}.`, fix: 'Shorten your credit terms, or chase invoices sooner.' });
  }
  const dio = r('dio');
  if (dio !== null && dio > ind.benchmarks.inventoryDays * 1.6) {
    out.push({ id: 'stock', title: 'A lot of stock is sitting unsold', detail: `Stock lasts ${Math.round(dio)} days; normal is ${ind.benchmarks.inventoryDays}.`, fix: 'Lower your stock cover. Old stock may need writing down.' });
  }
  if (s.loans.some((l) => l.consecutiveBreaches > 0)) {
    out.push({ id: 'covenant', title: 'A loan covenant is being broken', detail: 'The bank has noticed that a ratio is outside what the loan agreement allows.', fix: 'Bring debt down against earnings, or repay the loan.' });
  }
  return out;
}

/** A yearly audit at the start of each new year (month 12, 24...). Reputation moves a little. */
export function advanceAudit(s: GameState, simulation: boolean): void {
  if (s.month < 12 || s.month % 12 !== 0) return;
  const findings = auditOf(s);
  const clean = findings.length === 0;
  s.reputation = Math.max(0, Math.min(100, s.reputation + (clean ? 3 : -Math.min(3, findings.length))));
  s.audits = [...(s.audits ?? []), { year: yearOf(s.month) - 1, findings: findings.map((f) => f.id), clean }].slice(-6);
  if (!simulation) {
    logItem(s, clean ? 'milestone' : 'notice', clean ? 'A clean audit' : `The auditors raised ${findings.length} point${findings.length === 1 ? '' : 's'}`,
      clean ? 'The auditors found nothing to complain about. Reputation +3.' : `${findings.map((f) => f.title).join('; ')}. Reputation ${findings.length > 3 ? -3 : -findings.length}.`);
  }
}
