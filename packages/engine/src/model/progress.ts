import type { IndustryId } from './industries';
import type { Profile } from './prestige';
import { levelForXp } from './gamification';

/** Reputation tiers: names for the 0-100 reputation number (purely descriptive). */
export const REPUTATION_TIERS = [
  { from: 0, name: 'Struggling name' },
  { from: 30, name: 'Local name' },
  { from: 50, name: 'Local favourite' },
  { from: 65, name: 'Regional name' },
  { from: 80, name: 'Industry leader' },
  { from: 92, name: 'National brand' },
];
export function reputationTier(rep: number): { index: number; name: string; next: { name: string; at: number } | null } {
  let index = 0;
  REPUTATION_TIERS.forEach((t, i) => { if (rep >= t.from) index = i; });
  const next = REPUTATION_TIERS[index + 1];
  return { index, name: REPUTATION_TIERS[index].name, next: next ? { name: next.name, at: next.from } : null };
}

// ---------------------------------------------------------------------------------------------
// Founder skills: spend a point per founder level on conveniences. None changes the simulation.
// ---------------------------------------------------------------------------------------------
export interface SkillDef { id: string; name: string; blurb: string }
export const SKILLS: SkillDef[] = [
  { id: 'longForecast', name: 'Long-range forecasts', blurb: 'The what-if forecaster looks 24 months ahead instead of 12.' },
  { id: 'planSlots', name: 'Plan archive', blurb: 'Keep six saved plans instead of three.' },
  { id: 'photoFilters', name: 'Photo studio extras', blurb: 'Three more filters in photo mode.' },
  { id: 'longCalendar', name: 'Year-ahead calendar', blurb: 'The cash-flow calendar shows twelve months instead of six.' },
];
export const skillsOf = (p: Pick<Profile, 'skills'>): string[] => (p.skills ?? []).filter((id) => SKILLS.some((s) => s.id === id));
export const hasSkill = (p: Pick<Profile, 'skills'>, id: string): boolean => skillsOf(p).includes(id);
/** One point for every founder level above 1. */
export const skillPoints = (p: Pick<Profile, 'xp' | 'skills'>): number => Math.max(0, levelForXp(p.xp) - 1 - skillsOf(p).length);
export function learnSkill<T extends Pick<Profile, 'xp' | 'skills'>>(p: T, id: string): T {
  if (!SKILLS.some((s) => s.id === id) || hasSkill(p, id) || skillPoints(p) < 1) return p;
  return { ...p, skills: [...skillsOf(p), id] };
}
export const planSlotsOf = (p: Pick<Profile, 'skills'>): number => (hasSkill(p, 'planSlots') ? 6 : 3);
export const calendarMonthsOf = (p: Pick<Profile, 'skills'>): number => (hasSkill(p, 'longCalendar') ? 12 : 6);
export const forecastMonthsOf = (p: Pick<Profile, 'skills'>): number => (hasSkill(p, 'longForecast') ? 24 : 12);

// ---------------------------------------------------------------------------------------------
// Season pass: a monthly track filled by playing, with a reward at every tier.
// ---------------------------------------------------------------------------------------------
export interface PassState { season: string; points: number; claimed: number[] }
export type PassReward = { kind: 'gems'; amount: number } | { kind: 'box' };
export const PASS_TIERS = 10;
export const PASS_POINTS_PER_TIER = 12;
export const seasonId = (d: Date = new Date()): string => d.toISOString().slice(0, 7);
export const PASS_REWARDS: PassReward[] = [
  { kind: 'gems', amount: 10 }, { kind: 'gems', amount: 15 }, { kind: 'box' }, { kind: 'gems', amount: 20 }, { kind: 'gems', amount: 25 },
  { kind: 'box' }, { kind: 'gems', amount: 30 }, { kind: 'gems', amount: 40 }, { kind: 'box' }, { kind: 'gems', amount: 80 },
];
export function passOf(p: Pick<Profile, 'pass'>, now: Date = new Date()): PassState {
  const season = seasonId(now);
  return p.pass && p.pass.season === season ? p.pass : { season, points: 0, claimed: [] };
}
export const passTier = (pass: PassState): number => Math.min(PASS_TIERS, Math.floor(pass.points / PASS_POINTS_PER_TIER));
export function addPassPoints<T extends Pick<Profile, 'pass'>>(p: T, points: number, now: Date = new Date()): T {
  if (points <= 0) return p;
  const cur = passOf(p, now);
  return { ...p, pass: { ...cur, points: Math.min(PASS_TIERS * PASS_POINTS_PER_TIER, cur.points + points) } };
}
/** Claim the next reward the player has earned (one at a time), or null if there is none. */
export function claimPass<T extends Pick<Profile, 'pass'>>(p: T, now: Date = new Date()): { profile: T; reward: PassReward; tier: number } | null {
  const cur = passOf(p, now);
  const tier = passTier(cur);
  for (let i = 0; i < tier; i++) {
    if (!cur.claimed.includes(i)) return { profile: { ...p, pass: { ...cur, claimed: [...cur.claimed, i] } }, reward: PASS_REWARDS[i], tier: i + 1 };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Sector mastery: badges earned by finishing companies in each sector.
// ---------------------------------------------------------------------------------------------
export const MASTERY_STEPS = [
  { name: 'Bronze', runs: 1 }, { name: 'Silver', runs: 3 }, { name: 'Gold', runs: 6 },
];
export interface Mastery { industryId: IndustryId; finished: number; best: number; tier: number; tierName: string | null; next: number | null }
export function masteryOf(p: Pick<Profile, 'runs'>, industryId: IndustryId): Mastery {
  const runs = p.runs.filter((r) => r.industryId === industryId && r.months >= 12);
  const finished = runs.length;
  let tier = 0;
  MASTERY_STEPS.forEach((st, i) => { if (finished >= st.runs) tier = i + 1; });
  return {
    industryId, finished, best: runs.reduce((a, r) => Math.max(a, r.ownerStake), 0), tier,
    tierName: tier ? MASTERY_STEPS[tier - 1].name : null, next: MASTERY_STEPS[tier]?.runs ?? null,
  };
}
