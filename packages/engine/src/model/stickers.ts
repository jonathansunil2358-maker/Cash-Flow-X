import { INDUSTRY_IDS, type IndustryId } from './industries';

/**
 * The sticker album: collectables earned from mystery boxes, awards and events. Six sector pages of
 * six stickers and one page of general ones. Finishing a page pays gems once. Client-owned and purely
 * cosmetic, like every other collectable.
 */
export interface StickerDef {
  id: string;
  name: string;
  emoji: string;
  page: string;
}
export interface StickerPage {
  id: string;
  name: string;
  gems: number;
}

const SECTOR_STICKERS: Record<IndustryId, [string, string][]> = {
  software: [['Launch day', '🚀'], ['Zero bugs', '🐞'], ['10k users', '👥'], ['Server room', '🖥️'], ['Hackathon', '⌨️'], ['Unicorn', '🦄']],
  clothing: [['First stitch', '🧵'], ['Runway', '👗'], ['Pop-up shop', '🛍️'], ['Fabric swatch', '🎨'], ['Sold out', '🏷️'], ['Style icon', '🕶️']],
  restaurant: [['Opening night', '🍽️'], ['Five stars', '⭐'], ['Secret recipe', '📜'], ['Chef\'s kiss', '👨‍🍳'], ['Full house', '🪑'], ['Michelin dream', '🏅']],
  fitness: [['First member', '💪'], ['New year rush', '🎆'], ['Marathon team', '🏃'], ['Spin class', '🚴'], ['Gold weights', '🏋️'], ['Champions', '🏆']],
  ecommerce: [['First order', '📦'], ['Flash sale', '⚡'], ['Five-star review', '🌟'], ['Warehouse', '🏭'], ['Next-day', '🚚'], ['Global shipping', '🌍']],
  automotive: [['First build', '🔧'], ['Test drive', '🚗'], ['Paint job', '🎨'], ['Race day', '🏁'], ['Showroom', '🏢'], ['Dream car', '✨']],
};
const GENERAL: [string, string][] = [['First profit', '💷'], ['Board hero', '🧑‍💼'], ['Storm rider', '⛈️'], ['Trophy hunter', '🏆'], ['Bold bet', '🎲'], ['Rumour hound', '🕵️']];

export const STICKER_PAGES: StickerPage[] = [
  { id: 'general', name: 'Founder moments', gems: 40 },
  ...INDUSTRY_IDS.map((id) => ({ id, name: `${id[0].toUpperCase()}${id.slice(1)} stories`, gems: 40 })),
];

export const STICKERS: StickerDef[] = [
  ...GENERAL.map(([name, emoji], i) => ({ id: `general-${i}`, name, emoji, page: 'general' })),
  ...INDUSTRY_IDS.flatMap((id) => SECTOR_STICKERS[id].map(([name, emoji], i) => ({ id: `${id}-${i}`, name, emoji, page: id }))),
];
export const stickerDef = (id: string): StickerDef | undefined => STICKERS.find((s) => s.id === id);
export const stickersOnPage = (page: string): StickerDef[] => STICKERS.filter((s) => s.page === page);

/** Pages the player has completed and not yet been paid for. */
export function completedPages(owned: readonly string[], claimed: readonly string[]): StickerPage[] {
  return STICKER_PAGES.filter((p) => !claimed.includes(p.id) && stickersOnPage(p.id).every((s) => owned.includes(s.id)));
}
