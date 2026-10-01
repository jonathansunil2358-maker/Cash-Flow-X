import { MENTORS, bossOf } from './story';
import type { Profile } from './prestige';
import type { Action } from '../actions';
import type { GameState } from './state';

// ---------------------------------------------------------------------------------------------
// Monthly seasons: a theme for the month and a leaderboard of the best verified company
// ---------------------------------------------------------------------------------------------
export interface SeasonTheme { name: string; blurb: string; emoji: string }
const THEMES: SeasonTheme[] = [
  { name: 'New Year, New Venture', blurb: 'Fresh starts. Who can build the most value this month?', emoji: '🎆' },
  { name: 'Cold Snap', blurb: 'Customers are hard to win in the winter. Stay warm and keep growing.', emoji: '❄️' },
  { name: 'Spring Awakening', blurb: 'New growth everywhere. Ride the wave.', emoji: '🌷' },
  { name: 'Showers and Flowers', blurb: 'April brings opportunity and costs. Balance both.', emoji: '🌦️' },
  { name: 'Merry May', blurb: 'Long evenings and busy shops. Make hay.', emoji: '🌞' },
  { name: 'Summer Sprint', blurb: 'Holiday season: a short, bright dash to the top.', emoji: '🏖️' },
  { name: 'Dog Days', blurb: 'The slow season tests who really runs a tight ship.', emoji: '🐕' },
  { name: 'Harvest Time', blurb: 'Gather what you sowed. Reap the rewards of good decisions.', emoji: '🌾' },
  { name: 'Back to Business', blurb: 'September means serious work. Show what you have got.', emoji: '🎒' },
  { name: 'Spooky Season', blurb: 'Scares and surprises. Do not let the economy spook you.', emoji: '🎃' },
  { name: 'Black November', blurb: 'The big sales month. Cash in without cutting your own throat.', emoji: '🛍️' },
  { name: 'Festive Finale', blurb: 'End the year in style: the best value wins the season.', emoji: '🎄' },
];
export const seasonTheme = (id: string = new Date().toISOString().slice(0, 7)): SeasonTheme => THEMES[(Number(id.slice(5, 7)) - 1 + 12) % 12] ?? THEMES[0];

// ---------------------------------------------------------------------------------------------
// Co-op: a friend advises, you decide
// ---------------------------------------------------------------------------------------------
/** Only these kinds of action can be suggested, and only with sensible values. Everything else is refused. */
export const SUGGESTABLE = ['setPrice', 'setMarketing', 'hire', 'fire', 'setPay', 'startPromo', 'setTraining', 'setDesign', 'replyReview', 'setSupplier'] as const;
export function cleanSuggestion(raw: unknown): Action | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isSafeInteger(v) && v >= lo && v <= hi ? v : null);
  switch (a.type) {
    case 'setPrice': { const p = int(a.price, 100, 10_000_000_00); return p === null ? null : { type: 'setPrice', price: p }; }
    case 'setMarketing': { const p = int(a.amount, 0, 100_000_000_00); return p === null ? null : { type: 'setMarketing', amount: p } as Action; }
    case 'hire': case 'fire': { const c = int(a.count, 1, 20); return c === null || !['ops', 'rnd', 'sales'].includes(String(a.role)) ? null : { type: a.type, role: a.role as 'ops', count: c }; }
    case 'setPay': return ['below', 'market', 'above'].includes(String(a.level)) ? { type: 'setPay', level: a.level as 'market' } : null;
    case 'startPromo': { const d = int(a.discountPct, 10, 30); const m = int(a.months, 1, 3); return d === null || m === null || d % 10 !== 0 ? null : { type: 'startPromo', discountPct: d, months: m }; }
    case 'setTraining': { const p = int(a.amount, 0, 1_000_000_00); return p === null ? null : { type: 'setTraining', amount: p }; }
    case 'setDesign': { const f = int(a.features, 0, 100); return f === null ? null : { type: 'setDesign', features: f }; }
    case 'replyReview': { const i = int(a.index, 0, 4); return i === null ? null : { type: 'replyReview', index: i }; }
    case 'setSupplier': return ['budget', 'standard', 'premium'].includes(String(a.supplier)) ? { type: 'setSupplier', supplier: a.supplier as 'budget' } : null;
    default: return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Trading cards: collect the mentors and rival bosses you meet, and gift duplicates
// ---------------------------------------------------------------------------------------------
export type Rarity = 'common' | 'rare' | 'legendary';
export interface Card { id: string; name: string; kind: 'mentor' | 'rival' | 'moment'; rarity: Rarity; text: string; emoji: string }
export const CARDS: Card[] = [
  ...MENTORS.map((m, i): Card => ({ id: `mentor${i}`, name: m.name, kind: 'mentor', rarity: i % 3 === 0 ? 'rare' : 'common', text: `${m.specialty}. "${m.lesson}"`, emoji: '🧑‍🏫' })),
  ...[0, 1, 2, 3, 4].map((i): Card => { const b = bossOf(i); return { id: `rival${i}`, name: b.name, kind: 'rival', rarity: i === 4 ? 'rare' : 'common', text: `"${b.catchphrase}"`, emoji: '😈' }; }),
  { id: 'moment-boss', name: 'Boss slayer', kind: 'moment', rarity: 'rare', text: 'You beat a boss round.', emoji: '⚔️' },
  { id: 'moment-ten', name: 'Ten-million club', kind: 'moment', rarity: 'legendary', text: 'You built a £10m company.', emoji: '👑' },
  { id: 'moment-camp', name: 'Storyteller', kind: 'moment', rarity: 'legendary', text: 'You finished the campaign.', emoji: '📖' },
];
export const cardDef = (id: string): Card | undefined => CARDS.find((c) => c.id === id);
export const cardsOf = (p: Pick<Profile, 'cards'>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.cards ?? {})) if (cardDef(k) && Number.isInteger(v) && v > 0) out[k] = Math.min(v, 99);
  return out;
};
export const cardCount = (p: Pick<Profile, 'cards'>): number => Object.keys(cardsOf(p)).length;
export function addCard<T extends Pick<Profile, 'cards'>>(p: T, id: string): T {
  if (!cardDef(id)) return p;
  const c = cardsOf(p);
  c[id] = (c[id] ?? 0) + 1;
  return { ...p, cards: c };
}
/** Cards a company has earned so far (the same company always earns the same ones). */
export function cardsEarnedBy(s: GameState): string[] {
  const out: string[] = [];
  const years = Math.floor(s.month / 12);
  for (let i = 0; i < Math.min(years, MENTORS.length); i++) out.push(`mentor${i}`);
  s.competitors.forEach((_, i) => { if (s.month >= 6) out.push(`rival${i % 5}`); });
  if ((s.bossesBeaten ?? 0) > 0) out.push('moment-boss');
  if ((s.history.at(-1)?.valuation?.equityValue ?? 0) >= 10_000_000_00) out.push('moment-ten');
  return Array.from(new Set(out));
}
/** Keep track of which of a company's cards have already been handed out, so each is given once per company. */
export function collectCards<T extends Pick<Profile, 'cards' | 'cardsSeen'>>(p: T, s: GameState): { profile: T; gained: string[] } {
  const seen = new Set(p.cardsSeen ?? []);
  const gained: string[] = [];
  let next = p;
  for (const id of cardsEarnedBy(s)) {
    const key = `${s.seedLabel}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next = addCard(next, id);
    gained.push(id);
  }
  return gained.length ? { profile: { ...next, cardsSeen: Array.from(seen).slice(-300) }, gained } : { profile: p, gained };
}
/** Take one duplicate out of your collection to gift. You always keep at least one of each card. */
export function takeForGift<T extends Pick<Profile, 'cards'>>(p: T, id: string): T {
  const c = cardsOf(p);
  if (!c[id] || c[id] < 2) throw new Error('You can only gift a spare copy.');
  return { ...p, cards: { ...c, [id]: c[id] - 1 } };
}
