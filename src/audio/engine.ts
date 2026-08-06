/**
 * Audio engine — first pass.
 *
 * Everything here is synthesised. Sampled piano (smplr) arrives with WP-02;
 * this synth stays as the offline fallback, so the app always makes sound.
 *
 * The one rule worth keeping: every sound the app makes is *musical* and in
 * the current key, including the feedback. See docs/03-GAMIFICATION.md §2.
 */

import { midiToHz, tonicTriad } from '@/core/music';
import type { IntroMode } from '@/core/levels';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

function build(): AudioContext {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();

  // A limiter, so stacked chords never clip on phone speakers.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;

  master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  return ctx;
}

/**
 * Browsers only allow audio after a user gesture. Call this from a click.
 * Safe to call repeatedly.
 */
export async function unlockAudio(): Promise<void> {
  const c = build();
  if (c.state === 'suspended') await c.resume();
  unlocked = true;
}

export function isUnlocked(): boolean {
  return unlocked && ctx !== null && ctx.state === 'running';
}

export function now(): number {
  return build().currentTime;
}

export function setVolume(v: number): void {
  build();
  if (master) master.gain.value = Math.max(0, Math.min(1, v));
}

/** A single warm note: two detuned oscillators through a gentle lowpass. */
function voice(midi: number, at: number, dur: number, level: number): void {
  const c = build();
  if (!master) return;
  const hz = midiToHz(midi);

  const gain = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(8000, hz * 8), at);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, hz * 3), at + dur * 0.7);
  lp.Q.value = 0.5;

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.014);
  gain.gain.exponentialRampToValueAtTime(level * 0.34, at + Math.min(0.3, dur * 0.5));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  for (const [type, detune] of [
    ['triangle', -5],
    ['sine', 5],
  ] as const) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    osc.detune.value = detune;
    osc.connect(lp);
    osc.start(at);
    osc.stop(at + dur + 0.06);
  }

  lp.connect(gain);
  gain.connect(master);
}

function chord(midis: number[], at: number, dur: number, level: number): void {
  const spread = level / Math.sqrt(midis.length);
  midis.forEach((m, i) => voice(m, at + i * 0.006, dur, spread));
}

/** Play a single note now (or at a scheduled time). Returns when it ends. */
export function playNote(midi: number, delay = 0.05, dur = 1.0, level = 0.26): number {
  const at = now() + delay;
  voice(midi, at, dur, level);
  return at + dur;
}

/**
 * Establish the key before a question.
 *
 * `full` is a I-IV-V-I cadence, `short` is V7-I, `home` is the home chord
 * alone. Returns the time the intro finishes, so the caller can schedule the
 * question right after it.
 */
export function playKeyIntro(tonic: number, mode: IntroMode, delay = 0.08): number {
  const t = now() + delay;
  if (mode === 'none') return t;

  const I = tonicTriad(tonic);
  const IV = [tonic + 5, tonic + 12, tonic + 17, tonic + 21];
  const V7 = [tonic + 7, tonic + 11, tonic + 14, tonic + 17];

  if (mode === 'home') {
    chord(I, t, 0.75, 0.17);
    return t + 0.95;
  }

  if (mode === 'short') {
    chord(V7, t, 0.44, 0.16);
    chord(I, t + 0.46, 0.72, 0.17);
    return t + 1.32;
  }

  chord(I, t, 0.42, 0.16);
  chord(IV, t + 0.42, 0.42, 0.16);
  chord(V7, t + 0.84, 0.42, 0.16);
  chord(I, t + 1.26, 0.66, 0.17);
  return t + 2.0;
}

/**
 * Correct-answer confirmation: the note you just heard, resolving home.
 * As the streak grows the resolution climbs — third, fifth, octave — so a
 * run of correct answers literally sounds like a rising arpeggio.
 */
export function playCorrect(tonic: number, answered: number, streak: number): void {
  const t = now() + 0.02;
  const top = streak >= 6 ? 12 : streak >= 3 ? 7 : 4;
  voice(answered, t, 0.5, 0.24);
  voice(tonic + 12, t + 0.2, 0.72, 0.16);
  voice(tonic + 12 + top, t + 0.2, 0.72, 0.11);
}

/**
 * Wrong-answer feedback: your note, then the real one, then the real one
 * over the home chord. Hearing the contrast is what corrects the mistake —
 * red text on its own teaches nothing about sound.
 */
export function playComparison(tonic: number, picked: number, correct: number): number {
  const t = now() + 0.05;
  voice(picked, t, 0.62, 0.24);
  voice(correct, t + 0.9, 0.62, 0.24);
  chord(tonicTriad(tonic), t + 1.8, 0.85, 0.13);
  voice(correct, t + 1.85, 0.9, 0.24);
  return t + 2.8;
}

/** Session-complete sting: a resolved cadence. Closure, literally. */
export function playSessionEnd(tonic: number): void {
  const t = now() + 0.05;
  chord([tonic + 7, tonic + 11, tonic + 14, tonic + 17], t, 0.4, 0.15);
  chord([tonic, tonic + 7, tonic + 16, tonic + 24], t + 0.42, 1.3, 0.17);
}

/** Level-up sting: same cadence, fuller and brighter. */
export function playLevelUp(tonic: number): void {
  const t = now() + 0.05;
  chord([tonic + 5, tonic + 12, tonic + 17], t, 0.3, 0.14);
  chord([tonic + 7, tonic + 11, tonic + 14], t + 0.3, 0.3, 0.14);
  chord([tonic, tonic + 7, tonic + 12, tonic + 16, tonic + 19], t + 0.62, 1.5, 0.17);
}

/** Quiet tick used when a step button is pressed, so taps feel connected. */
export function playTapTick(midi: number): void {
  voice(midi, now() + 0.005, 0.28, 0.16);
}
