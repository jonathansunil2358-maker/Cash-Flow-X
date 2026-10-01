import { revenueGrowth, trailingPL, annualise } from './metrics';
import { logItem, yearOf, type GameState } from './state';

/**
 * Annual awards: at each year end the company can win categories it has earned. They are logged,
 * kept on a trophy shelf, and count towards achievements. Pure cosmetics: they never change a number.
 */
export interface AwardDef {
  id: string;
  name: string;
  blurb: string;
  icon: string;
  won: (s: GameState) => boolean;
}

export interface AwardWon {
  year: number;
  id: string;
}

export const AWARDS: AwardDef[] = [
  { id: 'employer', name: 'Best Employer', blurb: 'A happy team: morale 75 or more, with at least three staff.', icon: 'heart',
    won: (s) => s.morale >= 75 && s.staff.ops + s.staff.rnd + s.staff.sales >= 3 },
  { id: 'growth', name: 'Fastest Growth', blurb: 'Revenue up 35% or more on the year before.', icon: 'rocket', won: (s) => s.history.length >= 18 && revenueGrowth(s) >= 0.35 },
  { id: 'profit', name: 'Profit Champion', blurb: 'A net margin of 15% or more over the year.', icon: 'chart',
    won: (s) => { const t = trailingPL(s, 12); return t.months >= 12 && t.summary.profit > 0 && t.summary.profit >= t.summary.revenue * 0.15; } },
  { id: 'quality', name: 'Quality Leader', blurb: 'Your product is at least 5 points better than the best rival.', icon: 'star',
    won: (s) => s.competitors.length > 0 && s.quality >= Math.max(...s.competitors.map((c) => c.quality)) + 5 },
  { id: 'cash', name: 'Cash King', blurb: 'Cash in the bank worth three months of revenue.', icon: 'coin',
    won: (s) => { const t = trailingPL(s, 12); const monthly = annualise(t.summary.revenue, t.months) / 12; return t.months >= 12 && monthly > 0 && s.ledger.balances.cash >= monthly * 3; } },
  { id: 'favourite', name: 'Customer Favourite', blurb: 'A reputation of 70 or more.', icon: 'crown', won: (s) => s.reputation >= 70 },
];
export const awardDef = (id: string): AwardDef | undefined => AWARDS.find((a) => a.id === id);

const MAX_AWARDS = 80;

/** Called at the start of each new year (month 12, 24, ...) for the year just finished. */
export function advanceAwards(s: GameState, simulation: boolean): void {
  if (s.month < 12 || s.month % 12 !== 0) return;
  const year = yearOf(s.month) - 1;
  const winners = AWARDS.filter((a) => a.won(s));
  if (!winners.length) return;
  const list = [...(s.awards ?? [])];
  for (const a of winners) list.push({ year, id: a.id });
  s.awards = list.slice(-MAX_AWARDS);
  s.reputation = Math.min(100, s.reputation + winners.length);
  if (!simulation) logItem(s, 'milestone', winners.length === 1 ? `Award: ${winners[0].name}` : `${winners.length} awards this year`, `${winners.map((a) => a.name).join(', ')}. A trophy for the shelf and a small boost to your reputation.`);
}
