import type { Profile } from './prestige';

/** A company logo: a shape, two colours and the business icon. Cosmetic only. */
export type LogoShape = 'circle' | 'square' | 'shield' | 'hex';
export interface Logo {
  shape: LogoShape;
  bg: string;
  fg: string;
}
export const LOGO_SHAPES: LogoShape[] = ['circle', 'square', 'shield', 'hex'];
export const LOGO_COLOURS = ['#1f78d1', '#d93a2f', '#2f9420', '#8e3fe6', '#ff8a1f', '#22b8c7', '#ffc633', '#2b2f36', '#ffffff', '#ff6fae'];
export const DEFAULT_LOGO: Logo = { shape: 'circle', bg: '#1f78d1', fg: '#ffffff' };

const isColour = (c: unknown): c is string => typeof c === 'string' && LOGO_COLOURS.includes(c);

/** The saved logo with anything unknown replaced by the default (so old and odd saves always load). */
export function logoOf(p: Pick<Profile, 'logo'>): Logo {
  const l = p.logo;
  return {
    shape: l && LOGO_SHAPES.includes(l.shape) ? l.shape : DEFAULT_LOGO.shape,
    bg: isColour(l?.bg) ? l!.bg : DEFAULT_LOGO.bg,
    fg: isColour(l?.fg) ? l!.fg : DEFAULT_LOGO.fg,
  };
}

export function setLogo<T extends Pick<Profile, 'logo'>>(p: T, logo: Partial<Logo>): T {
  const next = { ...logoOf(p), ...logo };
  if (!LOGO_SHAPES.includes(next.shape) || !isColour(next.bg) || !isColour(next.fg)) throw new Error('That logo is not available.');
  return { ...p, logo: next };
}
