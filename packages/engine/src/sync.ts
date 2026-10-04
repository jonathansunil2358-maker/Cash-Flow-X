import { applyActionInPlace, type Action } from './actions';
import type { Balances } from './ledger/accounts';
import type { GameState } from './model/state';
import { tickInPlace } from './tick';

/**
 * Chunked verification. The server keeps a compact checkpoint of each run and, on every sync,
 * replays only the decisions made since the last one. Checkpoints drop the display-only parts of
 * the state (journal, news log) and months of history the simulation never looks back at.
 */

/** The simulation never reads further back than 24 months (revenue growth); keep a margin. */
export const CHECKPOINT_HISTORY = 36;

export function compactForServer(s: GameState): GameState {
  const c = structuredClone(s);
  c.ledger.journal = [];
  c.log = [];
  c.actionLog = [];
  c.history = c.history.slice(-CHECKPOINT_HISTORY);
  return c;
}

/** FNV-1a over the numbers that define a run's position: month, RNG, status and every balance. */
export function stateChecksum(s: GameState): string {
  let h = 2166136261;
  const mix = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  };
  mix(`${s.month}|${s.rng}|${s.status}|${s.shares.total}|${s.shares.owner}`);
  const b: Balances = s.ledger.balances;
  for (const k of Object.keys(b).sort()) mix(`|${k}:${b[k as keyof Balances]}`);
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface ContinueResult {
  /** Actions applied from the batch. */
  applied: number;
}

/**
 * Continue a run from `s` (mutated): apply `actions` in order, closing months as their month
 * numbers advance, and stop at `toMonth` with every remaining action for that month applied.
 * Throws if the log is out of order, skips a pending decision, or cannot be applied.
 */
export function continueRun(s: GameState, actions: { month: number; action: Action }[], toMonth: number): ContinueResult {
  if (toMonth < s.month) throw new Error(`Sync goes backwards: run is at month ${s.month}, sync claims ${toMonth}.`);
  for (let k = 0; k < actions.length - 1; k++) {
    if (actions[k].month > actions[k + 1].month) throw new Error('Action log is not in chronological order.');
  }
  let i = 0;
  while (true) {
    while (i < actions.length && actions[i].month === s.month) {
      if (s.status !== 'playing') throw new Error('Action log continues after the run ended.');
      applyActionInPlace(s, actions[i++].action);
    }
    if (i < actions.length && actions[i].month < s.month) throw new Error('Action log contains an action for a past month.');
    if (s.month >= toMonth || s.status !== 'playing') break;
    if (s.pendingEvent) throw new Error(`Action log is missing the decision for "${s.pendingEvent.title}".`);
    tickInPlace(s, { fast: true });
  }
  if (i < actions.length) throw new Error('Action log contains actions that could not be applied.');
  if (s.month !== toMonth) throw new Error(`Replay ended at month ${s.month}, sync claims ${toMonth}.`);
  return { applied: i };
}

/**
 * Version of the game rules. Bump whenever a change alters simulation results, so the server can
 * refuse to verify runs from an outdated client (their replays would not match).
 */
export const RULES_VERSION = 18;
