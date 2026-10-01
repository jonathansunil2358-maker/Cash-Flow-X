/**
 * Prestige rank: every prestige is a permanent step up. Each rank adds a lasting demand bonus
 * to every new company on Easy and Medium (Hard has no prestige and no perks). The server
 * supplies the rank from its own records, so it cannot be claimed from the client.
 */
export const PRESTIGE_BONUS_PER_RANK = 0.02;
export const PRESTIGE_BONUS_CAP = 0.3;

const TITLES = ['Founder', 'Operator', 'Director', 'Executive', 'Chairman', 'Magnate', 'Tycoon', 'Titan', 'Legend'];

/** Demand bonus for a rank, e.g. 0.06 for +6%. */
export const prestigeBonus = (rank: number): number => Math.min(PRESTIGE_BONUS_CAP, Math.max(0, rank) * PRESTIGE_BONUS_PER_RANK);

/** The rank at which the bonus stops growing. */
export const PRESTIGE_BONUS_MAX_RANK = Math.round(PRESTIGE_BONUS_CAP / PRESTIGE_BONUS_PER_RANK);

export const prestigeTitle = (rank: number): string => TITLES[Math.min(TITLES.length - 1, Math.max(0, rank))];
