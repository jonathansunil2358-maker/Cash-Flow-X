import type { Profile } from './prestige';
import { termOf } from './glossary';

/** What the player has learned: daily puzzle answers (one reward per kind per day) and the terms they have met. */
export interface LearnState {
  spotDay?: string;
  spotRight?: boolean;
  detectiveDay?: string;
  detectiveRight?: boolean;
  solved?: number;
  terms?: string[];
}
export const LEARN_REWARD_GEMS = 5;
export type PuzzleKind = 'spot' | 'detective';

export const learnOf = (p: Pick<Profile, 'learn'>): LearnState => p.learn ?? {};

/** Has this kind of puzzle already been answered today? */
export const answeredToday = (p: Pick<Profile, 'learn'>, kind: PuzzleKind, day: string): { done: boolean; right: boolean } => {
  const l = learnOf(p);
  return kind === 'spot' ? { done: l.spotDay === day, right: !!l.spotRight } : { done: l.detectiveDay === day, right: !!l.detectiveRight };
};

/** Record the first answer of the day. A right answer pays gems; later tries pay nothing and change nothing. */
export function recordAnswer<T extends Pick<Profile, 'learn' | 'gems'>>(p: T, kind: PuzzleKind, day: string, right: boolean): { profile: T; gems: number } {
  if (answeredToday(p, kind, day).done) return { profile: p, gems: 0 };
  const l = learnOf(p);
  const next: LearnState = {
    ...l,
    ...(kind === 'spot' ? { spotDay: day, spotRight: right } : { detectiveDay: day, detectiveRight: right }),
    solved: (l.solved ?? 0) + (right ? 1 : 0),
  };
  const gems = right ? LEARN_REWARD_GEMS : 0;
  return { profile: { ...p, learn: next, gems: p.gems + gems }, gems };
}

/** Mark a glossary term as met. Unknown ids are ignored. */
export function seeTerm<T extends Pick<Profile, 'learn'>>(p: T, id: string): T {
  if (!termOf(id)) return p;
  const l = learnOf(p);
  if ((l.terms ?? []).includes(id)) return p;
  return { ...p, learn: { ...l, terms: [...(l.terms ?? []), id] } };
}
export const termSeen = (p: Pick<Profile, 'learn'>, id: string): boolean => (learnOf(p).terms ?? []).includes(id);
