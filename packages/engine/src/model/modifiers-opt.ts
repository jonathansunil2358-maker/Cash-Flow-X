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

/**
 * Company culture: one is picked when a company starts. Each is a small trade-off, not a handicap, so
 * it pays no score bonus. It travels with the modifiers so the server validates and replays it.
 */
export const CULTURES: { id: string; name: string; blurb: string }[] = [
  { id: 'culture-frugal', name: 'Frugal', blurb: 'Unit costs 4% lower, but you are 10% less visible to new customers.' },
  { id: 'culture-bold', name: 'Bold', blurb: 'The market is 4% bigger for you, but costs run 3% higher.' },
  { id: 'culture-people', name: 'People first', blurb: 'Your team gets 5% more done, but costs run 3% higher.' },
  { id: 'culture-steady', name: 'Steady', blurb: 'Banks charge 0.5% less and give you a bigger overdraft, but your brand grows 5% slower.' },
];
export const CULTURE_IDS = CULTURES.map((c) => c.id);
export const cultureOf = (ids: readonly string[] | undefined): string | null => (ids ?? []).find((id) => CULTURE_IDS.includes(id)) ?? null;

/** Keep only known, distinct ids, in a fixed order, and at most one culture. */
export const cleanModifiers = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) return [];
  const culture = CULTURE_IDS.find((id) => ids.includes(id));
  return [...MODIFIER_IDS.filter((id) => ids.includes(id)), ...(culture ? [culture] : [])];
};

/** Score and Legacy multiplier for a list of modifiers: +10% each (a culture pays nothing). */
export const modifierBonus = (ids: readonly string[] | undefined): number => 1 + MODIFIER_BONUS * (ids ?? []).filter((id) => MODIFIER_IDS.includes(id)).length;
