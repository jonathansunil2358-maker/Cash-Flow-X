import { hashSeed } from '../rng';
import type { Profile } from './prestige';

/**
 * Daily quests: three small goals a day that fit in a two-minute session. Finish and claim all three
 * to keep a streak going; the streak raises the daily bonus. Gems are client-owned like every other
 * reward from missions, so none of this can touch a leaderboard.
 */
export type QuestEvent = 'month' | 'profit' | 'decision' | 'upgrade' | 'hire' | 'promo' | 'project' | 'price' | 'board';

export interface QuestDef {
  id: string;
  event: QuestEvent;
  target: number;
  text: string;
  gems: number;
}

export const QUESTS: QuestDef[] = [
  { id: 'months3', event: 'month', target: 3, text: 'Close 3 months', gems: 5 },
  { id: 'months6', event: 'month', target: 6, text: 'Close 6 months', gems: 8 },
  { id: 'profit2', event: 'profit', target: 2, text: 'Make a profit in 2 months', gems: 8 },
  { id: 'decide2', event: 'decision', target: 2, text: 'Answer 2 decisions', gems: 6 },
  { id: 'upgrade1', event: 'upgrade', target: 1, text: 'Buy an upgrade', gems: 8 },
  { id: 'hire1', event: 'hire', target: 1, text: 'Hire someone', gems: 5 },
  { id: 'promo1', event: 'promo', target: 1, text: 'Run a promotion', gems: 6 },
  { id: 'project1', event: 'project', target: 1, text: 'Start an R&D project', gems: 8 },
  { id: 'price1', event: 'price', target: 1, text: 'Change your price', gems: 4 },
  { id: 'board1', event: 'board', target: 1, text: 'Beat a board target', gems: 10 },
];

export const QUESTS_PER_DAY = 3;
export const STREAK_BONUS_GEMS = 5;
export const STREAK_BONUS_CAP = 4;

export interface QuestProgress {
  id: string;
  progress: number;
  claimed: boolean;
}
export interface QuestState {
  day: string;
  items: QuestProgress[];
  /** Days in a row that all three were finished. */
  streak: number;
  /** The last day all three were claimed. */
  lastDone: string | null;
  /** Whether today's all-three bonus was paid. */
  bonusPaid: boolean;
}

export const questDef = (id: string): QuestDef | undefined => QUESTS.find((q) => q.id === id);

/** The three quests for a day: the same for every player, spread across different kinds of goal. */
export function questsForDay(day: string): QuestDef[] {
  const picked: QuestDef[] = [];
  const events = new Set<QuestEvent>();
  let h = hashSeed(`QUESTS-${day}`);
  for (let guard = 0; picked.length < QUESTS_PER_DAY && guard < 200; guard++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const q = QUESTS[h % QUESTS.length];
    if (picked.includes(q) || events.has(q.event)) continue;
    picked.push(q);
    events.add(q.event);
  }
  return picked;
}

const yesterday = (day: string): string => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** The quest state for `day`: a new day starts fresh, and the streak survives only if yesterday was completed. */
export function questsOf(profile: Pick<Profile, 'quests'>, day: string): QuestState {
  const q = profile.quests;
  if (q && q.day === day) return q;
  const streak = q && q.lastDone && (q.lastDone === day || q.lastDone === yesterday(day)) ? q.streak : 0;
  return { day, items: questsForDay(day).map((d) => ({ id: d.id, progress: 0, claimed: false })), streak, lastDone: q?.lastDone ?? null, bonusPaid: false };
}

/** Count an event towards today's quests. */
export function recordQuest<T extends Pick<Profile, 'quests'>>(profile: T, day: string, event: QuestEvent, n = 1): T {
  const state = questsOf(profile, day);
  let changed = state !== profile.quests;
  const items = state.items.map((it) => {
    const def = questDef(it.id);
    if (!def || def.event !== event || it.progress >= def.target) return it;
    changed = true;
    return { ...it, progress: Math.min(def.target, it.progress + n) };
  });
  return changed ? { ...profile, quests: { ...state, items } } : profile;
}

export interface QuestClaim<T> {
  profile: T;
  gems: number;
  bonus: number;
}

/** Claim one finished quest; claiming the third of the day pays the streak bonus. */
export function claimQuest<T extends Pick<Profile, 'quests' | 'gems'>>(profile: T, day: string, id: string): QuestClaim<T> {
  const state = questsOf(profile, day);
  const it = state.items.find((x) => x.id === id);
  const def = questDef(id);
  if (!it || !def) throw new Error('That quest is not on today\'s list.');
  if (it.claimed) throw new Error('Already claimed.');
  if (it.progress < def.target) throw new Error('Not finished yet.');
  const items = state.items.map((x) => (x.id === id ? { ...x, claimed: true } : x));
  let next: QuestState = { ...state, items };
  let bonus = 0;
  if (items.every((x) => x.claimed) && !state.bonusPaid) {
    const streak = state.lastDone === yesterday(day) || state.lastDone === day ? state.streak + 1 : 1;
    bonus = STREAK_BONUS_GEMS * Math.min(STREAK_BONUS_CAP, streak);
    next = { ...next, streak, lastDone: day, bonusPaid: true };
  }
  return { profile: { ...profile, gems: profile.gems + def.gems + bonus, quests: next }, gems: def.gems, bonus };
}
