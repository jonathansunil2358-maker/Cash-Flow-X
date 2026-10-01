import type { Pence } from '../money';
import { DIFFICULTIES, type DifficultyId } from './difficulty';
import type { DailyState, Mission } from './gamification';
import type { IndustryId } from './industries';
import { BOOSTS, perkPurchase, type ActiveBoost, type BoostId, type PerkLevels } from './perks';
import { ownership, type GameState } from './state';
import { valuationOf } from './valuation';

/**
 * The player's profile: everything that survives prestige and rebirth. A run (GameState) gets a
 * copy of the perks and boosts at start; the profile is updated when a run ends.
 */
export interface RunSummary {
  companyName: string;
  industryId: IndustryId;
  difficulty: DifficultyId;
  months: number;
  outcome: 'prestiged' | 'bankrupt' | 'retired';
  ownerStake: Pence;
  legacy: number;
}

export interface Profile {
  version: 2;
  /** Founder XP (level derives from it). */
  xp: number;
  /** Achievement id → ISO date unlocked. */
  achievements: Record<string, string>;
  missions: Mission[];
  missionsCompleted: number;
  daily: DailyState;
  legacyPoints: number;
  legacyEarned: number;
  prestigeCount: number;
  perks: PerkLevels;
  gems: number;
  /** Boost time banked between runs. */
  boosts: ActiveBoost[];
  /** Rebirths used since the last prestige. */
  rebirthsUsed: number;
  runs: RunSummary[];
}

export const STARTER_GEMS = 50;
export const GEMS_PER_LEGACY_POINT = 25;
export const FIRST_PRESTIGE_THRESHOLD: Pence = 10_000_000_00;
export const PRESTIGE_THRESHOLD_GROWTH = 2.5;

export function newProfile(): Profile {
  return {
    version: 2, xp: 0, achievements: {}, missions: [], missionsCompleted: 0, daily: { lastClaim: null, streak: 0 },
    legacyPoints: 0, legacyEarned: 0, prestigeCount: 0, perks: {}, gems: STARTER_GEMS, boosts: [], rebirthsUsed: 0, runs: [],
  };
}

/** Bring an older saved profile up to the current version (never loses progress). */
export function migrateProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Profile> & { version?: number };
  if (p.version === 2) return p as Profile;
  if (p.version === 1) return { ...newProfile(), ...p, version: 2 } as Profile;
  return null;
}

/** Owner stake needed to prestige: £10m, then 2.5x higher each time. */
export const prestigeThreshold = (prestigeCount: number): Pence =>
  Math.round(FIRST_PRESTIGE_THRESHOLD * Math.pow(PRESTIGE_THRESHOLD_GROWTH, prestigeCount));

/** Legacy points = floor(√(owner stake ÷ £1m)). */
export const legacyFor = (ownerStake: Pence): number => Math.floor(Math.sqrt(Math.max(0, ownerStake) / 1_000_000_00));

export function ownerStakeOf(s: GameState): Pence {
  return Math.round(valuationOf(s).equityValue * ownership(s));
}

export interface PrestigeCheck {
  eligible: boolean;
  threshold: Pence;
  stake: Pence;
  points: number;
  reason?: string;
}

export function prestigeCheck(s: GameState): PrestigeCheck {
  const threshold = prestigeThreshold(s.prestigeLevel);
  const stake = ownerStakeOf(s);
  const points = legacyFor(stake);
  if (!DIFFICULTIES[s.difficulty].canPrestige) return { eligible: false, threshold, stake, points: 0, reason: 'Hard mode runs cannot prestige.' };
  if (s.status !== 'playing') return { eligible: false, threshold, stake, points, reason: 'This run has ended.' };
  if (stake < threshold) return { eligible: false, threshold, stake, points, reason: `Your stake must be worth at least £${(threshold / 100_000_000).toFixed(1)}m.` };
  return { eligible: true, threshold, stake, points };
}

const summarise = (s: GameState, outcome: RunSummary['outcome'], legacy: number): RunSummary => ({
  companyName: s.companyName, industryId: s.industryId, difficulty: s.difficulty, months: s.month, outcome,
  ownerStake: outcome === 'bankrupt' ? 0 : ownerStakeOf(s), legacy,
});

/** Bank the boosts still running in this run (Hard runs never used the profile's boosts). */
const bankBoosts = (profile: Profile, s: GameState): ActiveBoost[] =>
  DIFFICULTIES[s.difficulty].perksApply ? s.boosts.filter((b) => b.monthsRemaining > 0).map((b) => ({ ...b })) : profile.boosts;

/** Update the profile after a run was prestiged (the run's `prestigeAward` holds the points). */
export function applyPrestige(profile: Profile, s: GameState): Profile {
  if (s.status !== 'prestiged') throw new Error('This run was not prestiged.');
  const points = s.prestigeAward;
  return {
    ...profile,
    xp: profile.xp + points * 100,
    legacyPoints: profile.legacyPoints + points,
    legacyEarned: profile.legacyEarned + points,
    prestigeCount: profile.prestigeCount + 1,
    gems: profile.gems + points * GEMS_PER_LEGACY_POINT,
    boosts: bankBoosts(profile, s),
    rebirthsUsed: 0,
    runs: [summarise(s, 'prestiged', points), ...profile.runs].slice(0, 20),
  };
}

export interface RebirthCheck {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

/** Rebirths left on a difficulty in the current prestige cycle (Infinity on Easy). */
export function rebirthsRemaining(profile: Profile, difficulty: DifficultyId): number {
  return Math.max(0, DIFFICULTIES[difficulty].rebirths - profile.rebirthsUsed);
}

export function rebirthCheck(profile: Profile, s: GameState): RebirthCheck {
  const limit = DIFFICULTIES[s.difficulty].rebirths;
  const remaining = Math.max(0, limit - profile.rebirthsUsed);
  if (limit === 0) return { allowed: false, remaining: 0, reason: 'Hard mode has one life. This company is gone for good.' };
  if (remaining <= 0) return { allowed: false, remaining: 0, reason: 'No rebirths left until you prestige. Start a new game to carry on.' };
  return { allowed: true, remaining };
}

/** Update the profile after a bankruptcy. `rebirth` false = the player simply starts over. */
export function applyBankruptcy(profile: Profile, s: GameState, rebirth: boolean): Profile {
  if (s.status !== 'insolvent') throw new Error('This run is not insolvent.');
  if (rebirth && !rebirthCheck(profile, s).allowed) throw new Error('No rebirths available.');
  return {
    ...profile,
    boosts: bankBoosts(profile, s),
    rebirthsUsed: profile.rebirthsUsed + (rebirth ? 1 : 0),
    runs: [summarise(s, 'bankrupt', 0), ...profile.runs].slice(0, 20),
  };
}

export function applyRetirement(profile: Profile, s: GameState): Profile {
  return { ...profile, boosts: bankBoosts(profile, s), runs: [summarise(s, 'retired', 0), ...profile.runs].slice(0, 20) };
}

export function buyPerk(profile: Profile, perkId: string): Profile {
  const check = perkPurchase(profile.perks, perkId, profile.legacyPoints);
  if (!check.ok) throw new Error(check.reason);
  return { ...profile, legacyPoints: profile.legacyPoints - check.cost, perks: { ...profile.perks, [perkId]: (profile.perks[perkId] ?? 0) + 1 } };
}

/** Spend gems on a boost. The caller also applies `activateBoost` to the running game. */
export function spendGemsOnBoost(profile: Profile, boostId: BoostId): Profile {
  const def = BOOSTS[boostId];
  if (!def) throw new Error('Unknown boost.');
  if (profile.gems < def.gems) throw new Error(`You need ${def.gems} gems.`);
  return { ...profile, gems: profile.gems - def.gems };
}
