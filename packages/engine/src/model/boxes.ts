import { hashSeed } from '../rng';
import { BOOSTS, type BoostId } from './perks';
import type { Profile } from './prestige';
import { STICKERS, completedPages, stickerDef } from './stickers';

/**
 * Mystery boxes: a little surprise earned by finishing quests and winning awards. Each opens to gems,
 * a banked boost or a sticker. The result depends only on a seed, so it is easy to test.
 */
export type BoxReward =
  | { kind: 'gems'; gems: number }
  | { kind: 'boost'; boost: BoostId }
  | { kind: 'sticker'; sticker: string };

export const BOX_GEMS = [10, 15, 20, 30, 45, 60];

/** Draw a reward. `owned` stickers are skipped; if there is nothing new to find a sticker roll becomes gems. */
export function rollBox(seed: string | number, owned: readonly string[]): BoxReward {
  const h = hashSeed(`BOX-${seed}`);
  const roll = (h % 100) / 100;
  if (roll < 0.5) return { kind: 'gems', gems: BOX_GEMS[(h >>> 8) % BOX_GEMS.length] };
  if (roll < 0.72) return { kind: 'boost', boost: (['rush', 'megaphone', 'shield'] as BoostId[])[(h >>> 8) % 3] };
  const missing = STICKERS.filter((s) => !owned.includes(s.id));
  if (!missing.length) return { kind: 'gems', gems: 40 };
  return { kind: 'sticker', sticker: missing[(h >>> 8) % missing.length].id };
}

export const boxCount = (p: Pick<Profile, 'boxes'>): number => p.boxes ?? 0;

export function addBoxes<T extends Pick<Profile, 'boxes'>>(p: T, n: number): T {
  return n > 0 ? { ...p, boxes: boxCount(p) + n } : p;
}

export interface BoxOpening<T> {
  profile: T;
  reward: BoxReward;
  /** Pages completed by this sticker (they pay gems when claimed). */
  pageDone: string | null;
}

/** Open one box. `nonce` should differ every time (the profile's running count of opened boxes). */
export function openBox<T extends Pick<Profile, 'boxes' | 'gems' | 'boosts' | 'stickers' | 'boxesOpened' | 'albumClaimed'>>(p: T): BoxOpening<T> {
  if (boxCount(p) < 1) throw new Error('You have no boxes to open.');
  const opened = p.boxesOpened ?? 0;
  const owned = p.stickers ?? [];
  const reward = rollBox(`${opened}:${owned.length}:${p.gems}`, owned);
  let next: T = { ...p, boxes: boxCount(p) - 1, boxesOpened: opened + 1 };
  let pageDone: string | null = null;
  if (reward.kind === 'gems') next = { ...next, gems: next.gems + reward.gems };
  else if (reward.kind === 'boost') next = { ...next, boosts: [...next.boosts, { id: reward.boost, monthsRemaining: BOOSTS[reward.boost].months }] };
  else {
    const stickers = [...owned, reward.sticker];
    next = { ...next, stickers };
    const def = stickerDef(reward.sticker);
    if (def && completedPages(stickers, p.albumClaimed ?? []).some((pg) => pg.id === def.page)) pageDone = def.page;
  }
  return { profile: next, reward, pageDone };
}

/** Pay out a finished album page once. */
export function claimAlbumPage<T extends Pick<Profile, 'gems' | 'stickers' | 'albumClaimed'>>(p: T, pageId: string): T {
  const page = completedPages(p.stickers ?? [], p.albumClaimed ?? []).find((x) => x.id === pageId);
  if (!page) throw new Error('That page is not finished, or was already claimed.');
  return { ...p, gems: p.gems + page.gems, albumClaimed: [...(p.albumClaimed ?? []), pageId] };
}

/** Give a sticker straight away (from an event or award). Does nothing if it is already owned. */
export function grantSticker<T extends Pick<Profile, 'stickers'>>(p: T, id: string): T {
  if (!stickerDef(id) || (p.stickers ?? []).includes(id)) return p;
  return { ...p, stickers: [...(p.stickers ?? []), id] };
}
