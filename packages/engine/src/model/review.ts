import { formatGBP, type Pence } from '../money';
import { plSummary } from '../ledger/statements';
import { AWARDS } from './awards';
import { monthLabel, yearOf, type GameState } from './state';

/** A look back at the year that has just finished, shown once when a new year begins. */
export interface YearReview {
  year: number;
  companyName: string;
  revenue: Pence;
  profit: Pence;
  growth: number | null;
  best: { label: string; revenue: Pence } | null;
  worst: { label: string; profit: Pence } | null;
  awards: string[];
  boardHits: number | null;
  headline: string;
  lines: string[];
}

/** The review for the 12 closed months before `s.month` (which must be a multiple of 12, at least 12). */
export function yearReview(s: GameState): YearReview | null {
  if (s.month < 12 || s.month % 12 !== 0 || s.history.length < 12) return null;
  const months = s.history.slice(-12);
  const pls = months.map((r) => plSummary(r.period.pl));
  const revenue = pls.reduce((a, p) => a + p.revenue, 0);
  const profit = pls.reduce((a, p) => a + p.profit, 0);
  let bi = 0;
  let wi = 0;
  pls.forEach((p, i) => { if (p.revenue > pls[bi].revenue) bi = i; if (p.profit < pls[wi].profit) wi = i; });
  const prev = s.history.slice(-24, -12).map((r) => plSummary(r.period.pl).revenue).reduce((a, b) => a + b, 0);
  const growth = s.history.length >= 24 && prev > 0 ? revenue / prev - 1 : null;
  const year = yearOf(s.month) - 1;
  const awards = (s.awards ?? []).filter((a) => a.year === year).map((a) => AWARDS.find((d) => d.id === a.id)?.name ?? a.id);
  const best = { label: monthLabel(months[bi].month), revenue: pls[bi].revenue };
  const worst = { label: monthLabel(months[wi].month), profit: pls[wi].profit };
  const lines = [
    `Revenue ${formatGBP(revenue, { compact: true })}${growth !== null ? ` (${growth >= 0 ? '+' : ''}${Math.round(growth * 100)}% on last year)` : ''}.`,
    `${profit >= 0 ? 'Profit' : 'Loss'} ${formatGBP(Math.abs(profit), { compact: true })} for the year.`,
    `Best month: ${best.label}, ${formatGBP(best.revenue, { compact: true })} of sales.`,
    `Toughest month: ${worst.label}, ${worst.profit >= 0 ? 'profit' : 'loss'} ${formatGBP(Math.abs(worst.profit), { compact: true })}.`,
    ...(awards.length ? [`Awards: ${awards.join(', ')}.`] : []),
    ...(s.board ? [`Board: ${s.board.hits} targets beaten, ${s.board.misses} missed in all.`] : []),
  ];
  const headline = profit > 0 ? (growth !== null && growth >= 0.25 ? 'A year of strong growth' : 'A profitable year') : 'A tough year, and you are still here';
  return { year, companyName: s.companyName, revenue, profit, growth, best, worst, awards, boardHits: s.board?.hits ?? null, headline, lines };
}
