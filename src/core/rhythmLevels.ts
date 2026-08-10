/**
 * Read the Rhythm — the rhythm ladder.
 *
 * Reading was note names and nothing else, which is at most half of reading
 * music. This is the other half, and it is deliberately its own course rather
 * than levels bolted onto Read the Note: the answer is a performance rather
 * than a choice, and mixing "which note is this" with "play this" in one
 * ladder would make progress mean two unrelated things.
 *
 * The axes, moved one at a time: which note values are in play, whether rests
 * appear, how many bars, how fast, and whether the click keeps going
 * underneath. That last one is the real step — playing against a click that
 * has dropped out is what actually tests whether you are keeping time or
 * following.
 */

import type { Level } from './levels';
import type { NoteValue } from './rhythm';

function level(
  partial: Partial<Level> &
    Pick<Level, 'id' | 'name' | 'blurb' | 'noteValues' | 'bars' | 'bpm'>,
): Level {
  return {
    stage: 'naming',
    kind: 'tap-rhythm',
    mode: 'major',
    degrees: [],
    intro: 'none',
    drone: false,
    twoOctaves: false,
    sequenceLength: 1,
    keyPerQuestion: false,
    singTolerance: 45,
    roundLength: 4,
    restChance: 0,
    countIn: 4,
    clickThrough: true,
    tapTolerance: 120,
    ...partial,
  } as Level;
}

export const RHYTHM: Level[] = [
  level({
    id: 1,
    name: 'On the beat',
    blurb: 'Quarter notes only. One tap per click — this is about the feel of the pulse.',
    noteValues: ['quarter'] as NoteValue[],
    bars: 1,
    bpm: 80,
    roundLength: 5,
  }),
  level({
    id: 2,
    name: 'Holding on',
    blurb: 'Half and whole notes join in. The gap between taps is the note, not a pause.',
    noteValues: ['quarter', 'half', 'whole'] as NoteValue[],
    bars: 1,
    bpm: 80,
    roundLength: 5,
  }),
  level({
    id: 3,
    name: 'Silence counts',
    blurb: 'Rests. The hardest part of rhythm is the part where you do nothing.',
    noteValues: ['quarter', 'half'] as NoteValue[],
    bars: 1,
    bpm: 80,
    restChance: 0.3,
  }),
  level({
    id: 4,
    name: 'Twice as fast',
    blurb: 'Eighth notes — two to a beat, beamed together so you can see the pairs.',
    noteValues: ['quarter', 'eighth'] as NoteValue[],
    bars: 1,
    bpm: 76,
    tapTolerance: 110,
  }),
  level({
    id: 5,
    name: 'Two bars',
    blurb: 'Twice the length, so you have to keep reading rather than memorise a shape.',
    noteValues: ['quarter', 'half', 'eighth'] as NoteValue[],
    bars: 2,
    bpm: 80,
    restChance: 0.15,
    tapTolerance: 110,
  }),
  level({
    id: 6,
    name: 'On your own',
    blurb: 'The click counts you in and then stops. Now you are keeping time, not following it.',
    noteValues: ['quarter', 'half', 'eighth'] as NoteValue[],
    bars: 2,
    bpm: 80,
    restChance: 0.15,
    clickThrough: false,
    tapTolerance: 130,
  }),
  level({
    id: 7,
    name: 'Off the beat',
    blurb: 'Eighth rests, so notes start between the clicks. This is where syncopation begins.',
    noteValues: ['quarter', 'eighth'] as NoteValue[],
    bars: 2,
    bpm: 72,
    restChance: 0.35,
    tapTolerance: 105,
  }),
  level({
    id: 8,
    name: 'Sixteenths',
    blurb: 'Four to a beat. Slow tempo, fast notes — the usual way in.',
    noteValues: ['quarter', 'eighth', 'sixteenth'] as NoteValue[],
    bars: 1,
    bpm: 60,
    tapTolerance: 95,
  }),
  level({
    id: 9,
    name: 'All of it, alone',
    blurb: 'Everything in play, two bars, and no click once you have started.',
    noteValues: ['quarter', 'half', 'eighth', 'sixteenth'] as NoteValue[],
    bars: 2,
    bpm: 66,
    restChance: 0.2,
    clickThrough: false,
    tapTolerance: 115,
  }),
];
