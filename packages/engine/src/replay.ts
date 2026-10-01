import { applyActionInPlace, type Action } from './actions';
import { newGame, type EquipmentFinance } from './game';
import type { DifficultyId } from './model/difficulty';
import type { IndustryId } from './model/industries';
import type { ActiveBoost, PerkLevels } from './model/perks';
import type { GameState } from './model/state';
import { tickInPlace } from './tick';

export interface RunSubmission {
  seed: string;
  industryId: IndustryId;
  scenarioId: string;
  companyName: string;
  difficulty?: DifficultyId;
  equipmentFinance?: EquipmentFinance;
  perks?: PerkLevels;
  boosts?: ActiveBoost[];
  prestigeLevel?: number;
  icon?: string;
  actions: { month: number; action: Action }[];
  /** Number of months played (the state's month counter at submission). */
  months: number;
}

/** Everything needed to rebuild a run: its seed, how it began, and every decision since. */
export function toSubmission(s: GameState): RunSubmission {
  return {
    seed: s.seedLabel,
    industryId: s.industryId,
    scenarioId: s.scenarioId,
    companyName: s.companyName,
    difficulty: s.difficulty,
    equipmentFinance: s.start.equipmentFinance,
    perks: s.perks,
    boosts: s.start.boosts,
    // The rank the company started with: prestiges done during the run are replayed from the action log.
    prestigeLevel: (s.prestigeLevel ?? 0) - s.actionLog.filter((a) => (a.action as { type?: string }).type === 'prestige').length,
    icon: s.icon,
    actions: s.actionLog as { month: number; action: Action }[],
    months: s.month,
  };
}

/**
 * Deterministically re-run a game from its seed and action log. Works on a single mutable draft
 * (no per-step cloning) so a long game replays in milliseconds: this is what the leaderboard
 * Worker uses to verify submitted scores.
 */
export function replay(sub: RunSubmission): GameState {
  const s = newGame({
    companyName: sub.companyName, industryId: sub.industryId, seed: sub.seed, scenarioId: sub.scenarioId,
    difficulty: sub.difficulty, equipmentFinance: sub.equipmentFinance, perks: sub.perks, boosts: sub.boosts,
    prestigeLevel: sub.prestigeLevel, icon: sub.icon,
  });
  const actions = [...sub.actions];
  let i = 0;
  for (let k = 0; k < actions.length - 1; k++) {
    if (actions[k].month > actions[k + 1].month) throw new Error('Action log is not in chronological order.');
  }
  while (s.status === 'playing' && s.month < sub.months) {
    while (i < actions.length && actions[i].month === s.month) applyActionInPlace(s, actions[i++].action);
    if (i < actions.length && actions[i].month < s.month) throw new Error('Action log contains an action for a past month.');
    if (s.status !== 'playing') break;
    if (s.pendingEvent) throw new Error(`Action log is missing the decision for "${s.pendingEvent.title}".`);
    tickInPlace(s, { fast: true });
  }
  while (i < actions.length && actions[i].month === s.month && s.status === 'playing') applyActionInPlace(s, actions[i++].action);
  if (i < actions.length) throw new Error('Action log contains actions that could not be applied.');
  if (s.month !== sub.months) throw new Error(`Replay ended at month ${s.month}, submission claims ${sub.months}.`);
  return s;
}
