import { logItem, type GameState } from './state';
import { addTemporaryEffect, adjustReputation } from './events';

/**
 * Boss rounds: every three years the world throws a stress test at you for four months. Come out the
 * other side with money in the bank and you earn reputation and a boss badge. There is no luck in it:
 * which test you get depends only on the year, so every player faces the same sequence.
 */
export const BOSS_EVERY = 36;
export const BOSS_MONTHS = 4;
export interface BossDef { id: string; name: string; story: string; demandMult: number; unitCostMult: number; lendingAppetite: number }
export const BOSSES: BossDef[] = [
  { id: 'credit', name: 'The credit crunch', story: 'Banks are pulling back and customers are cutting spending.', demandMult: 0.95, unitCostMult: 1, lendingAppetite: 0.6 },
  { id: 'war', name: 'The price war', story: 'A giant is slashing prices to bleed the little players dry.', demandMult: 0.92, unitCostMult: 1, lendingAppetite: 1 },
  { id: 'shock', name: 'The supply shock', story: 'Everything you buy suddenly costs more, and deliveries are late.', demandMult: 0.98, unitCostMult: 1.08, lendingAppetite: 1 },
];
export const bossFor = (round: number): BossDef => BOSSES[round % BOSSES.length];
export const bossActive = (s: GameState): boolean => !!s.boss;

/** Called once a month, before the economy is worked out. */
export function advanceBoss(s: GameState, simulation: boolean): void {
  if (s.boss && s.month >= s.boss.endMonth) {
    const def = BOSSES.find((b) => b.id === s.boss!.id)!;
    const survived = s.status === 'playing' && s.ledger.balances.cash >= 0;
    if (survived) {
      s.bossesBeaten = (s.bossesBeaten ?? 0) + 1;
      adjustReputation(s, 6);
      if (!simulation) logItem(s, 'milestone', `Boss round beaten: ${def.name}`, 'You came through with money in the bank. Reputation +6.');
    } else if (!simulation) logItem(s, 'warning', `${def.name} left its mark`, 'You came through it overdrawn, so there is no prize this time.');
    s.boss = undefined;
    return;
  }
  if (!s.boss && s.month >= BOSS_EVERY && s.month % BOSS_EVERY === 0 && s.scenarioId === 'standard') {
    const round = s.month / BOSS_EVERY - 1;
    const def = bossFor(round);
    s.boss = { id: def.id, endMonth: s.month + BOSS_MONTHS };
    addTemporaryEffect(s, `boss-${def.id}`, `Boss round: ${def.name}`, BOSS_MONTHS + 1, { demandMult: def.demandMult, unitCostMult: def.unitCostMult, lendingAppetite: def.lendingAppetite });
    if (!simulation) logItem(s, 'event', `Boss round: ${def.name}`, `${def.story} It lasts about ${BOSS_MONTHS} months. Come through with money in the bank to earn a prize.`);
  }
}
