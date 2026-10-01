import type { Profile } from './prestige';
import { ACHIEVEMENTS } from './gamification';
import { INDUSTRIES } from './industries';

/**
 * Collecting: extra island land, achievement trails, soundtracks and a museum of your past companies.
 * All client-side and cosmetic or convenience only: none of it changes a number in the game.
 */

// ---------------------------------------------------------------------------------------------
// Land
// ---------------------------------------------------------------------------------------------
export interface LandDef { id: string; name: string; gems: number; at: [number, number] }
export const LAND: LandDef[] = [
  { id: 'west', name: 'West lawn', gems: 40, at: [-11, -3] },
  { id: 'east', name: 'East lawn', gems: 60, at: [11, -3] },
  { id: 'north', name: 'North meadow', gems: 80, at: [0, -11] },
];
export const landOf = (p: Pick<Profile, 'land'>): string[] => (p.land ?? []).filter((id) => LAND.some((l) => l.id === id));
export function buyLand<T extends Pick<Profile, 'land' | 'gems'>>(p: T, id: string): T {
  const def = LAND.find((l) => l.id === id);
  if (!def) throw new Error('Unknown land.');
  if (landOf(p).includes(id)) throw new Error('You already own that land.');
  if (p.gems < def.gems) throw new Error(`You need ${def.gems} gems.`);
  return { ...p, gems: p.gems - def.gems, land: [...landOf(p), id] };
}

// ---------------------------------------------------------------------------------------------
// Achievement trails
// ---------------------------------------------------------------------------------------------
export interface TrailDef { id: string; name: string; blurb: string; steps: string[]; gems: number }
export const TRAILS: TrailDef[] = [
  { id: 'money', name: 'The money trail', blurb: 'From your first sale to a £10m company.', steps: ['first_sale', 'first_profit', 'profit_streak', 'revenue_1m', 'valuation_1m', 'valuation_10m'], gems: 80 },
  { id: 'people', name: 'The people trail', blurb: 'Build the team, the sites and the contracts.', steps: ['dream_team', 'big_team', 'first_site', 'three_sites', 'three_contracts'], gems: 60 },
  { id: 'finance', name: 'The finance trail', blurb: 'Debt, dividends, deals and the stock market.', steps: ['loan_repaid', 'dividend', 'acquisition', 'listed', 'buyback'], gems: 70 },
  { id: 'survivor', name: 'The survivor trail', blurb: 'Weather the storms.', steps: ['recession', 'overdraft_survivor', 'storm_survivor', 'insured', 'claim_paid'], gems: 60 },
  { id: 'competitor', name: 'The competitor trail', blurb: 'Take part, beat the board, win awards.', steps: ['daily_done', 'weekly_done', 'challenge_done', 'board_first', 'award_first'], gems: 60 },
];
export const trailsClaimed = (p: Pick<Profile, 'trails'>): string[] => (p.trails ?? []).filter((id) => TRAILS.some((t) => t.id === id));
export function trailProgress(p: Pick<Profile, 'achievements'>, t: TrailDef): { done: number; total: number; complete: boolean; next: string | null } {
  const have = t.steps.filter((id) => !!p.achievements[id]);
  const next = t.steps.find((id) => !p.achievements[id]);
  return { done: have.length, total: t.steps.length, complete: have.length === t.steps.length, next: next ? ACHIEVEMENTS.find((a) => a.id === next)?.name ?? next : null };
}
export function claimTrail<T extends Pick<Profile, 'trails' | 'achievements' | 'gems'>>(p: T, id: string): T {
  const t = TRAILS.find((x) => x.id === id);
  if (!t) throw new Error('Unknown trail.');
  if (trailsClaimed(p).includes(id)) throw new Error('Already claimed.');
  if (!trailProgress(p, t).complete) throw new Error('Finish every step first.');
  return { ...p, gems: p.gems + t.gems, trails: [...trailsClaimed(p), id] };
}

// ---------------------------------------------------------------------------------------------
// Soundtracks
// ---------------------------------------------------------------------------------------------
export interface Soundtrack { id: string; name: string; blurb: string; gems: number }
export const SOUNDTRACKS: Soundtrack[] = [
  { id: 'gentle', name: 'Gentle', blurb: 'The original: soft and simple.', gems: 0 },
  { id: 'jazz', name: 'Smoky jazz', blurb: 'Bluesy notes and a laid-back beat.', gems: 30 },
  { id: 'chiptune', name: 'Chiptune', blurb: 'Bleeps and bloops like an old arcade.', gems: 40 },
  { id: 'dreamy', name: 'Dreamy', blurb: 'Long, slow, floaty notes.', gems: 50 },
];
export interface Tracks { owned: string[]; selected: string }
export const tracksOf = (p: Pick<Profile, 'tracks'>): Tracks => {
  const owned = Array.from(new Set(['gentle', ...(p.tracks?.owned ?? []).filter((id) => SOUNDTRACKS.some((t) => t.id === id))]));
  return { owned, selected: owned.includes(p.tracks?.selected ?? '') ? p.tracks!.selected : 'gentle' };
};
export function buyTrack<T extends Pick<Profile, 'tracks' | 'gems'>>(p: T, id: string): T {
  const def = SOUNDTRACKS.find((t) => t.id === id);
  if (!def) throw new Error('Unknown soundtrack.');
  const t = tracksOf(p);
  if (t.owned.includes(id)) throw new Error('You already own that one.');
  if (p.gems < def.gems) throw new Error(`You need ${def.gems} gems.`);
  return { ...p, gems: p.gems - def.gems, tracks: { owned: [...t.owned, id], selected: id } };
}
export function selectTrack<T extends Pick<Profile, 'tracks'>>(p: T, id: string): T {
  const t = tracksOf(p);
  if (!t.owned.includes(id)) throw new Error('You do not own that soundtrack.');
  return { ...p, tracks: { owned: t.owned, selected: id } };
}

// ---------------------------------------------------------------------------------------------
// Museum of past companies
// ---------------------------------------------------------------------------------------------
export interface Exhibit { name: string; sector: string; emoji: string; tier: 'gold' | 'silver' | 'bronze' | 'ruin'; label: string; stake: number; months: number }
export function museumOf(p: Pick<Profile, 'runs'>): Exhibit[] {
  return p.runs.map((r) => {
    const ind = INDUSTRIES[r.industryId];
    const tier = r.outcome === 'bankrupt' ? 'ruin' : r.ownerStake >= 10_000_000_00 ? 'gold' : r.ownerStake >= 1_000_000_00 ? 'silver' : 'bronze';
    return {
      name: r.companyName, sector: ind?.name ?? r.industryId, emoji: ind?.emoji ?? '🏢', tier, stake: r.ownerStake, months: r.months,
      label: tier === 'gold' ? 'Gold cup' : tier === 'silver' ? 'Silver cup' : tier === 'bronze' ? 'Bronze cup' : 'A lesson learned',
    };
  });
}
