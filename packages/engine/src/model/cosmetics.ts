/**
 * Cosmetics shop: skins for your island, bought with gems. They change colours only, never a
 * number in the game, so they cannot affect a score. Ownership lives in the profile.
 */
export interface SkinPalette {
  grass: string;
  grassNight: string;
  lawn: string;
  lawnNight: string;
  soil: string;
  sand: string;
  sea: string;
  seaNight: string;
  /** Light bounced up from the ground. */
  ground: string;
  /** Replacements for the four tree colours (green, light green, orange, purple). */
  leaf: [string, string, string, string];
  /** A CSS gradient or colour behind the 3D scene and under the 2D fallback. */
  sky: string;
  skyNight: string;
}

export interface SkinDef {
  id: string;
  name: string;
  blurb: string;
  gems: number;
  palette: SkinPalette;
}

export const DEFAULT_PALETTE: SkinPalette = {
  grass: '#7ccf52', grassNight: '#5aa33e', lawn: '#8fdb63', lawnNight: '#64b046', soil: '#8a5a36', sand: '#f3d99a', sea: '#4fb8ef', seaNight: '#1d3f7a', ground: '#7ccf52',
  leaf: ['#4e9e2f', '#7ccf52', '#ff8a1f', '#8e3fe6'], sky: '', skyNight: '',
};

export const SKINS: SkinDef[] = [
  { id: 'default', name: 'Sunny island', blurb: 'The classic: green lawns and a blue sea.', gems: 0, palette: DEFAULT_PALETTE },
  { id: 'autumn', name: 'Autumn', blurb: 'Golden grass and orange leaves.', gems: 600,
    palette: { grass: '#c9a24a', grassNight: '#8f7433', lawn: '#d9b55e', lawnNight: '#a3833b', soil: '#7a4a2a', sand: '#e9cf9c', sea: '#5aa7c9', seaNight: '#1e3a5c', ground: '#c9a24a',
      leaf: ['#c4561f', '#e08a2b', '#f0b22e', '#9c3a1c'], sky: 'linear-gradient(#f6d9a8, #fbeed4)', skyNight: 'linear-gradient(#2a2038, #4a3454)' } },
  { id: 'snow', name: 'Snowy', blurb: 'A winter wonderland.', gems: 800,
    palette: { grass: '#e8f0f7', grassNight: '#aebdcc', lawn: '#f6fafd', lawnNight: '#bccadb', soil: '#6b6f7a', sand: '#dfe8f0', sea: '#8fc6e6', seaNight: '#23406a', ground: '#e8f0f7',
      leaf: ['#2f6b4a', '#4a8a63', '#7fae8d', '#3e5f7a'], sky: 'linear-gradient(#cfe4f4, #f2f8fd)', skyNight: 'linear-gradient(#18243c, #2d4062)' } },
  { id: 'tropical', name: 'Tropical', blurb: 'Bright lagoon water and lush jungle.', gems: 800,
    palette: { grass: '#3fc47a', grassNight: '#2b8d57', lawn: '#59d58e', lawnNight: '#369b63', soil: '#9a6b3d', sand: '#fbe8b3', sea: '#25d3c8', seaNight: '#0d5a73', ground: '#3fc47a',
      leaf: ['#1fa05a', '#46cf7d', '#ff7a59', '#ff4fa3'], sky: 'linear-gradient(#aef0f2, #e8fdf9)', skyNight: 'linear-gradient(#0e2a4a, #1a4a6a)' } },
  { id: 'neon', name: 'Neon night', blurb: 'A glowing city on a dark sea.', gems: 1200,
    palette: { grass: '#2d3a8c', grassNight: '#1d255f', lawn: '#3a49a8', lawnNight: '#26327a', soil: '#2a1f4d', sand: '#6a4fb5', sea: '#12123a', seaNight: '#0a0a24', ground: '#6a4fb5',
      leaf: ['#19e6c3', '#ff3df0', '#ffd23f', '#7a5cff'], sky: 'linear-gradient(#1b1450, #3b1f7a)', skyNight: 'linear-gradient(#0a0630, #230f55)' } },
  { id: 'candy', name: 'Candy land', blurb: 'Pastel sweets and a strawberry sea.', gems: 1000,
    palette: { grass: '#ffb3d9', grassNight: '#cf86b0', lawn: '#ffc9e6', lawnNight: '#d899bd', soil: '#a8663f', sand: '#fff0b8', sea: '#9fd8ff', seaNight: '#38508f', ground: '#ffb3d9',
      leaf: ['#9be37a', '#ffe36e', '#ff9a6e', '#c58bff'], sky: 'linear-gradient(#ffe3f1, #fff8e1)', skyNight: 'linear-gradient(#2e2250, #4d3470)' } },
];

export const SKIN_IDS = SKINS.map((s) => s.id);
export const skinOf = (id: string | null | undefined): SkinDef => SKINS.find((s) => s.id === id) ?? SKINS[0];

export interface Cosmetics {
  owned: string[];
  skin: string;
}
export const defaultCosmetics = (): Cosmetics => ({ owned: ['default'], skin: 'default' });

/** Anything that carries optional cosmetics (a profile). */
interface HasCosmetics {
  gems: number;
  cosmetics?: Cosmetics;
}

/** Cosmetics with defaults filled in and unknown skins dropped, so old and odd saves always load. */
export function cosmeticsOf(p: Pick<HasCosmetics, 'cosmetics'>): Cosmetics {
  const owned = Array.from(new Set(['default', ...(p.cosmetics?.owned ?? [])])).filter((id) => SKIN_IDS.includes(id));
  const skin = p.cosmetics && owned.includes(p.cosmetics.skin) ? p.cosmetics.skin : 'default';
  return { owned, skin };
}

export function buySkin<T extends HasCosmetics>(profile: T, id: string): T {
  const def = SKINS.find((s) => s.id === id);
  if (!def) throw new Error('Unknown skin.');
  const c = cosmeticsOf(profile);
  if (c.owned.includes(id)) throw new Error('You already own that skin.');
  if (profile.gems < def.gems) throw new Error(`You need ${def.gems} gems.`);
  return { ...profile, gems: profile.gems - def.gems, cosmetics: { owned: [...c.owned, id], skin: id } };
}

export function equipSkin<T extends HasCosmetics>(profile: T, id: string): T {
  const c = cosmeticsOf(profile);
  if (!c.owned.includes(id)) throw new Error('You do not own that skin yet.');
  return { ...profile, cosmetics: { ...c, skin: id } };
}
