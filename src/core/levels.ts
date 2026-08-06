/**
 * The Find the Note ladder.
 *
 * Three stages. Stage 1 exists because naming notes assumes you can already
 * find home, and nothing was teaching that — a drone holds home so you
 * compare rather than remember. Stage 2 removes the drone and starts asking
 * for names. Stage 3 is where it stops being gentle.
 *
 * Within a stage one axis moves at a time: notes are added, or help is
 * withdrawn, or the sequence gets longer — never two at once.
 * See docs/01-PEDAGOGY.md §2.2-2.3.
 */

import { DIATONIC, type Deg, type Mode } from './music';

/** How much of the key we play before the question. */
export type IntroMode = 'full' | 'short' | 'home' | 'none';

/** What the question actually asks. */
export type LevelKind =
  /** A drone holds home. Was that note home, or not? */
  | 'home-or-not'
  /** A drone holds home. Did that note sound settled, or restless? */
  | 'rest-or-move'
  /** Three notes play. Which one was home? */
  | 'which-is-home'
  /** Which note of the key was that? One or more, in order. */
  | 'name-the-note';

export const INTRO_LABEL: Record<IntroMode, string> = {
  full: 'Full intro',
  short: 'Short intro',
  home: 'Just the home chord',
  none: 'No intro',
};

export const INTRO_HELP: Record<IntroMode, string> = {
  full: 'Four chords that settle you into the key. Easiest to follow.',
  short: 'Two chords. Enough to feel where home is.',
  home: 'One chord, then straight to the question.',
  none: 'Nothing but the note. You hold the key in your head.',
};

export type Stage = 'finding' | 'naming' | 'deeper';

export const STAGES: Stage[] = ['finding', 'naming', 'deeper'];

export const STAGE_LABEL: Record<Stage, string> = {
  finding: 'Finding home',
  naming: 'Naming the notes',
  deeper: 'Going deeper',
};

export const STAGE_BLURB: Record<Stage, string> = {
  finding: 'Learn what home sounds like, with a drone holding it under everything.',
  naming: 'The drone comes off. Now name what you hear.',
  deeper: 'Longer phrases, minor keys, notes from outside the key, and less and less to hold onto.',
};

export type Level = {
  id: number;
  stage: Stage;
  kind: LevelKind;
  name: string;
  /** What the learner is being asked to hear, in plain words. */
  blurb: string;
  mode: Mode;
  /** Degrees in play, as semitones above home. */
  degrees: Deg[];
  intro: IntroMode;
  /** Hold home underneath, as a sounding reference. */
  drone: boolean;
  twoOctaves: boolean;
  /** How many notes the question plays and you have to name back. */
  sequenceLength: number;
  /** Re-roll the key on every question rather than once per round. */
  keyPerQuestion: boolean;
  roundLength: number;
};

const MAJOR = DIATONIC.major;
const MINOR = DIATONIC.minor;

/** Defaults, so each level below only states what makes it different. */
function level(partial: Omit<Level, 'mode' | 'drone' | 'twoOctaves' | 'sequenceLength' | 'keyPerQuestion'> &
  Partial<Level>): Level {
  return {
    mode: 'major',
    drone: false,
    twoOctaves: false,
    sequenceLength: 1,
    keyPerQuestion: false,
    ...partial,
  };
}

export const LEVELS: Level[] = [
  // ---------------------------------------------------------- finding home
  level({
    id: 1,
    stage: 'finding',
    kind: 'home-or-not',
    name: 'Home or away',
    blurb: 'A drone holds home. One note plays. Was it home, or somewhere else?',
    degrees: [0, 7],
    intro: 'none',
    drone: true,
    roundLength: 8,
  }),
  level({
    id: 2,
    stage: 'finding',
    kind: 'home-or-not',
    name: 'Spot home anywhere',
    blurb: 'Same question, but now the other note could be any of the seven.',
    degrees: MAJOR,
    intro: 'none',
    drone: true,
    roundLength: 8,
  }),
  level({
    id: 3,
    stage: 'finding',
    kind: 'rest-or-move',
    name: 'Settled or restless',
    blurb: 'Did the note sound like it had arrived, or like it wanted to move?',
    degrees: MAJOR,
    intro: 'none',
    drone: true,
    roundLength: 8,
  }),
  level({
    id: 4,
    stage: 'finding',
    kind: 'which-is-home',
    name: 'Find home',
    blurb: 'No drone. Three notes play — pick the one that is home.',
    degrees: MAJOR,
    intro: 'short',
    roundLength: 6,
  }),

  // ------------------------------------------------------ naming the notes
  level({
    id: 5,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'The home chord',
    blurb: 'Three notes: home, the bright one, and the strong one.',
    degrees: [0, 4, 7],
    intro: 'full',
    roundLength: 6,
  }),
  level({
    id: 6,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'The two that pull',
    blurb: 'Add the two restless notes that want to move somewhere.',
    degrees: [0, 4, 5, 7, 11],
    intro: 'full',
    roundLength: 6,
  }),
  level({
    id: 7,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'All seven',
    blurb: 'The whole key is now in play.',
    degrees: MAJOR,
    intro: 'full',
    roundLength: 6,
  }),
  level({
    id: 8,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'Less help',
    blurb: 'Same seven notes, but a much shorter intro to the key.',
    degrees: MAJOR,
    intro: 'short',
    roundLength: 6,
  }),
  level({
    id: 9,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'On your own',
    blurb: 'One chord to start, then two octaves of range.',
    degrees: MAJOR,
    intro: 'home',
    twoOctaves: true,
    roundLength: 6,
  }),

  // ---------------------------------------------------------- going deeper
  level({
    id: 10,
    stage: 'deeper',
    kind: 'name-the-note',
    name: 'Two in a row',
    blurb: 'Two notes play. Name both, in order — you have to hold the first one.',
    degrees: MAJOR,
    intro: 'full',
    sequenceLength: 2,
    roundLength: 6,
  }),
  level({
    id: 11,
    stage: 'deeper',
    kind: 'name-the-note',
    name: 'Three in a row',
    blurb: 'Three notes, a shorter intro. This is melody, not single notes.',
    degrees: MAJOR,
    intro: 'short',
    sequenceLength: 3,
    roundLength: 5,
  }),
  level({
    id: 12,
    stage: 'deeper',
    kind: 'name-the-note',
    name: 'Minor keys',
    blurb: 'The same seven positions, but the key is minor and three of them have moved.',
    mode: 'minor',
    degrees: MINOR,
    intro: 'full',
    roundLength: 6,
  }),
  level({
    id: 13,
    stage: 'deeper',
    kind: 'name-the-note',
    name: 'Colour notes',
    blurb: 'Two notes from outside the key: the bluesy ♭7 and the sharp ♯4.',
    degrees: [...MAJOR, 6, 10].sort((a, b) => a - b),
    intro: 'full',
    roundLength: 6,
  }),
  level({
    id: 14,
    stage: 'deeper',
    kind: 'name-the-note',
    name: 'Nothing to hold onto',
    blurb: 'One chord, a new key every question, two octaves. No settling in.',
    degrees: MAJOR,
    intro: 'home',
    twoOctaves: true,
    keyPerQuestion: true,
    roundLength: 6,
  }),
];

/** Accuracy over a level's recent history that earns the next level. */
export const PROMOTE_ACCURACY = 0.85;
export const PROMOTE_MIN_ITEMS = 16;

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
