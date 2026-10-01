import type { Pence } from '../money';

/**
 * Holding company (guild) levels, reached by the members' combined company valuation. Each level's
 * perks apply to every member's company (not on Hard). The server works out the level; a run
 * records it with a `setGuildLevel` action, which verification checks against the server's level.
 */
export interface GuildLevel {
  level: number;
  combinedValuation: Pence;
  demandMult: number;
  loanSpreadDelta: number;
  label: string;
}

export const GUILD_LEVELS: GuildLevel[] = [
  { level: 1, combinedValuation: 0, demandMult: 1.02, loanSpreadDelta: 0, label: '+2% demand' },
  { level: 2, combinedValuation: 10_000_000_00, demandMult: 1.03, loanSpreadDelta: -0.0025, label: '+3% demand, loans 0.25% cheaper' },
  { level: 3, combinedValuation: 50_000_000_00, demandMult: 1.04, loanSpreadDelta: -0.004, label: '+4% demand, loans 0.4% cheaper' },
  { level: 4, combinedValuation: 250_000_000_00, demandMult: 1.05, loanSpreadDelta: -0.005, label: '+5% demand, loans 0.5% cheaper' },
  { level: 5, combinedValuation: 1_000_000_000_00, demandMult: 1.07, loanSpreadDelta: -0.0075, label: '+7% demand, loans 0.75% cheaper' },
];

export const MAX_GUILD_MEMBERS = 30;

export function guildLevelFor(combinedValuation: Pence): number {
  let level = 1;
  for (const l of GUILD_LEVELS) if (combinedValuation >= l.combinedValuation) level = l.level;
  return level;
}

export const guildPerks = (level: number): GuildLevel | null => GUILD_LEVELS.find((l) => l.level === level) ?? null;

/** Weekly goal: members' combined profit this week, scaled by member count. */
export const weeklyGoalTarget = (members: number): Pence => Math.max(1, members) * 250_000_00;
export const WEEKLY_GOAL_GEMS = 50;
