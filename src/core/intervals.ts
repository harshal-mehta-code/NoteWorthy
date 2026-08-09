/**
 * Intervals — the supporting ear-training track.
 *
 * Deliberately the *second* ear course, not the first. Interval training in
 * isolation famously produces people who ace interval quizzes and still
 * can't work out a song, because real melodies are heard against a key
 * rather than as a chain of distances (docs/01-PEDAGOGY.md §2.1). It earns
 * its place for wide leaps, atonal lines and instrument transposition — so
 * it's here, just not first.
 */

import type { Level } from './levels';

export type IntervalDirection = 'up' | 'down' | 'both' | 'harmonic';

export const INTERVAL_SHORT: Record<number, string> = {
  1: 'm2',
  2: 'M2',
  3: 'm3',
  4: 'M3',
  5: 'P4',
  6: 'TT',
  7: 'P5',
  8: 'm6',
  9: 'M6',
  10: 'm7',
  11: 'M7',
  12: 'P8',
};

export const INTERVAL_LONG: Record<number, string> = {
  1: 'Minor 2nd',
  2: 'Major 2nd',
  3: 'Minor 3rd',
  4: 'Major 3rd',
  5: 'Perfect 4th',
  6: 'Tritone',
  7: 'Perfect 5th',
  8: 'Minor 6th',
  9: 'Major 6th',
  10: 'Minor 7th',
  11: 'Major 7th',
  12: 'Octave',
};

/**
 * How each one *feels*, rather than a song reference. Song mnemonics are
 * culture-specific and stop working the moment the interval appears
 * anywhere but the start of a tune; character generalises.
 */
export const INTERVAL_CHARACTER: Record<number, string> = {
  1: 'the tightest step there is — tense, almost a clash',
  2: 'an ordinary step, the way scales move',
  3: 'small and shaded, the sound of a minor chord',
  4: 'bright and open, the sound of a major chord',
  5: 'solid and slightly suspended, wanting to resolve',
  6: 'restless and unsettled — the interval that needs to move',
  7: 'wide open and stable, the strongest sound after the octave',
  8: 'a stretch with a darker colour',
  9: 'a stretch with a warm, hopeful colour',
  10: 'wide and bluesy, the top of a dominant chord',
  11: 'wide and sharp, just short of the octave',
  12: 'the same note, higher — nothing changes but the height',
};

const DIRECTION_LABEL: Record<IntervalDirection, string> = {
  up: 'upwards',
  down: 'downwards',
  both: 'either direction',
  harmonic: 'both at once',
};

export function directionLabel(d: IntervalDirection): string {
  return DIRECTION_LABEL[d];
}

function level(partial: Partial<Level> & Pick<Level, 'id' | 'name' | 'blurb' | 'intervalSet'>): Level {
  return {
    stage: 'naming',
    kind: 'interval-id',
    mode: 'major',
    degrees: [],
    intro: 'none',
    drone: false,
    twoOctaves: false,
    sequenceLength: 2,
    keyPerQuestion: false,
    singTolerance: 45,
    roundLength: 6,
    intervalDirection: 'up',
    ...partial,
  } as Level;
}

export const INTERVALS: Level[] = [
  level({
    id: 1,
    name: 'The two widest',
    blurb: 'Just the fifth and the octave — the two most open sounds.',
    intervalSet: [7, 12],
  }),
  level({
    id: 2,
    name: 'Major or minor third',
    blurb: 'The pair that decides whether music sounds bright or shaded.',
    intervalSet: [3, 4, 7, 12],
  }),
  level({
    id: 3,
    name: 'Steps as well',
    blurb: 'Add the two smallest intervals, the ones scales are made of.',
    intervalSet: [1, 2, 3, 4, 7, 12],
  }),
  level({
    id: 4,
    name: 'Fourth and tritone',
    blurb: 'The perfect fourth, and the restless interval that sits beside it.',
    intervalSet: [1, 2, 3, 4, 5, 6, 7, 12],
  }),
  level({
    id: 5,
    name: 'Sixths and sevenths',
    blurb: 'Every interval inside an octave is now in play.',
    intervalSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  }),
  level({
    id: 6,
    name: 'Downwards',
    blurb: 'The same intervals falling. They sound different, and catch most people out.',
    intervalSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    intervalDirection: 'down',
  }),
  level({
    id: 7,
    name: 'Either direction',
    blurb: 'Up or down, unannounced.',
    intervalSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    intervalDirection: 'both',
    roundLength: 8,
  }),
  level({
    id: 8,
    name: 'Both at once',
    blurb: 'Harmonic intervals — both notes together, with no shape to follow.',
    intervalSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    intervalDirection: 'harmonic',
    roundLength: 8,
  }),
];
