import type { Pence } from '../money';
import type { PlayGems } from './economy';
import type { LearnState } from './learn';
import type { PassState } from './progress';
import { modifierBonus } from './modifiers-opt';
import { DIFFICULTIES, type DifficultyId } from './difficulty';
import type { DailyState, Mission } from './gamification';
import type { IndustryId } from './industries';
import type { Cosmetics } from './cosmetics';
import type { QuestState } from './quests';
import type { DecorState } from './decor';
import type { Logo } from './logo';
import type { Plan } from './plans';
import { BOOSTS, perkPurchase, type ActiveBoost, type BoostId, type PerkLevels } from './perks';
import { isFixedScenario } from '../scenarios';
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

/** Totals over every company ever run (the `runs` list only keeps the latest 20). */
export interface Lifetime {
  companies: number;
  bankruptcies: number;
  retired: number;
  months: number;
  /** Best owner stake at the end of any company. */
  bestStake: Pence;
}

export const emptyLifetime = (): Lifetime => ({ companies: 0, bankruptcies: 0, retired: 0, months: 0, bestStake: 0 });

export interface Profile {
  version: 3;
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
  lifetime: Lifetime;
  /** Founder title shown on leaderboards (an achievement id with a title), cosmetic only. */
  title?: string | null;
  /** Skins bought and equipped. Optional so older saves load unchanged. */
  cosmetics?: Cosmetics;
  /** Today's quests and the streak (see quests.ts). Optional so older saves load unchanged. */
  quests?: QuestState;
  /** Mystery boxes waiting, how many were opened, collected stickers and album pages already paid. */
  boxes?: number;
  boxesOpened?: number;
  stickers?: string[];
  albumClaimed?: string[];
  /** Island decorations bought and switched on, and the company logo. */
  decor?: DecorState;
  logo?: Logo;
  /** Saved scenario plans (see plans.ts). */
  plans?: Plan[];
  /** Founder skills learned and this month's season pass (see progress.ts). */
  skills?: string[];
  /** Milestones already celebrated (see mood.ts). */
  milestones?: string[];
  /** Puzzle answers and glossary terms met (see learn.ts). */
  learn?: LearnState;
  /** Personality: pet, employee of the month, building names, diary, hats (see personality.ts). */
  pet?: { kind: string; name: string; adopted: string };
  eom?: { month: number; id: string; name: string; note: string }[];
  names?: Record<string, string>;
  diary?: { year: number; company: string; note: string; facts: string }[];
  /** Fastest speedrun (months to a £1m company) on this device. */
  speedBest?: number;
  /** Dynasty inheritance already paid, and mastery challenges met (see legacy3.ts). */
  dynastyClaimed?: number;
  mchallenges?: string[];
  /** Tips Penny the guide has already given (see feel.ts). */
  tips?: string[];
  /** Trading cards: how many of each you own, and which company-card pairs were already given (see social3.ts). */
  cards?: Record<string, number>;
  cardsSeen?: string[];
  /** Today's results of the daily mini-games (see minigames.ts). */
  minis?: Partial<Record<'negotiate' | 'pitch' | 'stocktake' | 'tetris', { day: string; points: number }>>;
  /** The strongest rival of your last company, remembered (see nemesis.ts), and finished campaign chapters. */
  nemesis?: { name: string; boss: string; catchphrase: string; company: string; stake: number };
  campaign?: number[];
  /** Extra island land, claimed achievement trails and soundtracks (see collect.ts). */
  land?: string[];
  trails?: string[];
  tracks?: { owned: string[]; selected: string };
  wardrobe?: { owned: string[]; equipped: string | null };
  /** Festival treats claimed: festival id to the year. See festivals.ts. */
  festivals?: Record<string, number>;
  pass?: PassState;
  /** Today's gems and boxes from repeatable play (see economy.ts). */
  playGems?: PlayGems;
}

export const STARTER_GEMS = 100;
export const FIRST_PRESTIGE_THRESHOLD: Pence = 10_000_000_00;
export const PRESTIGE_THRESHOLD_GROWTH = 2.5;

export function newProfile(): Profile {
  return {
    version: 3, xp: 0, achievements: {}, missions: [], missionsCompleted: 0, daily: { lastClaim: null, streak: 0 },
    legacyPoints: 0, legacyEarned: 0, prestigeCount: 0, perks: {}, gems: STARTER_GEMS, boosts: [], rebirthsUsed: 0, runs: [], lifetime: emptyLifetime(),
  };
}

/** Bring an older saved profile up to the current version (never loses progress). */
export function migrateProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Profile> & { version?: number };
  if (p.version === 3) return { ...(p as Profile), lifetime: { ...emptyLifetime(), ...(p as Profile).lifetime } };
  if (p.version === 2 || p.version === 1) {
    // Older profiles never counted lifetime totals: start them from the runs still on record.
    const runs = Array.isArray(p.runs) ? p.runs : [];
    const lifetime: Lifetime = {
      companies: runs.length,
      bankruptcies: runs.filter((r) => r.outcome === 'bankrupt').length,
      retired: runs.filter((r) => r.outcome === 'retired').length,
      months: runs.reduce((a, r) => a + r.months, 0),
      bestStake: runs.reduce((a, r) => Math.max(a, r.ownerStake), 0),
    };
    return { ...newProfile(), ...p, version: 3, lifetime } as Profile;
  }
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
  const points = Math.floor(legacyFor(stake) * modifierBonus(s.modifiers));
  if (isFixedScenario(s.scenarioId)) return { eligible: false, threshold, stake, points: 0, reason: 'Challenge companies cannot prestige.' };
  if (!DIFFICULTIES[s.difficulty].canPrestige) return { eligible: false, threshold, stake, points: 0, reason: 'Hard mode runs cannot prestige.' };
  if (s.status !== 'playing') return { eligible: false, threshold, stake, points, reason: 'This run has ended.' };
  if (stake < threshold) return { eligible: false, threshold, stake, points, reason: `Your stake must be worth at least £${(threshold / 100_000_000).toFixed(1)}m.` };
  return { eligible: true, threshold, stake, points };
}

const addToLifetime = (profile: Profile, s: GameState, outcome: RunSummary['outcome'], stake: Pence): Lifetime => {
  const l = profile.lifetime ?? emptyLifetime();
  return {
    companies: l.companies + 1,
    bankruptcies: l.bankruptcies + (outcome === 'bankrupt' ? 1 : 0),
    retired: l.retired + (outcome === 'retired' ? 1 : 0),
    months: l.months + s.month,
    bestStake: Math.max(l.bestStake, stake),
  };
};

const summarise = (s: GameState, outcome: RunSummary['outcome'], legacy: number): RunSummary => ({
  companyName: s.companyName, industryId: s.industryId, difficulty: s.difficulty, months: s.month, outcome,
  ownerStake: outcome === 'bankrupt' ? 0 : ownerStakeOf(s), legacy,
});

/** Bank the boosts still running in this run (Hard runs never used the profile's boosts). */
const bankBoosts = (profile: Profile, s: GameState): ActiveBoost[] =>
  DIFFICULTIES[s.difficulty].perksApply ? s.boosts.filter((b) => b.monthsRemaining > 0).map((b) => ({ ...b })) : profile.boosts;

/** Bank one prestige of a company that carries on: Legacy points, gems, XP and one more rank. */
export function awardPrestige(profile: Profile, points: number, stake: Pence): Profile {
  return {
    ...profile,
    xp: profile.xp + points * 100,
    legacyPoints: profile.legacyPoints + points,
    legacyEarned: profile.legacyEarned + points,
    prestigeCount: profile.prestigeCount + 1,
    rebirthsUsed: 0,
    lifetime: { ...(profile.lifetime ?? emptyLifetime()), bestStake: Math.max(profile.lifetime?.bestStake ?? 0, stake) },
  };
}

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
    boosts: bankBoosts(profile, s),
    rebirthsUsed: 0,
    lifetime: addToLifetime(profile, s, 'prestiged', ownerStakeOf(s)),
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
    lifetime: addToLifetime(profile, s, 'bankrupt', 0),
    runs: [summarise(s, 'bankrupt', 0), ...profile.runs].slice(0, 20),
  };
}

export function applyRetirement(profile: Profile, s: GameState): Profile {
  return { ...profile, boosts: bankBoosts(profile, s), lifetime: addToLifetime(profile, s, 'retired', ownerStakeOf(s)), runs: [summarise(s, 'retired', 0), ...profile.runs].slice(0, 20) };
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
