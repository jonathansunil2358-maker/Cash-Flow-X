import { formatGBP } from '../money';
import { plSummary } from '../ledger/statements';
import { INDUSTRIES } from './industries';
import { monthLabel, type GameState } from './state';

/**
 * The island radio: a short news bulletin built only from your real numbers, plus an advert for your own brand.
 * Pure text: the browser may read it aloud, but nothing here changes the game.
 */
export interface Bulletin { headline: string; lines: string[]; ad: string }
const SLOGANS: Record<string, string> = {
  software: 'Software that just works.', restaurant: 'Come hungry, leave happy.', ecommerce: 'Delivered to your door.', fitness: 'Feel the difference.',
  clothing: 'Wear what you love.', automotive: 'Drive away happy.',
};
export function bulletinOf(s: GameState): Bulletin {
  const last = s.history.at(-1);
  const prev = s.history.at(-2);
  const ind = INDUSTRIES[s.industryId];
  const lines: string[] = [];
  const when = monthLabel(s.month);
  if (last) {
    const r = plSummary(last.period.pl);
    const p = prev ? plSummary(prev.period.pl) : null;
    lines.push(`${s.companyName} took ${formatGBP(r.revenue, { compact: true })} in sales last month${p && p.revenue > 0 ? `, ${r.revenue >= p.revenue ? 'up' : 'down'} ${Math.abs(Math.round(((r.revenue - p.revenue) / p.revenue) * 100))}% on the month before` : ''}.`);
    lines.push(r.profit >= 0 ? `The company made a profit of ${formatGBP(r.profit, { compact: true })}.` : `The company made a loss of ${formatGBP(-r.profit, { compact: true })}.`);
    lines.push(`It has ${Math.round(last.kpis.customers).toLocaleString('en-GB')} ${ind.unitPlural.toLowerCase()} on its books and ${last.kpis.utilisation > 0.9 ? 'is running close to capacity' : 'has room to grow'}.`);
  } else lines.push(`${s.companyName} is open for business and the island is waiting.`);
  const econ = s.economy.demandMult;
  lines.push(econ < 0.97 ? 'In the wider economy, shoppers are cautious.' : econ > 1.03 ? 'In the wider economy, shoppers are in a spending mood.' : 'The wider economy is steady.');
  const top = s.competitors[0];
  if (top) lines.push(`Rival ${top.name} is ${top.price < s.price ? 'undercutting' : 'pricing above'} you this month.`);
  if (s.reputation >= 70) lines.push('Customers speak very warmly of the company.');
  else if (s.reputation < 40) lines.push('Customer opinion is not what it was.');
  const headline = last && plSummary(last.period.pl).profit >= 0 ? `Business is good at ${s.companyName}` : `Tough times at ${s.companyName}`;
  return { headline: `${when}: ${headline}`, lines: lines.slice(0, 5), ad: `This bulletin is brought to you by ${s.companyName}. ${SLOGANS[s.industryId] ?? 'Quality you can trust.'}` };
}
export const bulletinText = (b: Bulletin): string => `${b.headline}. ${b.lines.join(' ')} ${b.ad}`;
