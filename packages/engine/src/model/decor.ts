import type { Profile } from './prestige';

/**
 * Island decorations: eight things to buy with gems and show off on your island. Each has a fixed
 * spot, can be switched on or off, and has no effect on any number in the game.
 */
export interface DecorDef {
  id: string;
  name: string;
  emoji: string;
  gems: number;
  blurb: string;
  /** Where it stands on the island (x, z). */
  at: [number, number];
  /** Needs this piece of extra land first. */
  land?: string;
}
export interface DecorState {
  owned: string[];
  placed: string[];
}

export const DECOR: DecorDef[] = [
  { id: 'flowers', name: 'Flower beds', emoji: '🌷', gems: 75, blurb: 'A splash of colour by the road.', at: [-6.6, 4.8] },
  { id: 'bench', name: 'Park bench', emoji: '🪑', gems: 100, blurb: 'Somewhere for the team to eat lunch.', at: [-3.8, 0.5] },
  { id: 'fountain', name: 'Fountain', emoji: '⛲', gems: 200, blurb: 'Sparkling water outside the front door.', at: [2.7, 0.6] },
  { id: 'flags', name: 'Flagpoles', emoji: '🚩', gems: 125, blurb: 'Three flags in your brand colours.', at: [6.9, 0.9] },
  { id: 'statue', name: 'Founder statue', emoji: '🗿', gems: 300, blurb: 'A golden you, looking into the future.', at: [-7.1, -4.2] },
  { id: 'windmill', name: 'Windmill', emoji: '🌬️', gems: 250, blurb: 'Turning gently in the breeze.', at: [3.6, -3.6] },
  { id: 'gazebo', name: 'Gazebo', emoji: '🛖', gems: 225, blurb: 'A shady spot for meetings outdoors.', at: [7.0, -2.8] },
  { id: 'fireworks', name: 'Fireworks tower', emoji: '🎆', gems: 400, blurb: 'Sparkles at night to celebrate.', at: [-1.6, -7.2] },
  { id: 'playground', name: 'Playground', emoji: '🛝', gems: 175, blurb: 'Swings and a slide on the west lawn.', at: [-11, -3], land: 'west' },
  { id: 'skatepark', name: 'Skate park', emoji: '🛹', gems: 225, blurb: 'A little ramp for the lunchtime crowd.', at: [11, -3], land: 'east' },
  { id: 'treehouse', name: 'Tree house', emoji: '🌳', gems: 275, blurb: 'A secret meeting room up a tree.', at: [0, -11], land: 'north' },
];
export const decorDef = (id: string): DecorDef | undefined => DECOR.find((d) => d.id === id);

export const decorOf = (p: Pick<Profile, 'decor'>): DecorState => {
  const owned = (p.decor?.owned ?? []).filter((id) => decorDef(id));
  return { owned, placed: (p.decor?.placed ?? []).filter((id) => owned.includes(id)) };
};

export function buyDecor<T extends Pick<Profile, 'decor' | 'gems'>>(p: T, id: string): T {
  const def = decorDef(id);
  if (!def) throw new Error('Unknown decoration.');
  const d = decorOf(p);
  if (d.owned.includes(id)) throw new Error('You already own that.');
  if (def.land && !(p as { land?: string[] }).land?.includes(def.land)) throw new Error('Buy the extra land for that first.');
  if (p.gems < def.gems) throw new Error(`You need ${def.gems} gems.`);
  return { ...p, gems: p.gems - def.gems, decor: { owned: [...d.owned, id], placed: [...d.placed, id] } };
}

export function toggleDecor<T extends Pick<Profile, 'decor'>>(p: T, id: string): T {
  const d = decorOf(p);
  if (!d.owned.includes(id)) throw new Error('You do not own that yet.');
  const placed = d.placed.includes(id) ? d.placed.filter((x) => x !== id) : [...d.placed, id];
  return { ...p, decor: { owned: d.owned, placed } };
}
