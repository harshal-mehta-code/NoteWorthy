/**
 * Minimal music core.
 *
 * A **degree** here is a semitone offset from home, 0-11. That's a change
 * from the earlier 1-7 scale-step numbering, and it's what lets chromatics
 * and minor keys exist at all: ♭7 and ♯4 have no scale-step number, and the
 * third means different things in major and minor.
 *
 * Scope note: this works in MIDI numbers, which is enough for playing and
 * comparing pitches. The real core uses *spelled* pitches (C♯ and D♭ are
 * different notes) — see docs/04-ARCHITECTURE.md §4.1. That lands when
 * notation does, because that's when spelling starts to matter.
 */

/** Semitones above home. */
export type Deg = number;

export type Mode = 'major' | 'minor';

export const DIATONIC: Record<Mode, Deg[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

/** The notes of the home chord — the ones that can sit still. */
export const RESTFUL: Record<Mode, Deg[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
};

/** Numbered labels. Minor spells its own third, sixth and seventh. */
const NUMBER_LABEL: Record<Mode, Record<Deg, string>> = {
  major: {
    0: '1',
    1: '♭2',
    2: '2',
    3: '♭3',
    4: '3',
    5: '4',
    6: '♯4',
    7: '5',
    8: '♭6',
    9: '6',
    10: '♭7',
    11: '7',
  },
  minor: {
    0: '1',
    1: '♭2',
    2: '2',
    3: '♭3',
    4: '♮3',
    5: '4',
    6: '♯4',
    7: '5',
    8: '♭6',
    9: '♮6',
    10: '♭7',
    11: '♮7',
  },
};

/** Chromatic movable-do. Mode-independent, which is the point of it. */
const SOLFEGE_LABEL: Record<Deg, string> = {
  0: 'Do',
  1: 'Ra',
  2: 'Re',
  3: 'Me',
  4: 'Mi',
  5: 'Fa',
  6: 'Fi',
  7: 'Sol',
  8: 'Le',
  9: 'La',
  10: 'Te',
  11: 'Ti',
};

/**
 * Plain descriptions, used in feedback so the label means something musical
 * rather than being trivia. See docs/07-UX-AND-LANGUAGE.md §2.
 */
const NICKNAME: Record<Mode, Record<Deg, string>> = {
  major: {
    0: 'home',
    1: 'the tense one, right next to home',
    2: 'the step above home',
    3: 'the borrowed dark one',
    4: 'the bright one',
    5: 'the leaning one',
    6: 'the sharp outsider',
    7: 'the strong one',
    8: 'the borrowed heavy one',
    9: 'the soft one',
    10: 'the bluesy one',
    11: 'the one that pulls home',
  },
  minor: {
    0: 'home',
    1: 'the tense one, right next to home',
    2: 'the step above home',
    3: 'the dark one',
    4: 'the brightened third',
    5: 'the leaning one',
    6: 'the sharp outsider',
    7: 'the strong one',
    8: 'the heavy one',
    9: 'the lifted sixth',
    10: 'the one just below home',
    11: 'the one that pulls home',
  },
};

export function degreeLabel(deg: Deg, mode: Mode): string {
  return NUMBER_LABEL[mode][deg] ?? String(deg);
}

export function degreeSolfege(deg: Deg): string {
  return SOLFEGE_LABEL[deg] ?? '?';
}

export function degreeNickname(deg: Deg, mode: Mode): string {
  return NICKNAME[mode][deg] ?? '';
}

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

export function keyLabel(key: KeyChoice, mode: Mode): string {
  return mode === 'minor' ? `${key.name} minor` : key.name;
}

/** MIDI note number for a degree, optionally an octave up. */
export function degreeToMidi(tonic: number, deg: Deg, octaveUp = false): number {
  return tonic + deg + (octaveUp ? 12 : 0);
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Concert-pitch name, for showing a singer which note they actually hit. */
export function midiToName(midi: number): string {
  const rounded = Math.round(midi);
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

/** The home chord, voiced so it sits under the melody rather than over it. */
export function tonicTriad(tonic: number, mode: Mode = 'major'): number[] {
  const third = mode === 'minor' ? 3 : 4;
  return [tonic, tonic + 7, tonic + 12, tonic + 12 + third];
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Choose the next degree to ask.
 *
 * Weights bias toward what you've been getting wrong, but every degree keeps
 * a floor so nothing drops out of rotation — practising only your weak spots
 * lets the strong ones quietly rot. An immediate repeat is avoided so the
 * drill never feels stuck on one note.
 */
export function pickDegree(
  pool: readonly Deg[],
  previous: Deg | null,
  weights?: Map<Deg, number>,
): Deg {
  if (pool.length === 0) return 0;
  if (pool.length === 1) return pool[0];

  const options = previous === null ? [...pool] : pool.filter((d) => d !== previous);
  const candidates = options.length ? options : [...pool];

  if (!weights) return pickRandom(candidates);

  const total = candidates.reduce((sum, d) => sum + Math.max(0.2, weights.get(d) ?? 1), 0);
  let roll = Math.random() * total;
  for (const d of candidates) {
    roll -= Math.max(0.2, weights.get(d) ?? 1);
    if (roll <= 0) return d;
  }
  return candidates[candidates.length - 1];
}
