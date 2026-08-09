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
      /** Sound them at once instead of one after another — for chords. */
      together?: boolean;
      labels?: 'none' | 'c' | 'all';
      caption?: string;
    }
  /**
   * The circle of fifths, as a thing you can spin rather than a picture.
   * A diagram of it is memorised; a ring you can tap and hear is understood,
   * and the app rotates keys through it anyway.
   */
  | { kind: 'circle'; body: string; caption?: string }
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

  {
    id: 'intervals',
    title: 'Distance is the whole idea',
    blurb: 'What an interval is, why it has two names, and why width comes before colour.',
    minutes: 4,
    nextUp: 'Intervals — naming these by ear, starting with the widest.',
    cards: [
      {
        kind: 'text',
        body: 'An **interval** is the distance between two notes. That is the entire definition. It has no key, no home, and no context — the same distance sounds like the same distance wherever you put it.',
      },
      {
        kind: 'keys',
        body: 'Count in half steps. C up to G is **seven** half steps, and that distance is called a **fifth**. Play it anywhere and it is still a fifth.',
        highlight: [60, 67],
        play: [60, 67],
        caption: 'Seven half steps. Open, hollow, and very stable.',
      },
      {
        kind: 'keys',
        body: 'The same seven half steps, started somewhere else. Nothing about the sound has changed except its height.',
        highlight: [65, 72],
        play: [65, 72],
        caption: 'F up to C. Still a fifth.',
      },
      {
        kind: 'text',
        body: 'Intervals have two names because there are two ways to count. The **number** counts letter names — C to G is C-D-E-F-G, five letters, so: a fifth. The **quality** — major, minor, perfect — says exactly which version of that number you have.',
      },
      {
        kind: 'keys',
        body: 'A **major third** is four half steps and sounds bright. A **minor third** is three and sounds shaded. One half step apart, and it is the difference between happy and sad in almost all Western music.',
        highlight: [60, 63, 64],
        play: [60, 64, 60, 63],
        caption: 'C-E, then C-E♭. The same third, one step darker.',
      },
      {
        kind: 'question',
        prompt: 'How many half steps make a major third?',
        options: ['Three', 'Four', 'Five', 'Seven'],
        answer: 1,
        because:
          'Four. Three half steps is a minor third — the shaded one. That single step is the whole difference between a major and a minor chord.',
      },
      {
        kind: 'text',
        body: 'When you start naming these by ear, listen for **width** before colour. Is it a step, a reach, or a leap? Narrow it to a size first, then ask whether it sounds bright or shaded. Trying to judge both at once is how people stall.',
      },
    ],
  },

  {
    id: 'triads',
    title: 'Three notes make a chord',
    blurb: 'Stack two thirds and you have a triad. Which thirds decides everything.',
    minutes: 4,
    nextUp: 'Chords — telling these apart by ear, major against minor first.',
    cards: [
      {
        kind: 'text',
        body: 'A **triad** is three notes stacked in thirds: a root, the note a third above it, and the note a third above *that*. Nearly every chord you have ever heard is a triad or a triad with something added.',
      },
      {
        kind: 'keys',
        body: 'A **major** triad: four half steps, then three. Bright, settled, finished.',
        highlight: [60, 64, 67],
        play: [60, 64, 67],
        together: true,
        caption: 'C major — C, E, G.',
      },
      {
        kind: 'keys',
        body: 'A **minor** triad: three half steps, then four. The same two intervals, swapped. That swap is the whole difference.',
        highlight: [60, 63, 67],
        play: [60, 63, 67],
        together: true,
        caption: 'C minor — C, E♭, G. One key moved.',
      },
      {
        kind: 'question',
        prompt: 'What changes between a major and a minor triad?',
        options: [
          'The root moves down',
          'The middle note moves down a half step',
          'The top note moves down a half step',
        ],
        answer: 1,
        because:
          'Only the middle note. The root and the fifth stay exactly where they are — which is why major and minor feel so closely related and yet so different.',
      },
      {
        kind: 'keys',
        body: 'Squeeze both thirds and you get **diminished** — three and three. Tense, unstable, and always on its way somewhere.',
        highlight: [60, 63, 66],
        play: [60, 63, 66],
        together: true,
        caption: 'C diminished. Nothing about this wants to sit still.',
      },
      {
        kind: 'keys',
        body: 'Stretch both and you get **augmented** — four and four. Evenly spaced, so it has no obvious bottom and sounds like it is floating.',
        highlight: [60, 64, 68],
        play: [60, 64, 68],
        together: true,
        caption: 'C augmented. Strange, and rare for a reason.',
      },
      {
        kind: 'text',
        body: 'When you name these by ear, do not try to pick the notes apart. Listen to the **colour of the whole thing**: bright and settled, shaded, squeezed and anxious, or stretched and floating.',
      },
    ],
  },

  {
    id: 'chords-in-key',
    title: 'Every chord has a job',
    blurb: 'Why chords get numbers, and what those numbers tell you.',
    minutes: 4,
    nextUp: 'Progressions — naming chords by their number, by ear.',
    cards: [
      {
        kind: 'text',
        body: 'Build a triad on each note of a major scale, using only notes from that scale. You get **seven chords**, and they are the same seven in every major key. That is why chords get numbers instead of names.',
      },
      {
        kind: 'keys',
        body: 'Chord **I** is built on the first note. In C that is C major, and it is home — where things end up.',
        highlight: [60, 64, 67],
        play: [60, 64, 67],
        together: true,
        caption: 'I — home.',
      },
      {
        kind: 'keys',
        body: 'Chord **V** is built on the fifth note. It is major, it is tense, and it pulls back to I harder than anything else in the key.',
        highlight: [67, 71, 74],
        play: [67, 71, 74],
        together: true,
        caption: 'V — the pull home.',
      },
      {
        kind: 'keys',
        body: 'Chord **vi** is built on the sixth note. Using only scale notes makes it come out **minor** — the sad chord that lives inside every major key. Lowercase numerals mean minor.',
        highlight: [69, 72, 76],
        play: [69, 72, 76],
        together: true,
        caption: 'vi — minor, without leaving the key.',
      },
      {
        kind: 'question',
        prompt: 'Why is vi minor when the key is major?',
        options: [
          'Because it uses notes from outside the key',
          'Because stacking thirds from the sixth note happens to give three half steps first',
          'Because minor chords are always sixth',
        ],
        answer: 1,
        because:
          'Nothing was added or altered. Stacking scale notes in thirds from the sixth degree simply produces a minor third first — the key gets its minor chords for free.',
      },
      {
        kind: 'text',
        body: 'This is why numbers beat names. **I–V–vi–IV** describes thousands of songs in every key at once. Learn a progression by its numbers and you can play it anywhere, transpose it instantly, and recognise it in music you have never heard.',
      },
    ],
  },

  {
    id: 'minor',
    title: 'When home goes dark',
    blurb: 'What actually changes in a minor key, and what stays exactly the same.',
    minutes: 3,
    nextUp: 'Find the Note, stage 3 — the same seven notes, with home moved.',
    cards: [
      {
        kind: 'text',
        body: 'A minor key is not a different set of notes. It is the same idea with **three of the seven lowered** by a half step: the third, the sixth and the seventh.',
      },
      {
        kind: 'keys',
        body: 'C major: the seven notes you already know.',
        highlight: [60, 62, 64, 65, 67, 69, 71, 72],
        play: [60, 62, 64, 65, 67, 69, 71, 72],
        caption: 'C D E F G A B C.',
      },
      {
        kind: 'keys',
        body: 'C minor: **E♭**, **A♭**, **B♭**. Three keys moved, and the whole thing changes character.',
        highlight: [60, 62, 63, 65, 67, 68, 70, 72],
        play: [60, 62, 63, 65, 67, 68, 70, 72],
        caption: 'C D E♭ F G A♭ B♭ C.',
      },
      {
        kind: 'keys',
        body: 'The lowered third is the one that does the work. Home itself is now a **minor** triad, and everything sits under it.',
        highlight: [60, 63, 67],
        play: [60, 64, 67, 60, 63, 67],
        together: false,
        caption: 'C major home, then C minor home.',
      },
      {
        kind: 'question',
        prompt: 'Which note changing is what makes a key sound minor?',
        options: ['The first', 'The third', 'The fifth'],
        answer: 1,
        because:
          'The third. It is the note inside the home chord itself, so lowering it recolours everything built on top. The first and fifth are identical in both.',
      },
      {
        kind: 'text',
        body: 'Here is the part that matters for your ear: **home still feels like home**. Everything you have learned about resting and leaning still applies. Only the colour changed, not the gravity.',
      },
    ],
  },

  {
    id: 'circle',
    title: 'The circle of fifths',
    blurb: 'Why keys are arranged in a ring, and what being neighbours actually means.',
    minutes: 4,
    nextUp: 'Any ear drill with rotating keys — the circle is the order they rotate in.',
    cards: [
      {
        kind: 'text',
        body: 'Twelve keys sounds like twelve things to learn. It is really **one thing, twelve times** — and the order they come in is not alphabetical. It is by fifths.',
      },
      {
        kind: 'keys',
        body: 'Start on C and go up a fifth: G. Up another fifth: D. Keep going and you pass through all twelve notes before returning to C.',
        highlight: [60, 67, 74],
        play: [60, 67, 74],
        caption: 'C, G, D — each a fifth above the last.',
      },
      {
        kind: 'circle',
        body: 'Laid out in a ring, it becomes a map. Each step clockwise adds one sharp; each step anticlockwise adds one flat. **Neighbours on the ring share six of their seven notes** — which is why moving between them sounds smooth, and why so much music does exactly that.',
        caption: 'Tap any key to hear its home chord.',
      },
      {
        kind: 'question',
        prompt: 'C major has no sharps or flats. How many does G major have?',
        options: ['None', 'One sharp', 'Two sharps', 'One flat'],
        answer: 1,
        because:
          'One — F♯. G is one step clockwise from C, and each step that way adds exactly one sharp. That is the whole rule.',
      },
      {
        kind: 'text',
        body: 'This is also why the app rotates keys rather than staying in C. An ear trained only in one key learns **those pitches**; an ear trained across the circle learns the *relationships*, which is the thing that transfers.',
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
