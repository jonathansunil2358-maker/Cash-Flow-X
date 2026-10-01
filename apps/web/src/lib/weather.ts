import { readPref, writePref } from './save';

/** Weather particles on the island: on unless switched off, and never for people who asked for less motion. */
export const isWeatherOn = (): boolean => {
  const saved = readPref('weather');
  if (saved === 'on') return true;
  if (saved === 'off') return false;
  return !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
};
export const setWeatherOn = (on: boolean): void => writePref('weather', on ? 'on' : 'off');

/** Whether the island's day and night follow the player's clock instead of the colour theme. Off unless switched on. */
export const isDayNightOn = (): boolean => readPref('daynight') === 'on';
export const setDayNightOn = (on: boolean): void => writePref('daynight', on ? 'on' : 'off');
/** True in the evening and at night by the local clock. */
export const isEveningNow = (d: Date = new Date()): boolean => d.getHours() >= 19 || d.getHours() < 6;
