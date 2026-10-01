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
