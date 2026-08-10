/**
 * Audio engine.
 *
 * Notes play from sampled piano once the set has loaded (src/audio/sampler.ts),
 * and from a synth until then or if loading fails — so the app always makes
 * sound, including offline before the samples are cached.
 *
 * The rule worth keeping: every sound the app makes is *musical* and in the
 * current key, including the feedback. See docs/03-GAMIFICATION.md §2.
 */

import { midiToHz, tonicTriad, type Mode } from '@/core/music';
import type { IntroMode } from '@/core/levels';
import { loadSamples, playSampled, samplesReady } from './sampler';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function build(): AudioContext {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
 * Safe to call repeatedly. Sample loading starts here but is never awaited.
 */
export async function unlockAudio(): Promise<void> {
  const c = build();
  if (c.state === 'suspended') await c.resume();
  void loadSamples(c);
}

export function usingSamples(): boolean {
  return samplesReady();
}

export function now(): number {
  return build().currentTime;
}

/** Fallback voice: two detuned oscillators through a gentle lowpass. */
function synthVoice(midi: number, at: number, dur: number, level: number): void {
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

function voice(midi: number, at: number, dur: number, level: number): void {
  const c = build();
  if (!master) return;
  if (playSampled(c, master, midi, at, dur, level)) return;
  synthVoice(midi, at, dur, level);
}

function chord(midis: number[], at: number, dur: number, level: number): void {
  const spread = level / Math.sqrt(midis.length);
  midis.forEach((m, i) => voice(m, at + i * 0.008, dur, spread));
}

/** Play a single note now (or at a scheduled time). Returns when it ends. */
export function playNote(midi: number, delay = 0.05, dur = 1.0, level = 0.26): number {
  const at = now() + delay;
  voice(midi, at, dur, level);
  return at + dur;
}

/** Play a sequence of notes with a fixed gap. Returns when the last ends. */
export function playSequence(midis: number[], gap = 0.85, dur = 0.7, level = 0.26): number {
  const start = now() + 0.08;
  midis.forEach((m, i) => voice(m, start + i * gap, dur, level));
  return start + (midis.length - 1) * gap + dur;
}

/**
 * Establish the key before a question.
 *
 * `full` is a I-IV-V-I cadence, `short` is V7-I, `home` is the home chord
 * alone. Returns the time the intro finishes, so the caller can schedule the
 * question right after it.
 */
export function playKeyIntro(
  tonic: number,
  intro: IntroMode,
  mode: Mode = 'major',
  delay = 0.08,
): number {
  const t = now() + delay;
  if (intro === 'none') return t;

  // Minor uses i-iv-V7-i: the dominant keeps its raised third, because that
  // leading tone is most of what makes the key feel resolved.
  const third = mode === 'minor' ? 3 : 4;
  const I = tonicTriad(tonic, mode);
  const IV = [tonic + 5, tonic + 12, tonic + 12 + third + 1, tonic + 21];
  const V7 = [tonic + 7, tonic + 11, tonic + 14, tonic + 17];

  if (intro === 'home') {
    chord(I, t, 0.75, 0.17);
    return t + 0.95;
  }

  if (intro === 'short') {
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

/* ---------------------------------------------------------------- drone --
 * A sustained home note, held under the whole round. It is the training
 * wheel for hearing home: with it sounding you can compare rather than
 * remember, which is what makes the first levels learnable at all.
 */

let droneNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;

export function startDrone(tonic: number): void {
  const c = build();
  if (!master || droneNodes) return;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.7);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = midiToHz(tonic) * 6;
  lp.Q.value = 0.4;

  // Two octaves, lightly detuned, so it reads as a bed rather than a note
  // competing with the question.
  const osc: OscillatorNode[] = [];
  for (const [midi, detune, type] of [
    [tonic - 12, -4, 'sawtooth'],
    [tonic - 12, 5, 'sawtooth'],
    [tonic, -3, 'triangle'],
    [tonic, 4, 'triangle'],
    [tonic + 7, 0, 'sine'],
  ] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = midiToHz(midi);
    o.detune.value = detune;
    o.connect(lp);
    o.start();
    osc.push(o);
  }

  lp.connect(gain);
  gain.connect(master);
  droneNodes = { osc, gain };
}

export function stopDrone(): void {
  if (!droneNodes || !ctx) return;
  const { osc, gain } = droneNodes;
  droneNodes = null;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.forEach((o) => o.stop(t + 0.4));
}

export function droneRunning(): boolean {
  return droneNodes !== null;
}

/* ------------------------------------------------------------- feedback -- */

/**
 * Correct-answer confirmation: the note you just heard, resolving home.
 * As the streak grows the resolution climbs — third, fifth, octave — so a
 * run of correct answers literally sounds like a rising arpeggio.
 */
export function playCorrect(
  tonic: number,
  answered: number,
  streak: number,
  mode: Mode = 'major',
): void {
  const t = now() + 0.02;
  const third = mode === 'minor' ? 3 : 4;
  const top = streak >= 6 ? 12 : streak >= 3 ? 7 : third;
  voice(answered, t, 0.5, 0.24);
  voice(tonic + 12, t + 0.2, 0.72, 0.16);
  voice(tonic + 12 + top, t + 0.2, 0.72, 0.11);
}

/** Confirmation for the yes/no levels, where there's no note to resolve. */
export function playCorrectSimple(tonic: number, heard: number): void {
  const t = now() + 0.02;
  voice(heard, t, 0.45, 0.22);
  voice(tonic + 12, t + 0.24, 0.7, 0.15);
}

/**
 * Wrong-answer feedback: your note, then the real one, then the real one
 * over the home chord. Hearing the contrast is what corrects the mistake —
 * red text on its own teaches nothing about sound.
 */
export function playComparison(
  tonic: number,
  picked: number,
  correct: number,
  mode: Mode = 'major',
): number {
  const t = now() + 0.05;
  voice(picked, t, 0.62, 0.24);
  voice(correct, t + 0.9, 0.62, 0.24);
  chord(tonicTriad(tonic, mode), t + 1.8, 0.85, 0.13);
  voice(correct, t + 1.85, 0.9, 0.24);
  return t + 2.8;
}

/**
 * Wrong-answer feedback when the question was about home itself: the note
 * you heard, then home, so the relationship is the thing you're comparing.
 */
export function playAgainstHome(tonic: number, heard: number): number {
  const t = now() + 0.05;
  voice(heard, t, 0.66, 0.24);
  voice(tonic + 12, t + 0.95, 0.66, 0.22);
  voice(heard, t + 1.85, 0.66, 0.24);
  voice(tonic + 12, t + 1.9, 0.9, 0.18);
  return t + 2.9;
}

/** Session-complete sting: a resolved cadence. Closure, literally. */
export function playSessionEnd(tonic: number, mode: Mode = 'major'): void {
  const t = now() + 0.05;
  const third = mode === 'minor' ? 3 : 4;
  chord([tonic + 7, tonic + 11, tonic + 14, tonic + 17], t, 0.4, 0.15);
  chord([tonic, tonic + 7, tonic + 12 + third, tonic + 24], t + 0.42, 1.3, 0.17);
}

/** Level-up sting: same cadence, fuller and brighter. */
export function playLevelUp(tonic: number): void {
  const t = now() + 0.05;
  chord([tonic + 5, tonic + 12, tonic + 17], t, 0.3, 0.14);
  chord([tonic + 7, tonic + 11, tonic + 14], t + 0.3, 0.3, 0.14);
  chord([tonic, tonic + 7, tonic + 12, tonic + 16, tonic + 19], t + 0.62, 1.5, 0.17);
}

/** Quiet tick used when an answer button is pressed. */
export function playTapTick(midi: number): void {
  voice(midi, now() + 0.005, 0.28, 0.16);
}

/**
 * A metronome click, scheduled on the audio clock.
 *
 * Noise through a tight bandpass rather than a pitched note: a click has to
 * be unmistakably *not* music, or it competes with the rhythm being read and
 * people start hearing it as part of the pattern. Downbeats sit higher and
 * louder so the bar is audible without counting.
 */
export function scheduleClick(at: number, accent = false): void {
  const c = build();
  const dur = 0.045;
  const frames = Math.ceil(c.sampleRate * dur);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // An exponential decay, so it reads as a tick and not a burst.
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 6);
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = accent ? 2400 : 1500;
  band.Q.value = 2.2;

  const gain = c.createGain();
  gain.gain.value = accent ? 0.4 : 0.24;

  source.connect(band);
  band.connect(gain);
  gain.connect(master ?? c.destination);
  source.start(at);
}

/** The audio clock, which is what tap timing has to be measured against. */
export function audioNow(): number {
  return build().currentTime;
}
