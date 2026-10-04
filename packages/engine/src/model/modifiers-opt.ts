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
  { id: 'chaos-mayhem', name: 'Mayhem', blurb: 'Events strike 60% more often, good and bad.' },
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
/** The chaos dial's gentle end: fewer events, at a 10% cost to score and Legacy. Ironman is a badge: no undo and no rebirths. */
export const CALM_ID = 'chaos-calm';
export const IRONMAN_ID = 'ironman';
export const CALM_PENALTY = 0.1;
/** Founder backstory: one is picked at the start. A small edge and a small cost, no score bonus. */
export const ORIGINS: { id: string; name: string; blurb: string }[] = [
  { id: 'origin-banker', name: 'Ex-banker', blurb: 'Banks lend to you more cheaply (1% less) and give a bigger overdraft, but you start with a smaller brand.' },
  { id: 'origin-engineer', name: 'Engineer', blurb: 'Your product quality improves a little every month, but selling does not come naturally: reach is 8% lower.' },
  { id: 'origin-marketer', name: 'Marketer', blurb: 'You start with a stronger brand and it grows 15% faster, but costs run 3% higher.' },
  { id: 'origin-heir', name: 'The heir', blurb: 'You carry on a family name: a stronger brand to start with and banks 0.5% cheaper, but expectations run costs 2% higher. A fresh start for a new generation.' },
  { id: 'origin-dropout', name: 'Scrappy dropout', blurb: 'You know how to do more with less: costs 3% lower. Banks are wary: borrowing costs 1% more.' },
];
export const ORIGIN_IDS = ORIGINS.map((o) => o.id);
export const originOf = (ids: readonly string[] | undefined): string | null => (ids ?? []).find((id) => ORIGIN_IDS.includes(id)) ?? null;
export const CULTURE_IDS = CULTURES.map((c) => c.id);
export const cultureOf = (ids: readonly string[] | undefined): string | null => (ids ?? []).find((id) => CULTURE_IDS.includes(id)) ?? null;

/** Keep only known, distinct ids, in a fixed order, and at most one culture. */
export const cleanModifiers = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) return [];
  const culture = CULTURE_IDS.find((id) => ids.includes(id));
  const optional = MODIFIER_IDS.filter((id) => ids.includes(id));
  // Calm and Mayhem are two ends of one dial: you can only have one.
  const calm = ids.includes(CALM_ID) && !optional.includes('chaos-mayhem');
  const origin = ORIGIN_IDS.find((id) => ids.includes(id));
  return [...optional, ...(calm ? [CALM_ID] : []), ...(ids.includes(IRONMAN_ID) ? [IRONMAN_ID] : []), ...(culture ? [culture] : []), ...(origin ? [origin] : [])];
};

/** Score and Legacy multiplier for a list of modifiers: +10% each (a culture pays nothing). */
export const modifierBonus = (ids: readonly string[] | undefined): number =>
  1 + MODIFIER_BONUS * (ids ?? []).filter((id) => MODIFIER_IDS.includes(id)).length - ((ids ?? []).includes(CALM_ID) ? CALM_PENALTY : 0);

/** How often events strike: 1 normally, more with Mayhem, less with Calm. */
export const eventChanceMult = (ids: readonly string[] | undefined): number => ((ids ?? []).includes('chaos-mayhem') ? 1.6 : (ids ?? []).includes(CALM_ID) ? 0.6 : 1);
