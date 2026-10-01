import { formatGBP } from '../money';
import { plSummary } from '../ledger/statements';
import { moodOf, rosterOf, type Teammate } from './roster';
import { industryOf, type IndustryId } from './industries';
import { UPGRADES } from './upgrades';
import { monthLabel, type GameState } from './state';
import type { Profile } from './prestige';

/**
 * Personality: a pet, an employee of the month, names for your buildings, a newspaper, a diary and hats
 * for the team. Everything here lives in the player's profile or is read from the company. None of it
 * changes the simulation, so the server never needs to know.
 */

// ---------------------------------------------------------------------------------------------
// Pet mascot
// ---------------------------------------------------------------------------------------------
export interface PetKind { id: string; name: string; emoji: string; gems: number }
export const PETS: PetKind[] = [
  { id: 'dog', name: 'Dog', emoji: '🐶', gems: 150 },
  { id: 'cat', name: 'Cat', emoji: '🐱', gems: 150 },
  { id: 'parrot', name: 'Parrot', emoji: '🦜', gems: 200 },
  { id: 'robot', name: 'Robot', emoji: '🤖', gems: 300 },
];
export interface PetState { kind: string; name: string; adopted: string }
export const petOf = (p: Pick<Profile, 'pet'>): PetState | null => (p.pet && PETS.some((x) => x.id === p.pet!.kind) ? p.pet : null);
export const cleanName = (v: unknown, max = 24): string => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export function adoptPet<T extends Pick<Profile, 'gems' | 'pet'>>(p: T, kind: string, name: string, today: string): T {
  const def = PETS.find((x) => x.id === kind);
  if (!def) throw new Error('Unknown pet.');
  if (petOf(p)) throw new Error('You already have a pet.');
  const n = cleanName(name, 16) || def.name;
  if (p.gems < def.gems) throw new Error(`You need ${def.gems} gems.`);
  return { ...p, gems: p.gems - def.gems, pet: { kind, name: n, adopted: today } };
}

/** How the pet feels, from the team's mood and whether the company is making money. */
export function petMood(s: GameState): { face: string; text: string } {
  const last = s.history.at(-1);
  const profit = last ? plSummary(last.period.pl).profit : 0;
  const m = moodOf(s.morale);
  if (s.ledger.balances.cash < 0) return { face: '😟', text: 'is worried about the bank balance' };
  if (profit > 0 && m.face !== '😟') return { face: '🤩', text: 'is thrilled: the company is making money' };
  if (profit > 0) return { face: '🙂', text: 'is happy to see profits' };
  return { face: '😐', text: 'is keeping a close eye on things' };
}

// ---------------------------------------------------------------------------------------------
// Employee of the month
// ---------------------------------------------------------------------------------------------
export interface EomEntry { month: number; id: string; name: string; note: string }
const EOM_NOTES = ['stayed late to fix a tricky problem', 'made a customer smile', 'trained the newcomers', 'saved the day when the van broke down', 'came up with a clever idea', 'kept the whole team cheerful'];
export const eomOf = (p: Pick<Profile, 'eom'>): EomEntry[] => (p.eom ?? []).slice(-12);
export const canNameEom = (p: Pick<Profile, 'eom'>, month: number): boolean => !(p.eom ?? []).some((e) => e.month === month);
export function nameEom<T extends Pick<Profile, 'eom'>>(p: T, s: GameState, personId: string): T {
  const who: Teammate | undefined = rosterOf(s).find((t) => t.id === personId);
  if (!who) throw new Error('Pick someone from your team.');
  if (!canNameEom(p, s.month)) throw new Error('You have already named someone this month.');
  const note = EOM_NOTES[(s.month + personId.length) % EOM_NOTES.length];
  return { ...p, eom: [...eomOf(p), { month: s.month, id: personId, name: who.name, note: `${who.name} ${note}.` }] };
}

// ---------------------------------------------------------------------------------------------
// Names for your buildings
// ---------------------------------------------------------------------------------------------
export const MAX_NAMES = 20;
export const buildingNames = (p: Pick<Profile, 'names'>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.names ?? {}).slice(0, MAX_NAMES)) { const n = cleanName(v); if (n && /^[a-zA-Z0-9_-]{1,40}$/.test(k)) out[k] = n; }
  return out;
};
export function setBuildingName<T extends Pick<Profile, 'names'>>(p: T, id: string, name: string): T {
  const names = { ...buildingNames(p) };
  const n = cleanName(name);
  if (n) names[id] = n; else delete names[id];
  if (Object.keys(names).length > MAX_NAMES) throw new Error(`You can name up to ${MAX_NAMES} buildings.`);
  return { ...p, names };
}
export const upgradeIdsFor = (id: IndustryId): string[] => UPGRADES[id].map((u) => u.id);

// ---------------------------------------------------------------------------------------------
// The newspaper
// ---------------------------------------------------------------------------------------------
export interface Front { paper: string; headline: string; sub: string; mood: 'good' | 'bad' | 'neutral' }
export function headlineOf(s: GameState): Front {
  const paper = `The ${industryOf(s).name.split(' ')[0]} Gazette`;
  const name = s.companyName || 'The company';
  const last = s.history.at(-1);
  if (!last) return { paper, headline: `${name} opens its doors`, sub: 'A new business with big plans arrives in town.', mood: 'neutral' };
  const pl = plSummary(last.period.pl);
  const prev = s.history.at(-2) ? plSummary(s.history.at(-2)!.period.pl) : null;
  const when = monthLabel(last.month);
  if (s.ledger.balances.cash < 0) return { paper, headline: `${name} in the red`, sub: `Bank balance ${formatGBP(s.ledger.balances.cash, { compact: true })} in ${when}. Creditors are watching.`, mood: 'bad' };
  if (s.board?.last === 'miss' && s.board.streak === 0 && s.month % 3 === 0) return { paper, headline: `${name} misses the board's target`, sub: 'Directors are said to be "disappointed".', mood: 'bad' };
  if (s.board?.last === 'hit' && s.board.streak >= 2 && s.month % 3 === 0) return { paper, headline: `${name} beats its target again`, sub: `${s.board.streak} quarters in a row. The board is delighted.`, mood: 'good' };
  if (s.rumour) return { paper, headline: `Whispers about ${name}`, sub: s.rumour.text, mood: 'neutral' };
  if (prev && pl.revenue > prev.revenue * 1.15 && pl.revenue > 0) return { paper, headline: `${name} sales surge`, sub: `Up ${Math.round((pl.revenue / prev.revenue - 1) * 100)}% in ${when}.`, mood: 'good' };
  if (prev && pl.profit < 0 && prev.profit >= 0) return { paper, headline: `${name} slips into a loss`, sub: `A ${formatGBP(-pl.profit, { compact: true })} loss for ${when}.`, mood: 'bad' };
  if (pl.profit > 0 && prev && pl.profit > prev.profit) return { paper, headline: `${name} profits climb`, sub: `${formatGBP(pl.profit, { compact: true })} made in ${when}.`, mood: 'good' };
  if (pl.profit > 0) return { paper, headline: `${name} turns a profit`, sub: `${formatGBP(pl.profit, { compact: true })} in ${when}.`, mood: 'good' };
  return { paper, headline: `${name} keeps going`, sub: `${when}: sales of ${formatGBP(pl.revenue, { compact: true })}, a loss of ${formatGBP(-pl.profit, { compact: true })}.`, mood: 'neutral' };
}

// ---------------------------------------------------------------------------------------------
// Founder diary
// ---------------------------------------------------------------------------------------------
export interface DiaryEntry { year: number; company: string; note: string; facts: string }
export const MAX_DIARY = 30;
export const diaryOf = (p: Pick<Profile, 'diary'>): DiaryEntry[] => (p.diary ?? []).slice(-MAX_DIARY);
export function writeDiary<T extends Pick<Profile, 'diary'>>(p: T, entry: { year: number; company: string; note: string; facts: string }): T {
  const note = cleanName(entry.note, 240);
  if (!note) throw new Error('Write a line or two first.');
  const rest = diaryOf(p).filter((e) => !(e.year === entry.year && e.company === entry.company));
  return { ...p, diary: [...rest, { year: entry.year, company: cleanName(entry.company, 40), note, facts: String(entry.facts).slice(0, 200) }].slice(-MAX_DIARY) };
}
export const diaryShareText = (e: DiaryEntry): string => `${e.company}, year ${e.year}: ${e.note} (${e.facts})`;

// ---------------------------------------------------------------------------------------------
// Staff wardrobe
// ---------------------------------------------------------------------------------------------
export interface Hat { id: string; name: string; emoji: string; gems: number; colour: string }
export const HATS: Hat[] = [
  { id: 'cap', name: 'Baseball cap', emoji: '🧢', gems: 75, colour: '#3a7bd5' },
  { id: 'party', name: 'Party hat', emoji: '🎉', gems: 100, colour: '#ff6fae' },
  { id: 'helmet', name: 'Hard hat', emoji: '⛑️', gems: 100, colour: '#ffc633' },
  { id: 'crown', name: 'Crown', emoji: '👑', gems: 250, colour: '#ffd24a' },
];
export interface Wardrobe { owned: string[]; equipped: string | null }
export const wardrobeOf = (p: Pick<Profile, 'wardrobe'>): Wardrobe => ({
  owned: (p.wardrobe?.owned ?? []).filter((id) => HATS.some((h) => h.id === id)),
  equipped: p.wardrobe?.equipped && HATS.some((h) => h.id === p.wardrobe!.equipped) ? p.wardrobe.equipped : null,
});
export function buyHat<T extends Pick<Profile, 'gems' | 'wardrobe'>>(p: T, id: string): T {
  const h = HATS.find((x) => x.id === id);
  if (!h) throw new Error('Unknown hat.');
  const w = wardrobeOf(p);
  if (w.owned.includes(id)) throw new Error('You already own that hat.');
  if (p.gems < h.gems) throw new Error(`You need ${h.gems} gems.`);
  return { ...p, gems: p.gems - h.gems, wardrobe: { owned: [...w.owned, id], equipped: id } };
}
export function wearHat<T extends Pick<Profile, 'wardrobe'>>(p: T, id: string | null): T {
  const w = wardrobeOf(p);
  if (id !== null && !w.owned.includes(id)) throw new Error('You do not own that hat.');
  return { ...p, wardrobe: { owned: w.owned, equipped: id } };
}
