/**
 * The Find the Note ladder.
 *
 * Each level adds a small number of new notes, in the order the ear can
 * actually take them: the home chord first, then the two notes that pull
 * hardest, then the rest — see docs/01-PEDAGOGY.md §2.2. Help is only
 * withdrawn once every note is in play, so difficulty moves along one axis
 * at a time.
 */

/** How much of the key we play before the question. */
export type IntroMode = 'full' | 'short' | 'home' | 'none';

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

export type Level = {
  id: number;
  name: string;
  /** What the learner is being asked to hear, in plain words. */
  blurb: string;
  /** Scale steps in play, 1-7. */
  steps: number[];
  intro: IntroMode;
  /** Whether questions can also come from the octave above. */
  twoOctaves: boolean;
};

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'The home chord',
    blurb: 'Three notes: home, the bright one, and the strong one.',
    steps: [1, 3, 5],
    intro: 'full',
    twoOctaves: false,
  },
  {
    id: 2,
    name: 'The two that pull',
    blurb: 'Add the two restless notes that want to move somewhere.',
    steps: [1, 3, 4, 5, 7],
    intro: 'full',
    twoOctaves: false,
  },
  {
    id: 3,
    name: 'All seven',
    blurb: 'The whole key is now in play.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'full',
    twoOctaves: false,
  },
  {
    id: 4,
    name: 'Less help',
    blurb: 'Same seven notes, but a much shorter intro to the key.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'short',
    twoOctaves: false,
  },
  {
    id: 5,
    name: 'On your own',
    blurb: 'One chord to start, then two octaves of range.',
    steps: [1, 2, 3, 4, 5, 6, 7],
    intro: 'home',
    twoOctaves: true,
  },
];

export const ROUND_LENGTH = 10;

/** Accuracy over a level's recent history that earns the next level. */
export const PROMOTE_ACCURACY = 0.85;
export const PROMOTE_MIN_ITEMS = 20;

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
