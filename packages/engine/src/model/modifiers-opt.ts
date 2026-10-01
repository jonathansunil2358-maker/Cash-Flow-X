/**
 * Optional handicaps chosen when a company is started. Each makes the game harder and pays a bonus on
 * the final score and on Legacy points, so a tougher game is worth more. Not available in the daily,
 * weekly or friend challenges (those are a level field) or on Hard (which already has its own rules).
 */
export interface OptionalModifier {
  id: string;
  name: string;
  blurb: string;
}
export const OPTIONAL_MODIFIERS: OptionalModifier[] = [
  { id: 'aggressive-rivals', name: 'Aggressive rivals', blurb: 'Rivals cut prices and launch products 50% more often.' },
  { id: 'tight-credit', name: 'Tight credit', blurb: 'Banks lend 40% less and charge 1% more.' },
  { id: 'slow-market', name: 'Slow market', blurb: 'Demand is 10% lower for the whole game.' },
  { id: 'inflation', name: 'Runaway inflation', blurb: 'Wages rise 10% a year instead of 5%.' },
];
export const MODIFIER_IDS = OPTIONAL_MODIFIERS.map((m) => m.id);
export const MODIFIER_BONUS = 0.1;

/** Keep only known, distinct ids, in a fixed order. */
export const cleanModifiers = (ids: unknown): string[] =>
  Array.isArray(ids) ? MODIFIER_IDS.filter((id) => ids.includes(id)) : [];

/** Score and Legacy multiplier for a list of modifiers: +10% each. */
export const modifierBonus = (ids: readonly string[] | undefined): number => 1 + MODIFIER_BONUS * (ids?.length ?? 0);
