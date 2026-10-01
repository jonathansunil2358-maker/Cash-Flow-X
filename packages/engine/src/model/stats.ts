import type { Pence } from '../money';
import { ACHIEVEMENTS, levelForXp } from './gamification';
import { INDUSTRY_IDS, type IndustryId } from './industries';
import type { Profile, RunSummary } from './prestige';

/** Lifetime figures for the stats page, derived from the profile (no new state). */
export interface LifetimeStats {
  companies: number;
  prestiges: number;
  bankruptcies: number;
  retired: number;
  yearsPlayed: number;
  /** Share of companies that did not go bust. */
  survivalRate: number;
  legacyEarned: number;
  bestStake: Pence;
  /** The best of the latest 20 companies on record. */
  bestRun: RunSummary | null;
  bestByIndustry: Partial<Record<IndustryId, RunSummary>>;
  favouriteIndustry: IndustryId | null;
  achievementsEarned: number;
  achievementsTotal: number;
  missionsCompleted: number;
  founderLevel: number;
  gems: number;
}

export function lifetimeStats(profile: Profile): LifetimeStats {
  const runs = profile.runs ?? [];
  const life = profile.lifetime;
  const companies = Math.max(life.companies, runs.length);
  const bestByIndustry: Partial<Record<IndustryId, RunSummary>> = {};
  const counts = new Map<IndustryId, number>();
  let bestRun: RunSummary | null = null;
  for (const r of runs) {
    if (!bestRun || r.ownerStake > bestRun.ownerStake) bestRun = r;
    const cur = bestByIndustry[r.industryId];
    if (!cur || r.ownerStake > cur.ownerStake) bestByIndustry[r.industryId] = r;
    counts.set(r.industryId, (counts.get(r.industryId) ?? 0) + 1);
  }
  let favourite: IndustryId | null = null;
  for (const id of INDUSTRY_IDS) if ((counts.get(id) ?? 0) > (counts.get(favourite as IndustryId) ?? 0)) favourite = id;
  return {
    companies,
    prestiges: profile.prestigeCount,
    bankruptcies: life.bankruptcies,
    retired: life.retired,
    yearsPlayed: Math.round((life.months / 12) * 10) / 10,
    survivalRate: companies > 0 ? Math.max(0, (companies - life.bankruptcies) / companies) : 0,
    legacyEarned: profile.legacyEarned,
    bestStake: Math.max(life.bestStake, bestRun?.ownerStake ?? 0),
    bestRun,
    bestByIndustry,
    favouriteIndustry: favourite,
    achievementsEarned: Object.keys(profile.achievements).length,
    achievementsTotal: ACHIEVEMENTS.length,
    missionsCompleted: profile.missionsCompleted,
    founderLevel: levelForXp(profile.xp),
    gems: profile.gems,
  };
}
