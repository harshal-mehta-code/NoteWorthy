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
  | 'name-the-note'
  /** Sing home back after hearing the key. */
  | 'sing-home'
  /** Sing back the note you just heard. */
  | 'sing-back'
  /** Sing a named note of the key, with nothing to copy. */
  | 'sing-degree'
  /** Sing back a whole phrase, note by note. */
  | 'sing-phrase'
  /** A rhythm is written out. Tap it. */
  | 'tap-rhythm'
  /** Two notes play. How far apart were they? */
  | 'interval-id'
  /** A note is drawn on a stave. What is it called? */
  | 'read-note'
  /** A chord sounds. What kind of chord is it? */
  | 'chord-quality'
  /** A chord sounds. Which of its notes is at the bottom? */
  | 'chord-inversion'
  /** A sequence of chords in a key. Name each by its role. */
  | 'progression-id';

/** Kinds that need the microphone. */
export function isSingKind(kind: LevelKind): boolean {
  return (
    kind === 'sing-home' ||
    kind === 'sing-back' ||
    kind === 'sing-degree' ||
    kind === 'sing-phrase'
  );
}

/** Sung levels answered a note at a time rather than with one held pitch. */
export function isPhraseKind(kind: LevelKind): boolean {
  return kind === 'sing-phrase';
}

/**
 * Whether a question sits inside a key, and so needs an intro to establish
 * one. Intervals and chords are distances and colours wherever you put them,
 * reading is about the page, and rhythm has no pitch at all.
 */
export function usesKey(kind: LevelKind): boolean {
  return (
    kind !== 'interval-id' &&
    kind !== 'read-note' &&
    kind !== 'chord-quality' &&
    kind !== 'chord-inversion' &&
    kind !== 'tap-rhythm'
  );
}

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

export type Stage = 'finding' | 'naming' | 'deeper' | 'voice';

export const STAGES: Stage[] = ['finding', 'naming', 'deeper', 'voice'];

export const STAGE_LABEL: Record<Stage, string> = {
  finding: 'Finding home',
  naming: 'Naming the notes',
  deeper: 'Going deeper',
  voice: 'Your voice',
};

export const STAGE_BLURB: Record<Stage, string> = {
  finding: 'Learn what home sounds like, with a drone holding it under everything.',
  naming: 'The drone comes off. Now name what you hear.',
  deeper: 'Longer phrases, minor keys, notes from outside the key, and less and less to hold onto.',
  voice: 'Stop picking answers and produce them. Needs a microphone; everything else works without one.',
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
  /** How far out of tune a sung note may be, in cents. */
  singTolerance: number;
  roundLength: number;

  // --- interval-id only -------------------------------------------------
  /** Interval sizes in play, in semitones (1-12). */
  intervalSet?: number[];
  intervalDirection?: 'up' | 'down' | 'both' | 'harmonic';

  // --- read-note only ---------------------------------------------------
  clef?: 'treble' | 'bass' | 'both';
  /** Inclusive diatonic-index range of notes in play. See core/reading.ts. */
  readRange?: [number, number];
  /** An explicit subset of that range, for the landmark levels. */
  readNotes?: number[];

  // --- chord levels only ------------------------------------------------
  chordSet?: import('./chords').ChordQuality[];
  /** Voice chords in inversion as well as root position. */
  chordInversions?: boolean;
  /** Sometimes arrive one note at a time rather than all together. */
  chordBroken?: boolean;

  // --- sing-phrase only --------------------------------------------------
  /** Random notes, a scale run, or a run that turns around at the top. */
  phraseShape?: 'free' | 'run' | 'turn';
  /** Seconds between notes when the phrase is played. Speed is the agility axis. */
  phraseGap?: number;
  /** How long each sung note must hold before it counts. */
  phraseHoldMs?: number;

  // --- tap-rhythm only ---------------------------------------------------
  noteValues?: import('./rhythm').NoteValue[];
  bars?: number;
  bpm?: number;
  /** How often a chosen note becomes a rest instead. */
  restChance?: number;
  /** Beats of click before the bar starts. */
  countIn?: number;
  /** Keep the click going under the pattern, or drop out after the count-in. */
  clickThrough?: boolean;
  /** How far a tap may sit from the beat and still count, in ms. */
  tapTolerance?: number;

  // --- progression levels only ------------------------------------------
  romanSet?: import('./progressions').Roman[];
  /** Chords per question, including the opening I. */
  progressionLength?: number;
  /** Draw from real-world progressions rather than generating. */
  useRealProgressions?: boolean;
};

const MAJOR = DIATONIC.major;
const MINOR = DIATONIC.minor;

/** Defaults, so each level below only states what makes it different. */
function level(
  partial: Omit<
    Level,
    'mode' | 'drone' | 'twoOctaves' | 'sequenceLength' | 'keyPerQuestion' | 'singTolerance'
  > &
    Partial<Level>,
): Level {
  return {
    mode: 'major',
    drone: false,
    twoOctaves: false,
    sequenceLength: 1,
    keyPerQuestion: false,
    singTolerance: 45,
    ...partial,
  };
}

export const FIND_THE_NOTE: Level[] = [
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

  // ------------------------------------------------------------ your voice
  level({
    id: 15,
    stage: 'voice',
    kind: 'sing-home',
    name: 'Sing home',
    blurb: 'Hear the key, then sing home yourself. No buttons to guess with.',
    degrees: [0],
    intro: 'full',
    roundLength: 5,
    singTolerance: 50,
  }),
  level({
    id: 16,
    stage: 'voice',
    kind: 'sing-back',
    name: 'Sing it back',
    blurb: 'A note plays. Sing that note back once it has stopped.',
    degrees: MAJOR,
    intro: 'short',
    roundLength: 5,
    singTolerance: 45,
  }),
  level({
    id: 17,
    stage: 'voice',
    kind: 'sing-degree',
    name: 'Sing the note',
    blurb: "You're told which note of the key to sing. Nothing plays it for you.",
    degrees: MAJOR,
    intro: 'full',
    roundLength: 5,
    singTolerance: 40,
  }),
];

/** Accuracy over a level's recent history that earns the next level. */
export const PROMOTE_ACCURACY = 0.85;
export const PROMOTE_MIN_ITEMS = 16;

/** Kept for the Find the Note ladder specifically. */
export function getLevel(id: number): Level {
  return FIND_THE_NOTE.find((l) => l.id === id) ?? FIND_THE_NOTE[0];
}

/** Look a level up inside whichever ladder it belongs to. */
export function findLevel(levels: Level[], id: number): Level {
  return levels.find((l) => l.id === id) ?? levels[0];
}
