/**
 * Chords — quality first, then inversion.
 *
 * Quality before function, deliberately. "Is that major or minor?" is the
 * question people actually have when they hear a record, and it transfers
 * immediately; roman-numeral function needs a key established and is a
 * bigger step (docs/02-FEATURES.md §1.4). Function arrives with the
 * progression course.
 *
 * Voicings are randomised from level 1. A fixed voicing lets you memorise
 * one specific sound instead of learning what a quality *is*, which is the
 * single most common way chord training quietly fails.
 */

import type { Level } from './levels';

export type ChordQuality =
  | 'maj'
  | 'min'
  | 'dim'
  | 'aug'
  | 'maj7'
  | 'min7'
  | 'dom7'
  | 'm7b5';

/** Canonical order — also the numeric key used for per-item stats. */
export const CHORD_ORDER: ChordQuality[] = [
  'maj',
  'min',
  'dim',
  'aug',
  'maj7',
  'min7',
  'dom7',
  'm7b5',
];

export const CHORD_SEMITONES: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
};

export const CHORD_SHORT: Record<ChordQuality, string> = {
  maj: 'Major',
  min: 'Minor',
  dim: 'Dim',
  aug: 'Aug',
  maj7: 'Maj7',
  min7: 'Min7',
  dom7: 'Dom7',
  m7b5: 'm7♭5',
};

export const CHORD_LONG: Record<ChordQuality, string> = {
  maj: 'Major',
  min: 'Minor',
  dim: 'Diminished',
  aug: 'Augmented',
  maj7: 'Major seventh',
  min7: 'Minor seventh',
  dom7: 'Dominant seventh',
  m7b5: 'Half-diminished',
};

/** What each one sounds like, in plain words rather than theory. */
export const CHORD_CHARACTER: Record<ChordQuality, string> = {
  maj: 'bright and settled — the sound of an ending',
  min: 'the same shape with the middle note lowered, and it goes shaded',
  dim: 'squeezed and anxious; both gaps are small',
  aug: 'stretched and unresolved, with no note that feels like the root',
  maj7: 'bright but dreamy — the seventh rubs gently against the root',
  min7: 'shaded and relaxed, the workhorse chord of soul and jazz',
  dom7: 'bright on top, restless underneath. It wants to go somewhere',
  m7b5: 'dark and unstable, usually a signpost that a minor ii-V is coming',
};

export const INVERSION_LABEL = ['Root', '1st', '2nd', '3rd'];

export const INVERSION_LONG = [
  'Root position — the root is at the bottom',
  'First inversion — the third is at the bottom',
  'Second inversion — the fifth is at the bottom',
  'Third inversion — the seventh is at the bottom',
];

/**
 * Build a chord as MIDI notes.
 *
 * Inversions move lower notes up an octave rather than transposing the
 * whole shape, so the bass note genuinely changes — which is the thing the
 * inversion levels are asking you to hear.
 */
export function buildChord(
  root: number,
  quality: ChordQuality,
  inversion = 0,
  spread = false,
): number[] {
  const notes = CHORD_SEMITONES[quality].map((s) => root + s);
  for (let i = 0; i < inversion % notes.length; i++) {
    notes.push(notes.shift()! + 12);
  }
  if (spread && notes.length > 2) {
    // Drop-2: lift the second note from the top an octave, which is how
    // these chords are actually voiced on a keyboard.
    const idx = notes.length - 2;
    notes[idx] += 12;
  }
  return [...notes].sort((a, b) => a - b);
}

function level(
  partial: Partial<Level> & Pick<Level, 'id' | 'name' | 'blurb' | 'chordSet'>,
): Level {
  return {
    stage: 'naming',
    kind: 'chord-quality',
    mode: 'major',
    degrees: [],
    intro: 'none',
    drone: false,
    twoOctaves: false,
    sequenceLength: 1,
    keyPerQuestion: false,
    singTolerance: 45,
    roundLength: 6,
    chordInversions: false,
    chordBroken: false,
    ...partial,
  } as Level;
}

export const CHORDS: Level[] = [
  level({
    id: 1,
    name: 'Bright or dark',
    blurb: 'Major or minor. One note moves, and the whole mood changes.',
    chordSet: ['maj', 'min'],
    roundLength: 8,
  }),
  level({
    id: 2,
    name: 'The tense two',
    blurb: 'Add diminished and augmented — the ones that refuse to settle.',
    chordSet: ['maj', 'min', 'dim', 'aug'],
  }),
  level({
    id: 3,
    name: 'The dominant seventh',
    blurb: 'A major chord with a restless note on top. The engine of most music.',
    chordSet: ['maj', 'min', 'dom7'],
  }),
  level({
    id: 4,
    name: 'The four sevenths',
    blurb: 'Major, minor, dominant and half-diminished. Jazz lives here.',
    chordSet: ['maj7', 'min7', 'dom7', 'm7b5'],
  }),
  level({
    id: 5,
    name: 'All of them',
    blurb: 'Every triad and every seventh, unannounced.',
    chordSet: ['maj', 'min', 'dim', 'aug', 'maj7', 'min7', 'dom7', 'm7b5'],
  }),
  level({
    id: 6,
    name: 'Which note is at the bottom',
    blurb: 'Same chords, but now name the inversion. This trains bass hearing.',
    kind: 'chord-inversion',
    chordSet: ['maj', 'min'],
    chordInversions: true,
  }),
  level({
    id: 7,
    name: 'Spread out and broken',
    blurb: 'Wide voicings, and chords that arrive one note at a time.',
    chordSet: ['maj', 'min', 'dim', 'aug', 'maj7', 'min7', 'dom7', 'm7b5'],
    chordInversions: true,
    chordBroken: true,
    roundLength: 8,
  }),
];
