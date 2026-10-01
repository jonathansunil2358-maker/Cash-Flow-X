import { hashSeed } from '../rng';
import { plSummary } from '../ledger/statements';
import { monthOfYear, type GameState } from './state';

/**
 * Mood and feel. Everything here is read-only presentation: it never changes the simulation, so the
 * server's replay is unaffected.
 */

/** Music follows how the company is doing. */
export type MusicMood = 'calm' | 'upbeat' | 'tense';
export function musicMood(s: GameState): MusicMood {
  if (s.status !== 'playing') return 'calm';
  const cash = s.ledger.balances.cash;
  const last = s.history.at(-1);
  const profit = last ? plSummary(last.period.pl).profit : 0;
  if (cash < 0) return 'tense';
  const monthlyCost = last ? Math.max(1, plSummary(last.period.pl).revenue - profit) : 1;
  if (last && cash < monthlyCost * 1.5) return 'tense';
  if (profit > 0) return 'upbeat';
  return 'calm';
}

/** Weather comes from the calendar month and the company's seed: the same company always has the same year. */
export type Weather = 'clear' | 'rain' | 'snow' | 'dusk';
export function weatherFor(s: Pick<GameState, 'month' | 'seedLabel'>): Weather {
  const m = monthOfYear(s.month);
  const roll = (hashSeed(`${s.seedLabel}|w${s.month}`) % 1000) / 1000;
  const winter = m === 11 || m === 0 || m === 1;
  if (winter) return roll < 0.45 ? 'snow' : roll < 0.65 ? 'rain' : 'clear';
  const autumn = m >= 8 && m <= 10;
  if (autumn) return roll < 0.45 ? 'rain' : roll < 0.65 ? 'dusk' : 'clear';
  if (m >= 5 && m <= 7) return roll < 0.2 ? 'rain' : roll < 0.3 ? 'dusk' : 'clear';
  return roll < 0.35 ? 'rain' : 'clear';
}

// ---------------------------------------------------------------------------------------------
// Firsts worth a party
// ---------------------------------------------------------------------------------------------
export interface Milestone { id: string; title: string; text: string }
export const MILESTONES: Milestone[] = [
  { id: 'firstProfit', title: 'First profitable month', text: 'The business made money. This is how it starts.' },
  { id: 'million', title: 'A million pounds of value', text: 'Your company is now worth £1m.' },
  { id: 'tenMillion', title: 'Ten million pounds of value', text: 'Your company is now worth £10m. Serious money.' },
  { id: 'firstAward', title: 'First award', text: 'The trophy hall has its first cup.' },
  { id: 'prestige', title: 'A new rank', text: 'You have prestiged. The company carries on, stronger.' },
];

/** Milestones the company has already reached. */
export function milestonesReached(s: GameState): string[] {
  const out: string[] = [];
  if (s.history.some((h) => plSummary(h.period.pl).profit > 0)) out.push('firstProfit');
  const value = s.history.at(-1)?.valuation?.equityValue ?? 0;
  if (value >= 1_000_000_00) out.push('million');
  if (value >= 10_000_000_00) out.push('tenMillion');
  if ((s.awards?.length ?? 0) > 0) out.push('firstAward');
  if ((s.prestigeLevel ?? 0) > 0) out.push('prestige');
  return out;
}

/**
 * The milestones to celebrate now. A player who has never been tracked before gets theirs recorded
 * silently, so an old save does not throw a pile of parties at once.
 */
export function newMilestones(s: GameState, seen: readonly string[] | undefined): { celebrate: Milestone[]; seen: string[] } {
  const reached = milestonesReached(s);
  if (!seen) return { celebrate: [], seen: reached };
  const fresh = reached.filter((id) => !seen.includes(id));
  return { celebrate: MILESTONES.filter((m) => fresh.includes(m.id)), seen: [...seen, ...fresh] };
}
