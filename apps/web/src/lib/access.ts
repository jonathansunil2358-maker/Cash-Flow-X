import { readPref, writePref } from './save';

/**
 * Accessibility settings, kept on the device and applied as data attributes on the page, so the stylesheet
 * does the rest: a dyslexia-friendly font, bigger text, colour-blind-safe colours, less motion and keyboard shortcuts.
 */
export type FontChoice = 'default' | 'readable';
export type SizeChoice = '100' | '115' | '130';
export type ColourChoice = 'default' | 'safe';
export interface Access { font: FontChoice; size: SizeChoice; colours: ColourChoice; calm: boolean; keys: boolean }

const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T => (v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback);
export function readAccess(): Access {
  return {
    font: pick(readPref('a11y-font'), ['default', 'readable'], 'default'),
    size: pick(readPref('a11y-size'), ['100', '115', '130'], '100'),
    colours: pick(readPref('a11y-colours'), ['default', 'safe'], 'default'),
    calm: readPref('a11y-calm') === 'on',
    keys: readPref('a11y-keys') !== 'off',
  };
}
export function writeAccess(patch: Partial<Access>): Access {
  const next = { ...readAccess(), ...patch };
  writePref('a11y-font', next.font);
  writePref('a11y-size', next.size);
  writePref('a11y-colours', next.colours);
  writePref('a11y-calm', next.calm ? 'on' : 'off');
  writePref('a11y-keys', next.keys ? 'on' : 'off');
  applyAccess(next);
  return next;
}
export function applyAccess(a: Access = readAccess()): void {
  if (typeof document === 'undefined') return;
  const d = document.documentElement.dataset;
  d.font = a.font;
  d.size = a.size;
  d.colours = a.colours;
  d.calm = a.calm ? 'on' : 'off';
}

/** Single-key shortcuts for the bottom bar. */
export const SHORTCUTS: Record<string, string> = { b: 'Business', u: 'Upgrades', f: 'Finance', m: 'Missions', k: 'Books', p: 'Prestige', s: 'Settings' };
