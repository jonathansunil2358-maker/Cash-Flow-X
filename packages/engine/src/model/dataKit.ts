import type { EvChoice, EvEff, PolEff, PolOption } from './data8';

/** Helpers for writing data files (see data9/*.ts). */
export const off: PolOption = { name: 'Off', blurb: 'Do nothing special.', eff: {} };
/** An option: name, blurb, effects, running cost (% of monthly sales, negative = saving), set-up cost (months of sales). */
export const opt = (name: string, blurb: string, eff: PolEff, monthly = 0, setup = 0): PolOption => ({ name, blurb, eff, monthly, setup });
/** An event choice. */
export const S = (id: string, label: string, hint: string, text: string, rest: Partial<EvChoice> = {}): EvChoice => ({ id, label, hint, text, ...rest });
/** A temporary effect: [multiplier, months]. */
export const E = (d: number, m: number): [number, number] => [d, m];
export type { EvEff };
