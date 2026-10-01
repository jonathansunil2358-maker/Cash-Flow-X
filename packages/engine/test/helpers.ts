import { newGame, tickInPlace, type GameState, type IndustryId, type NewGameOptions } from '../src/index';
import { applyPolicy } from '../scripts/policy';

/** Play `months` months with the heuristic policy, mutating and returning a fresh game. */
export function playPolicy(industryId: IndustryId, seed: string, months: number, scenarioId?: string, extra: Partial<NewGameOptions> = {}): GameState {
  const s = newGame({ companyName: 'Test Co', industryId, seed, scenarioId, difficulty: 'easy', ...extra });
  for (let i = 0; i < months && s.status === 'playing'; i++) {
    applyPolicy(s);
    tickInPlace(s);
  }
  return s;
}

/** Play with the heuristic policy until `done` (answering any decisions), or give up after `maxMonths`. */
export function playUntil(industryId: IndustryId, seed: string, maxMonths: number, done: (s: GameState) => boolean, extra: Partial<NewGameOptions> = {}): GameState {
  const s = newGame({ companyName: 'Test Co', industryId, seed, difficulty: 'easy', ...extra });
  for (let i = 0; i < maxMonths && s.status === 'playing' && !done(s); i++) {
    applyPolicy(s);
    tickInPlace(s);
  }
  if (s.pendingEvent) applyPolicy(s);
  return s;
}
