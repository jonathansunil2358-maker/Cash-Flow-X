import type { Pence } from '../money';
import { formatGBP } from '../money';
import { trailingPL } from './metrics';
import { logItem, type GameState } from './state';

/**
 * Board meetings: every quarter the board sets a profit target a little above the last quarter and,
 * three months later, judges you against it. Beat it and the team and your reputation lift; miss it
 * and the board leans on you. Consecutive hits build a streak.
 */
export interface BoardState {
  /** Profit the board expects for the quarter that ends at the next meeting. */
  target: Pence;
  /** Month number of the next meeting. */
  due: number;
  hits: number;
  misses: number;
  streak: number;
  last: 'hit' | 'miss' | null;
  /** Profit actually made in the last judged quarter. */
  lastActual: Pence;
}

export const BOARD_FIRST_MONTH = 3;
export const BOARD_GROWTH = 1.05;
export const BOARD_HIT = { reputation: 2, morale: 3 };
export const BOARD_MISS = { reputation: 1, morale: 2 };
export const STREAK_BONUS_EVERY = 4;
export const STREAK_BONUS_REPUTATION = 3;

/** Profit the board asks for next: 5% more than the last quarter, or a smaller loss if it lost money. */
export function boardTarget(s: GameState): Pence {
  const actual = trailingPL(s, 3).summary.profit;
  return actual > 0 ? Math.round(actual * BOARD_GROWTH) : Math.round(actual * 0.8);
}

/** Called at the start of every third month: judge the last quarter, then set the next target. */
export function advanceBoard(s: GameState, simulation: boolean): void {
  if (s.month < BOARD_FIRST_MONTH || s.month % 3 !== 0) return;
  const t = trailingPL(s, 3);
  if (t.months < 3) return;
  const actual = t.summary.profit;
  const b = s.board;
  if (b && s.month >= b.due) {
    const hit = actual >= b.target;
    s.board = { ...b, hits: b.hits + (hit ? 1 : 0), misses: b.misses + (hit ? 0 : 1), streak: hit ? b.streak + 1 : 0, last: hit ? 'hit' : 'miss', lastActual: actual };
    if (hit) {
      s.reputation = Math.min(100, s.reputation + BOARD_HIT.reputation);
      s.morale = Math.min(100, s.morale + BOARD_HIT.morale);
      if (s.board.streak % STREAK_BONUS_EVERY === 0) s.reputation = Math.min(100, s.reputation + STREAK_BONUS_REPUTATION);
      if (!simulation) {
        logItem(s, 'milestone', 'The board is pleased',
          `Quarterly profit ${formatGBP(actual)} against a ${formatGBP(b.target)} target. ${s.board.streak > 1 ? `${s.board.streak} quarters in a row.` : 'Reputation and morale rise.'}`);
      }
    } else {
      s.reputation = Math.max(0, s.reputation - BOARD_MISS.reputation);
      s.morale = Math.max(0, s.morale - BOARD_MISS.morale);
      if (!simulation) logItem(s, 'warning', 'The board is unhappy', `Quarterly profit ${formatGBP(actual)} against a ${formatGBP(b.target)} target. The board wants answers next quarter.`);
    }
  }
  const prev = s.board;
  s.board = { target: boardTarget(s), due: s.month + 3, hits: prev?.hits ?? 0, misses: prev?.misses ?? 0, streak: prev?.streak ?? 0, last: prev?.last ?? null, lastActual: prev?.lastActual ?? actual };
}
