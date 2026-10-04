import { hashSeed } from '../rng';
import type { GameState } from './state';

/** Customers and brand: the pure parts (read by the modifiers), kept free of imports from events. */
export interface Cust {
  loyalty?: boolean;
  resolved?: string[];
  fixed?: number;
  influencerEnd?: number;
  bfYear?: number;
}
export const custOf = (s: GameState): Cust => (s.cust ??= {});
export const LOYALTY_MIN_MONTH = 6;
export const LOYALTY_COST_RATE = 0.008;
export const loyaltyOn = (s: GameState): boolean => !!s.cust?.loyalty;

// Regular customers: five named people whose mood follows your reputation.
export interface Regular { name: string; quirk: string; needs: number }
const FIRST = ['Mabel', 'Jorge', 'Priya', 'Walt', 'Odette', 'Tariq', 'Sunny', 'Beryl', 'Kofi', 'Ingrid'];
const LAST = ['Pemberton', 'Alvarez', 'Raman', 'Hobbs', 'Dubois', 'Aziz', 'Parks', 'Finch', 'Mensah', 'Lund'];
const QUIRKS = ['always asks for the manager, politely', 'has told the whole street about you', 'brings a flask of tea', 'keeps every receipt', 'writes you very long letters', 'knows your prices better than you do'];
export function regularsOf(s: GameState): Regular[] {
  return [0, 1, 2, 3, 4].map((i) => {
    const h = hashSeed(`${s.seedLabel}:reg:${i}`);
    return { name: `${FIRST[h % FIRST.length]} ${LAST[(h >>> 7) % LAST.length]}`, quirk: QUIRKS[(h >>> 14) % QUIRKS.length], needs: 55 + i * 9 };
  });
}
/** How many regulars are happy right now (reputation at or above what each one expects). */
export const happyRegulars = (s: GameState): number => regularsOf(s).filter((r) => s.reputation >= r.needs).length;
export const regularsBonus = (s: GameState): number => 1 + happyRegulars(s) * 0.005;
