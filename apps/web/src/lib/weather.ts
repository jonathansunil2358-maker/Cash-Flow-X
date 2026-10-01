import { readPref, writePref } from './save';

/** Weather particles on the island: on unless switched off, and never for people who asked for less motion. */
export const isWeatherOn = (): boolean => {
  const saved = readPref('weather');
  if (saved === 'on') return true;
  if (saved === 'off') return false;
  return !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
};
export const setWeatherOn = (on: boolean): void => writePref('weather', on ? 'on' : 'off');
