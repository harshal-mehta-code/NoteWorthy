/**
 * Theory lessons.
 *
 * Two rules, from docs/02-FEATURES.md §3: never more than a few screens
 * before a question, and every concept ships with something playable rather
 * than a diagram. Each lesson also ends by pointing at the ear or reading
 * drill where the same idea turns up — the linkage rule is what stops theory
 * becoming trivia.
 */

export type Card =
  | { kind: 'text'; body: string }
  | {
      kind: 'keys';
      body: string;
      /** MIDI notes to light up. */
      highlight: number[];
      /** Play these in order when the card is opened or tapped. */
      play?: number[];
      labels?: 'none' | 'c' | 'all';
      caption?: string;
    }
  | {
      kind: 'question';
      prompt: string;
      options: string[];
      answer: number;
      /** Shown after answering, right or wrong. */
      because: string;
    };

export type Lesson = {
  id: string;
  title: string;
  blurb: string;
  minutes: number;
  cards: Card[];
  /** Where this idea shows up in a drill. */
  nextUp: string;
};

export const LESSONS: Lesson[] = [
  {
    id: 'keyboard',
    title: 'The keyboard is a ruler',
    blurb: 'Why the black keys are grouped in twos and threes, and how to find any note.',
    minutes: 3,
    nextUp: 'Read the Note — the same notes, seen instead of felt.',
    cards: [
      {
        kind: 'text',
        body: 'A piano keyboard looks like a lot of keys, but it is really one pattern of twelve repeated over and over. Learn the pattern once and you can find any note anywhere.',
      },
      {
        kind: 'keys',
        body: 'The black keys come in groups of **two** and **three**. That grouping is the only landmark you need.',
        highlight: [61, 63, 66, 68, 70, 73, 75, 78, 80, 82],
        labels: 'none',
        caption: 'Two, then three, then two, then three.',
      },
      {
        kind: 'keys',
        body: '**C** is always the white key immediately to the left of a group of two blacks. Find that, and every other letter follows along the whites: C D E F G A B, then C again.',
        highlight: [60, 72, 84],
        play: [60, 72],
        labels: 'c',
        caption: 'Tap any key to hear it.',
      },
      {
        kind: 'question',
        prompt: 'Which white key sits immediately left of a group of three black keys?',
        options: ['C', 'F', 'G', 'A'],
        answer: 1,
        because:
          'F. The two groups give you two anchors: C before the pair, F before the triple. Everything else is counted from those.',
      },
      {
        kind: 'text',
        body: 'From C up to the next C is an **octave** — twelve keys counting blacks, eight letter names counting only whites. That mismatch is why the next lesson matters.',
      },
    ],
  },

  {
    id: 'steps',
    title: 'Half steps and whole steps',
    blurb: 'The two distances that every scale and chord is built from.',
    minutes: 3,
    nextUp: 'Intervals — the same distances, by ear.',
    cards: [
      {
        kind: 'keys',
        body: 'A **half step** is the smallest move on the keyboard: to the very next key, black or white. No key in between.',
        highlight: [60, 61],
        play: [60, 61],
        caption: 'C to the black key just above it.',
      },
      {
        kind: 'keys',
        body: 'A **whole step** skips one key. Two half steps.',
        highlight: [60, 62],
        play: [60, 62],
        caption: 'C to D, with the black key skipped.',
      },
      {
        kind: 'keys',
        body: 'Two pairs of white keys have **no black key between them** — E to F, and B to C. Those two are half steps even though they look like the others.',
        highlight: [64, 65, 71, 72],
        play: [64, 65, 71, 72],
        caption: 'E-F and B-C. This trips up nearly everyone once.',
      },
      {
        kind: 'question',
        prompt: 'How far apart are E and F?',
        options: ['A half step', 'A whole step', 'Three half steps'],
        answer: 0,
        because:
          'A half step. There is no black key between them, so they are as close as two keys can be — the same distance as C to C♯.',
      },
    ],
  },

  {
    id: 'major-scale',
    title: 'What makes a scale major',
    blurb: 'One fixed pattern of steps, startable from any note.',
    minutes: 4,
    nextUp: 'Find the Note — hearing where you are inside that scale.',
    cards: [
      {
        kind: 'text',
        body: 'A **major scale** is not a set of notes. It is a pattern of distances. Play that pattern from any starting note and you get a major scale in that key.',
      },
      {
        kind: 'keys',
        body: 'The pattern is **whole, whole, half, whole, whole, whole, half**. Starting on C, it lands on nothing but white keys — which is why C major is where everyone begins.',
        highlight: [60, 62, 64, 65, 67, 69, 71, 72],
        play: [60, 62, 64, 65, 67, 69, 71, 72],
        labels: 'c',
        caption: 'C D E F G A B C.',
      },
      {
        kind: 'keys',
        body: 'Start the same pattern on **G** and it still works — but the seventh note has to be F♯, or the last step would be a whole step instead of a half.',
        highlight: [67, 69, 71, 72, 74, 76, 78, 79],
        play: [67, 69, 71, 72, 74, 76, 78, 79],
        caption: 'G A B C D E F♯ G. One black key, and that is the key signature of G.',
      },
      {
        kind: 'question',
        prompt: 'Why does G major need an F♯?',
        options: [
          'To make it sound brighter',
          'So the last two notes are a half step apart',
          'Because G is a black key',
        ],
        answer: 1,
        because:
          'The pattern demands a half step between the seventh note and the octave. F natural to G is a whole step, so the F has to be raised.',
      },
      {
        kind: 'text',
        body: 'That seventh note — the one that had to be raised — is the one that pulls hardest back to home. In the ear drills it is labelled **7**, and it is the easiest of all seven to recognise once you know what it wants.',
      },
    ],
  },

  {
    id: 'home',
    title: 'Why one note feels like home',
    blurb: 'The thing the ear training is actually training.',
    minutes: 3,
    nextUp: 'Find the Note, level 1 — the same idea, by ear.',
    cards: [
      {
        kind: 'text',
        body: 'Play a scale and stop on the second-to-last note. Something feels unfinished. Play the last note and it resolves. Nothing about the notes changed — what changed is their **relationship to home**.',
      },
      {
        kind: 'keys',
        body: 'Home in C major is C. The other two notes of the home chord, **E** and **G**, are stable too — you can stop on any of them and nothing feels wrong.',
        highlight: [60, 64, 67],
        play: [60, 64, 67, 72],
        caption: 'The home chord: 1, 3 and 5.',
      },
      {
        kind: 'keys',
        body: 'The other four notes sit *between* those, and lean toward them. **F** leans down to E. **B** pulls up to C. That leaning is what you learn to hear.',
        highlight: [62, 65, 69, 71],
        play: [65, 64, 71, 72],
        caption: 'F falling to E, then B rising to C.',
      },
      {
        kind: 'question',
        prompt: 'What makes a note sound "restless" rather than settled?',
        options: [
          'It is played louder',
          'It is not part of the home chord, so it leans toward one that is',
          'It is a black key',
        ],
        answer: 1,
        because:
          'Stability comes from belonging to the home chord. Everything else sits between those notes and pulls toward the nearest one.',
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
