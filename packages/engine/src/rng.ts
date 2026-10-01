/**
 * Seeded randomness. The PRNG state lives inside GameState so a run is fully reproducible
 * from its seed plus its action log (which is what the leaderboard replay relies on).
 */
export interface Rng {
  next(): number;
}

/** mulberry32 bound to a mutable holder (the game state draft). */
export function createRng(holder: { rng: number }): Rng {
  return {
    next() {
      let t = (holder.rng = (holder.rng + 0x6d2b79f5) | 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Expected-value RNG used for forecasts: no noise, no surprise events. */
export const neutralRng: Rng = { next: () => 0.5 };

export const range = (r: Rng, min: number, max: number): number => min + (max - min) * r.next();
export const chance = (r: Rng, p: number): boolean => r.next() < p;
export const intRange = (r: Rng, min: number, max: number): number =>
  Math.min(max, Math.floor(range(r, min, max + 1)));
export const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.min(items.length - 1, Math.floor(r.next() * items.length))];
/** Multiplicative noise centred on 1 (exactly 1 with the neutral RNG). */
export const noise = (r: Rng, spread: number): number => 1 + (r.next() * 2 - 1) * spread;

/** Round a fractional count up or down with probability equal to its fractional part. */
export function roundProb(x: number, r: Rng): number {
  if (x <= 0) return 0;
  const f = Math.floor(x);
  return f + (r.next() < x - f ? 1 : 0);
}

/** Turn any string (e.g. a shareable seed like "LONDON-42") into a 32-bit seed. */
export function hashSeed(input: string | number): number {
  const s = String(input);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
