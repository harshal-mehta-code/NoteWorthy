/**
 * Sing a Phrase — the vocal ladder.
 *
 * Find the Note's stage 4 asks for one note at a time, which is pitch
 * matching. Music is not made of isolated notes, and the jump from producing
 * one to producing a line is where most people stall: holding a phrase in
 * your head while your voice is busy executing it is a different skill from
 * hitting a target.
 *
 * The ladder moves along two axes, one at a time — how many notes, and how
 * fast they come. The later levels are the agility work: scale runs, up and
 * then down, at a speed that leaves no time to hunt for each note.
 */

import type { Level } from './levels';
import { DIATONIC, type Deg } from './music';

const MAJOR = DIATONIC.major;

function level(
  partial: Partial<Level> & Pick<Level, 'id' | 'name' | 'blurb' | 'degrees' | 'sequenceLength'>,
): Level {
  return {
    stage: 'voice',
    kind: 'sing-phrase',
    mode: 'major',
    intro: 'full',
    drone: false,
    twoOctaves: false,
    keyPerQuestion: false,
    singTolerance: 55,
    roundLength: 5,
    phraseShape: 'free',
    phraseGap: 0.62,
    phraseHoldMs: 260,
    ...partial,
  } as Level;
}

export const SING_PHRASES: Level[] = [
  level({
    id: 1,
    name: 'Two notes, side by side',
    blurb: 'Hear two notes, sing them back. Nothing moves further than a step.',
    degrees: [0, 2, 4] as Deg[],
    sequenceLength: 2,
    roundLength: 6,
  }),
  level({
    id: 2,
    name: 'Two notes, further apart',
    blurb: 'The same two-note shape, but now they can leap.',
    degrees: [0, 4, 7] as Deg[],
    sequenceLength: 2,
    roundLength: 6,
  }),
  level({
    id: 3,
    name: 'Three notes',
    blurb: 'One more to hold. This is where holding the line starts to be work.',
    degrees: [0, 2, 4] as Deg[],
    sequenceLength: 3,
  }),
  level({
    id: 4,
    name: 'Three notes, anywhere',
    blurb: 'Five notes of the key in play, in any order.',
    degrees: [0, 2, 4, 5, 7] as Deg[],
    sequenceLength: 3,
  }),
  level({
    id: 5,
    name: 'Up the scale',
    blurb: 'Four notes in a row, straight up or straight down. Runs, slowly.',
    degrees: MAJOR,
    sequenceLength: 4,
    phraseShape: 'run',
    phraseGap: 0.5,
    roundLength: 4,
  }),
  level({
    id: 6,
    name: 'Faster runs',
    blurb: 'Five notes, quick. Too fast to hunt for each one — you have to know where they are.',
    degrees: MAJOR,
    sequenceLength: 5,
    phraseShape: 'run',
    phraseGap: 0.34,
    phraseHoldMs: 170,
    roundLength: 4,
  }),
  level({
    id: 7,
    name: 'Turn it around',
    blurb: 'Up and back down without stopping. The classic agility shape.',
    degrees: MAJOR,
    sequenceLength: 5,
    phraseShape: 'turn',
    phraseGap: 0.32,
    phraseHoldMs: 160,
    roundLength: 4,
  }),
  level({
    id: 8,
    name: 'Runs in minor',
    blurb: 'The same shapes with home in the dark. Three of the notes have moved.',
    mode: 'minor',
    degrees: DIATONIC.minor,
    sequenceLength: 5,
    phraseShape: 'turn',
    phraseGap: 0.34,
    phraseHoldMs: 170,
    roundLength: 4,
  }),
];

/**
 * Build the phrase for a question.
 *
 * `free` picks notes at random from the level's set, never repeating one
 * immediately — a repeated note has to be separated by silence to be graded,
 * which asks the singer to phrase in a way nobody would choose.
 *
 * `run` walks consecutive scale steps, and `turn` walks up and comes back
 * down. Those are the shapes agility work is actually built from; scattering
 * random notes trains something else.
 */
export function buildPhrase(
  degrees: Deg[],
  length: number,
  shape: 'free' | 'run' | 'turn',
  random: () => number = Math.random,
): Deg[] {
  const pool = [...degrees].sort((a, b) => a - b);

  if (shape === 'free') {
    const out: Deg[] = [];
    for (let i = 0; i < length; i++) {
      const choices = pool.filter((d) => d !== out[out.length - 1]);
      out.push(choices[Math.floor(random() * choices.length)]);
    }
    return out;
  }

  if (shape === 'turn') {
    // Up and back down over a single peak. The peak is never repeated: two
    // of the same note in a row can only be graded if they're separated by
    // silence, and stopping mid-run is exactly what a run must not do.
    const up = Math.ceil((length + 1) / 2);
    const descent = length - up;
    const start = Math.floor(random() * Math.max(1, pool.length - up + 1));
    const rising = pool.slice(start, start + up);
    // The notes immediately below the peak, on the way back down.
    const falling = rising.slice(up - 1 - descent, up - 1).reverse();
    return [...rising, ...falling];
  }

  const start = Math.floor(random() * Math.max(1, pool.length - length + 1));
  const rising = pool.slice(start, start + length);
  return random() < 0.5 ? rising : [...rising].reverse();
}
