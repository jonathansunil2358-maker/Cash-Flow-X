import { readPref, writePref } from './save';

/**
 * Sound effects and haptics. Every sound is synthesised with the Web Audio API (no files to
 * download), the audio context is only created once the player has done something (browsers
 * insist on a gesture), and vibration is a small nudge on phones that support it. Both are
 * switchable in Settings, and off by default for automated browsers and for people who have
 * asked their device to reduce motion.
 */
export type Sound = 'click' | 'coin' | 'success' | 'warn' | 'event' | 'fanfare';
type Pref = 'sfx' | 'haptics';

const NOTES: Record<Sound, { freqs: number[]; step: number; len: number; type: OscillatorType; gain: number }> = {
  click: { freqs: [660], step: 0, len: 0.06, type: 'sine', gain: 0.08 },
  coin: { freqs: [880, 1320], step: 0.07, len: 0.14, type: 'square', gain: 0.05 },
  success: { freqs: [523, 659, 784], step: 0.08, len: 0.2, type: 'triangle', gain: 0.1 },
  warn: { freqs: [220, 165], step: 0.12, len: 0.25, type: 'sawtooth', gain: 0.06 },
  event: { freqs: [392, 523], step: 0.1, len: 0.22, type: 'sine', gain: 0.1 },
  fanfare: { freqs: [523, 659, 784, 1047], step: 0.1, len: 0.3, type: 'triangle', gain: 0.12 },
};

const BUZZ: Record<Sound, number[]> = {
  click: [5], coin: [10], success: [15, 30, 15], warn: [40], event: [20], fanfare: [20, 40, 20, 40, 60],
};

const automated = (): boolean => typeof navigator !== 'undefined' && navigator.webdriver === true;
const reducedMotion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function isOn(pref: Pref): boolean {
  const saved = readPref(pref);
  if (saved === 'on') return true;
  if (saved === 'off') return false;
  return pref === 'sfx' ? !automated() : !automated() && !reducedMotion();
}

export const isSoundOn = (): boolean => isOn('sfx');
export const isHapticsOn = (): boolean => isOn('haptics');
export const setSoundOn = (on: boolean): void => writePref('sfx', on ? 'on' : 'off');
export const setHapticsOn = (on: boolean): void => writePref('haptics', on ? 'on' : 'off');

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, at: number, len: number, type: OscillatorType, gain: number): void {
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(amp);
  amp.connect(c.destination);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

/** Play a sound and/or nudge the phone, according to the player's settings. Never throws. */
export function playSound(sound: Sound): void {
  try {
    if (isSoundOn()) {
      const c = audio();
      if (c) {
        const n = NOTES[sound];
        n.freqs.forEach((f, i) => tone(c, f, c.currentTime + i * n.step, n.len, n.type, n.gain));
      }
    }
    if (isHapticsOn() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(BUZZ[sound]);
  } catch {
    /* sound is a nicety: never break the game over it */
  }
}
