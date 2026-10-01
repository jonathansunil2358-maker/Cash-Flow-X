import { formatGBP } from '../money';
import { plSummary } from '../ledger/statements';
import { INDUSTRIES } from './industries';
import { monthLabel, type GameState } from './state';

/** A short narrated recap of a company's life, built from its real history. Read-only: it never changes the game. */
export interface Scene { heading: string; text: string }
export interface Documentary { title: string; scenes: Scene[] }

export function documentaryOf(s: GameState): Documentary {
  const ind = INDUSTRIES[s.industryId];
  const pls = s.history.map((r) => ({ month: r.month, ...plSummary(r.period.pl) }));
  const scenes: Scene[] = [];
  scenes.push({ heading: 'The beginning', text: `${s.companyName} opened its doors as a ${ind.name.toLowerCase()} business with big plans and not much money.` });
  if (pls.length) {
    const best = pls.reduce((a, b) => (b.revenue > a.revenue ? b : a));
    const worst = pls.reduce((a, b) => (b.profit < a.profit ? b : a));
    scenes.push({ heading: 'The high point', text: `${monthLabel(best.month)} was the best month for sales: ${formatGBP(best.revenue, { compact: true })} came in.` });
    scenes.push({ heading: 'The hard times', text: worst.profit < 0 ? `${monthLabel(worst.month)} was the toughest: a loss of ${formatGBP(-worst.profit, { compact: true })}. The team pulled together.` : 'Not a single month ended in a loss. A rare and impressive record.' });
  }
  const moments = s.log.filter((l) => l.kind === 'milestone').slice(0, 4);
  if (moments.length) scenes.push({ heading: 'Moments that mattered', text: moments.map((m) => `${monthLabel(m.month)}: ${m.title}.`).join(' ') });
  if ((s.awards?.length ?? 0) > 0) scenes.push({ heading: 'Recognition', text: `The company won ${s.awards!.length} award${s.awards!.length === 1 ? '' : 's'} along the way.` });
  if ((s.bossesBeaten ?? 0) > 0) scenes.push({ heading: 'Tested and passed', text: `${s.bossesBeaten} boss round${s.bossesBeaten === 1 ? '' : 's'} faced down and beaten.` });
  const value = s.history.at(-1)?.valuation?.equityValue ?? 0;
  const end = s.status === 'insolvent' ? 'The money ran out in the end, but the story was a good one.'
    : s.status === 'prestiged' ? 'The founder sold up and moved on to bigger things.'
      : s.status === 'finished' ? 'The final chapter closed with the company still standing.' : 'The story is still being written.';
  scenes.push({ heading: 'The ending', text: `${end} The company was worth about ${formatGBP(value, { compact: true })} at the close.` });
  return { title: `${s.companyName}: the documentary`, scenes };
}
