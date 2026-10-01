import { STATE_VERSION, migrateProfile, monthLabel, type GameState, type Profile } from '@cfx/engine';

/**
 * Save slots live in localStorage (per browser). Every access is wrapped: storage can be
 * unavailable in private windows or when the quota is exceeded, and the game must still run.
 */
export type SlotId = 'autosave' | '1' | '2' | '3';
export const SLOTS: SlotId[] = ['autosave', '1', '2', '3'];

export interface SlotMeta {
  slot: SlotId;
  companyName: string;
  industryId: string;
  label: string;
  savedAt: string;
  status: GameState['status'];
}

const key = (slot: SlotId) => `cfx:save:${slot}`;
const metaKey = (slot: SlotId) => `cfx:meta:${slot}`;

export function saveGame(slot: SlotId, game: GameState): boolean {
  try {
    const meta: SlotMeta = {
      slot, companyName: game.companyName, industryId: game.industryId, label: monthLabel(game.month),
      savedAt: new Date().toISOString(), status: game.status,
    };
    localStorage.setItem(key(slot), JSON.stringify(game));
    localStorage.setItem(metaKey(slot), JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: SlotId): GameState | null {
  try {
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    return g.version === STATE_VERSION ? g : null;
  } catch {
    return null;
  }
}

export function slotMeta(slot: SlotId): SlotMeta | null {
  try {
    const raw = localStorage.getItem(metaKey(slot));
    return raw ? (JSON.parse(raw) as SlotMeta) : null;
  } catch {
    return null;
  }
}

export function deleteSlot(slot: SlotId): void {
  try {
    localStorage.removeItem(key(slot));
    localStorage.removeItem(metaKey(slot));
  } catch {
    /* ignore */
  }
}

const PROFILE_KEY = 'cfx:profile';

export function saveProfile(p: Profile): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return migrateProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readPref(name: string): string | null {
  try {
    return localStorage.getItem(`cfx:pref:${name}`);
  } catch {
    return null;
  }
}

export function writePref(name: string, value: string): void {
  try {
    localStorage.setItem(`cfx:pref:${name}`, value);
  } catch {
    /* ignore */
  }
}
