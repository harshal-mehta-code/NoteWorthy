/**
 * Note reading — naming notes on the stave.
 *
 * Built on **landmarks**, not mnemonics. The usual "Every Good Boy Deserves
 * Fudge" forces you to count up the stave one line at a time, which is a
 * habit you then have to unlearn; landmark recognition scales to ledger
 * lines and stays fast. See docs/01-PEDAGOGY.md §3.2.
 *
 * Notes are addressed by **diatonic index** — the number of letter-names
 * above C0, ignoring accidentals. That is exactly what vertical position on
 * a stave encodes, so it converts to a y-coordinate with one subtraction,
 * and it keeps E♯ and F from colliding on the same line.
 */

import type { Level } from './levels';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

/** Semitones above C for each letter. */
const LETTER_SEMITONES: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export type Clef = 'treble' | 'bass';

/** Letter-names above C0. C4 (middle C) is 4 * 7 + 0 = 28. */
export function diatonicIndex(letter: Letter, octave: number): number {
  return octave * 7 + LETTERS.indexOf(letter);
}

export function letterOf(index: number): Letter {
  return LETTERS[((index % 7) + 7) % 7];
}

export function octaveOf(index: number): number {
  return Math.floor(index / 7);
}

export function indexToMidi(index: number): number {
  return (octaveOf(index) + 1) * 12 + LETTER_SEMITONES[letterOf(index)];
}

export function indexToName(index: number): string {
  return `${letterOf(index)}${octaveOf(index)}`;
}

/** The note sitting on the bottom line of each clef. */
export const BOTTOM_LINE: Record<Clef, number> = {
  treble: diatonicIndex('E', 4),
  bass: diatonicIndex('G', 2),
};

/**
 * Vertical position in half-spaces above the bottom line: 0 is the bottom
 * line, 1 the first space, 2 the second line, and so on. Negative values sit
 * below the stave.
 */
export function staffStep(index: number, clef: Clef): number {
  return index - BOTTOM_LINE[clef];
}

/** Named landmarks, so early levels can teach shapes rather than counting. */
export const LANDMARKS: Record<Clef, number[]> = {
  treble: [diatonicIndex('G', 4), diatonicIndex('C', 5), diatonicIndex('C', 4)],
  bass: [diatonicIndex('F', 3), diatonicIndex('C', 3), diatonicIndex('C', 4)],
};

function level(
  partial: Partial<Level> & Pick<Level, 'id' | 'name' | 'blurb' | 'readRange' | 'clef'>,
): Level {
  return {
    stage: 'naming',
    kind: 'read-note',
    mode: 'major',
    degrees: [],
    intro: 'none',
    drone: false,
    twoOctaves: false,
    sequenceLength: 1,
    keyPerQuestion: false,
    singTolerance: 45,
    roundLength: 8,
    ...partial,
  } as Level;
}

const T = (l: Letter, o: number) => diatonicIndex(l, o);

export const NOTE_READING: Level[] = [
  level({
    id: 1,
    name: 'Three landmarks',
    blurb: 'Middle C, the G on its line, and the C above. Learn these by shape.',
    clef: 'treble',
    readRange: [T('C', 4), T('C', 5)],
    readNotes: LANDMARKS.treble,
  }),
  level({
    id: 2,
    name: 'Around the landmarks',
    blurb: 'The notes either side of the ones you already know.',
    clef: 'treble',
    readRange: [T('C', 4), T('C', 5)],
  }),
  level({
    id: 3,
    name: 'The whole treble stave',
    blurb: 'Bottom line to top line, no ledger lines yet.',
    clef: 'treble',
    readRange: [T('E', 4), T('F', 5)],
  }),
  level({
    id: 4,
    name: 'Above and below',
    blurb: 'Ledger lines, where most readers slow right down.',
    clef: 'treble',
    readRange: [T('A', 3), T('C', 6)],
  }),
  level({
    id: 5,
    name: 'Bass clef landmarks',
    blurb: 'A new clef. The F on its line, and middle C above the stave.',
    clef: 'bass',
    readRange: [T('C', 3), T('C', 4)],
    readNotes: LANDMARKS.bass,
  }),
  level({
    id: 6,
    name: 'The whole bass stave',
    blurb: 'Bottom line to top line in the bass clef.',
    clef: 'bass',
    readRange: [T('G', 2), T('A', 3)],
  }),
  level({
    id: 7,
    name: 'Both clefs',
    blurb: 'Either clef, unannounced. This is what real music looks like.',
    clef: 'both',
    readRange: [T('C', 3), T('A', 5)],
    roundLength: 10,
  }),
];
