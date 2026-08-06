/**
 * The Find the Note ladder.
 *
 * Two stages, and the first one exists because of a real gap: naming which
 * of seven notes you heard assumes you can already *find home*. Nothing was
 * teaching that. Stage 1 does, over a drone — a sounding reference you can
 * compare against without having to hold anything in memory — and only once
 * home is reliable does Stage 2 remove the drone and start asking for names.
 *
 * Within a stage, one axis moves at a time: notes are added, or help is
 * withdrawn, never both. See docs/01-PEDAGOGY.md §2.2.
 */

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
  /** The original drill: which note of the key was that? */
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

export type Stage = 'finding' | 'naming';

export const STAGE_LABEL: Record<Stage, string> = {
  finding: 'Finding home',
  naming: 'Naming the notes',
};

export const STAGE_BLURB: Record<Stage, string> = {
  finding: 'Learn what home sounds like, with a drone holding it under everything.',
  naming: 'The drone comes off. Now name what you hear.',
};

export type Level = {
  id: number;
  stage: Stage;
  kind: LevelKind;
  name: string;
  /** What the learner is being asked to hear, in plain words. */
  blurb: string;
  /** Scale steps in play, 1-7. */
  steps: number[];
  intro: IntroMode;
  /** Hold home underneath, as a sounding reference. */
  drone: boolean;
  twoOctaves: boolean;
  roundLength: number;
};

export const LEVELS: Level[] = [
  {
    id: 1,
    stage: 'finding',
    kind: 'home-or-not',
    name: 'Home or away',
    blurb: 'A drone holds home. One note plays. Was it home, or somewhere else?',
    steps: [1, 5],
    intro: 'none',
    drone: true,
    twoOctaves: false,
    roundLength: 8,
  },
  {
    id: 2,
    stage: 'finding',
    kind: 'home-or-not',
    name: 'Spot home anywhere',
    blurb: 'Same question, but now the other note could be any of the seven.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'none',
    drone: true,
    twoOctaves: false,
    roundLength: 8,
  },
  {
    id: 3,
    stage: 'finding',
    kind: 'rest-or-move',
    name: 'Settled or restless',
    blurb: 'Did the note sound like it had arrived, or like it wanted to move?',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'none',
    drone: true,
    twoOctaves: false,
    roundLength: 8,
  },
  {
    id: 4,
    stage: 'finding',
    kind: 'which-is-home',
    name: 'Find home',
    blurb: 'No drone. Three notes play — pick the one that is home.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'short',
    drone: false,
    twoOctaves: false,
    roundLength: 6,
  },
  {
    id: 5,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'The home chord',
    blurb: 'Three notes: home, the bright one, and the strong one.',
    steps: [1, 3, 5],
    intro: 'full',
    drone: false,
    twoOctaves: false,
    roundLength: 6,
  },
  {
    id: 6,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'The two that pull',
    blurb: 'Add the two restless notes that want to move somewhere.',
    steps: [1, 3, 4, 5, 7],
    intro: 'full',
    drone: false,
    twoOctaves: false,
    roundLength: 6,
  },
  {
    id: 7,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'All seven',
    blurb: 'The whole key is now in play.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'full',
    drone: false,
    twoOctaves: false,
    roundLength: 6,
  },
  {
    id: 8,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'Less help',
    blurb: 'Same seven notes, but a much shorter intro to the key.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'short',
    drone: false,
    twoOctaves: false,
    roundLength: 6,
  },
  {
    id: 9,
    stage: 'naming',
    kind: 'name-the-note',
    name: 'On your own',
    blurb: 'One chord to start, then two octaves of range.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'home',
    drone: false,
    twoOctaves: true,
    roundLength: 6,
  },
];

/** Steps that sound settled over a tonic drone — the home triad. */
export const RESTFUL_STEPS = [1, 3, 5];

/** Accuracy over a level's recent history that earns the next level. */
export const PROMOTE_ACCURACY = 0.85;
export const PROMOTE_MIN_ITEMS = 16;

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
