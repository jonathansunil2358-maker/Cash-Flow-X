import type { MusicMood } from '@cfx/engine';
import { readPref, writePref } from './save';

/**
 * Adaptive background music, made on the fly with the Web Audio API (nothing to download). A slow
 * chord loop whose scale, tempo and brightness follow how the company is doing. Off unless the
 * player switches it on, and never in automated browsers.
 */
export const isMusicOn = (): boolean => readPref('music') === 'on' && !(typeof navigator !== 'undefined' && navigator.webdriver === true);
export const setMusicOn = (on: boolean): void => writePref('music', on ? 'on' : 'off');

interface Style { scale: number[]; beat: number; wave: OscillatorType; gain: number }
const STYLES: Record<MusicMood, Style> = {
  calm: { scale: [0, 2, 4, 7, 9], beat: 0.9, wave: 'sine', gain: 0.035 },
  upbeat: { scale: [0, 2, 4, 5, 7, 9, 11], beat: 0.5, wave: 'triangle', gain: 0.04 },
  tense: { scale: [0, 1, 3, 5, 6, 8], beat: 0.7, wave: 'sawtooth', gain: 0.022 },
};
const ROOT = 196; // G3

/** How each soundtrack bends the three moods: scale, speed and sound. */
interface Flavour { scale?: number[]; beat: number; wave?: OscillatorType; gain: number }
const FLAVOURS: Record<string, Flavour> = {
  gentle: { beat: 1, gain: 1 },
  jazz: { scale: [0, 3, 5, 6, 7, 10], beat: 1.15, wave: 'triangle', gain: 1.05 },
  chiptune: { beat: 0.75, wave: 'square', gain: 0.5 },
  dreamy: { scale: [0, 2, 4, 7, 11], beat: 1.7, wave: 'sine', gain: 1.2 },
};
let flavour = FLAVOURS.gentle;
/** Choose the soundtrack. Unknown ids fall back to the gentle one. */
export function setTrack(id: string): void { flavour = FLAVOURS[id] ?? FLAVOURS.gentle; }

let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let mood: MusicMood = 'calm';
let step = 0;

function context(): AudioContext | null {
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

function note(c: AudioContext, freq: number, at: number, len: number, wave: OscillatorType, gain: number): void {
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.05);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(amp);
  amp.connect(c.destination);
  osc.start(at);
  osc.stop(at + len + 0.05);
}

function tick(): void {
  const c = context();
  if (!c) return;
  const base = STYLES[mood];
  const st: Style = { scale: flavour.scale ?? base.scale, beat: base.beat * flavour.beat, wave: flavour.wave ?? base.wave, gain: base.gain * flavour.gain };
  const degree = st.scale[(step * 3 + (step >> 2)) % st.scale.length];
  const octave = step % 8 === 0 ? 0.5 : step % 3 === 0 ? 2 : 1;
  note(c, ROOT * Math.pow(2, degree / 12) * octave, c.currentTime + 0.02, st.beat * 1.6, st.wave, st.gain);
  if (step % 4 === 0) note(c, ROOT * Math.pow(2, st.scale[0] / 12) * 0.5, c.currentTime + 0.02, st.beat * 3.5, 'sine', st.gain * 1.3);
  step += 1;
  timer = setTimeout(tick, st.beat * 1000);
}

/** Start (or retune) the music. Safe to call repeatedly. */
export function playMusic(m: MusicMood): void {
  mood = m;
  if (timer === null && isMusicOn()) tick();
}

export function stopMusic(): void {
  if (timer !== null) { clearTimeout(timer); timer = null; }
}
