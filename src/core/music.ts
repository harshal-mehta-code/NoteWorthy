/**
 * Minimal music core for the first pass.
 *
 * Scope note: this deliberately works in MIDI numbers, which is enough for
 * playing back and comparing pitches. The real core uses *spelled* pitches
 * (C# and Db are different notes) — see docs/04-ARCHITECTURE.md §4.1. That
 * lands when notation does, because that's when spelling starts to matter.
 */

/** Semitone offsets of the seven major-scale steps from the home note. */
export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;

/** Movable-do syllables, indexed by step number - 1. */
export const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'] as const;

/**
 * Plain-language names for each step of the key. Shown in feedback so the
 * number means something musical rather than being trivia.
 */
export const STEP_NICKNAME: Record<number, string> = {
  1: 'home',
  2: 'the step above home',
  3: 'the bright one',
  4: 'the leaning one',
  5: 'the strong one',
  6: 'the soft one',
  7: 'the one that pulls home',
};

export type KeyChoice = { name: string; tonic: number };

/** A small set of comfortable keys. C is the default: no sharps, no flats. */
export const KEYS: KeyChoice[] = [
  { name: 'C', tonic: 60 },
  { name: 'D', tonic: 62 },
  { name: 'E♭', tonic: 63 },
  { name: 'F', tonic: 65 },
  { name: 'G', tonic: 55 },
  { name: 'A', tonic: 57 },
];

export const DEFAULT_KEY = KEYS[0];

const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** MIDI note number for a scale step (1-7), optionally an octave up. */
export function stepToMidi(tonic: number, step: number, octaveUp = false): number {
  const semitones = MAJOR_STEPS[step - 1];
  return tonic + semitones + (octaveUp ? 12 : 0);
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${Math.floor(midi / 12) - 1}`;
}

/** The home chord, voiced so it sits under the melody rather than over it. */
export function tonicTriad(tonic: number): number[] {
  return [tonic, tonic + 7, tonic + 12, tonic + 16];
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Choose the next step to ask, avoiding an immediate repeat so the drill
 * never feels stuck on one note.
 */
export function pickStep(pool: readonly number[], previous: number | null): number {
  if (pool.length === 1) return pool[0];
  const options = previous === null ? pool : pool.filter((s) => s !== previous);
  return pickRandom(options.length ? options : pool);
}
