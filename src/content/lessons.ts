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
  /**
   * A note on a stave. The reading course has drilled this for a while with
   * no lesson anywhere explaining what the five lines *are* — the same gap
   * the progressions lesson closed for roman numerals.
   */
  | {
      kind: 'staff';
      body: string;
      /** Diatonic index — see core/reading.ts. */
      index: number;
      clef: 'treble' | 'bass';
      /** Sound it when the card opens. */
      play?: boolean;
      caption?: string;
    }
  /** A written rhythm, reusing the notation the rhythm course reads from. */
  | {
      kind: 'rhythm';
      body: string;
      /** Note values in beats, negative for a rest of that length. */
      beats: number[];
      /** Beats per bar. 4 unless the card is about another time signature. */
      beatsPerBar?: number;
      bars?: number;
      /** Tap it out at this tempo when the card opens. */
      bpm?: number;
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

  {
    id: 'staff',
    title: 'Five lines and four spaces',
    blurb: 'What the stave actually is, and why there are two of them.',
    minutes: 4,
    nextUp: 'Read the Note — naming these by sight until it stops being work.',
    cards: [
      {
        kind: 'text',
        body: 'Written music is a graph. **Time runs left to right; pitch runs bottom to top.** That is the entire idea, and everything else is notation for it.',
      },
      {
        kind: 'staff',
        body: 'The **stave** is five lines and the four spaces between them. A note sits either *on* a line or *in* a space — each one is the next letter up.',
        index: 34,
        clef: 'treble',
        play: true,
        caption: 'A note sitting in a space.',
      },
      {
        kind: 'question',
        prompt: 'A note moves from a line to the space directly above it. What happened?',
        options: [
          'It went up one letter',
          'It went up two letters',
          'It got louder',
        ],
        answer: 0,
        because:
          'Lines and spaces alternate, and each step is the next letter. Line, space, line, space — C, D, E, F — with no gaps and nothing skipped.',
      },
      {
        kind: 'text',
        body: 'Five lines only reach nine notes, which is nowhere near enough. So the stave does not have a fixed pitch — a **clef** at the front declares one, and everything else is counted from it.',
      },
      {
        kind: 'staff',
        body: 'The **treble clef** curls around the line that is G. That curl is not decoration; the centre of the spiral is telling you which line it means.',
        index: 32,
        clef: 'treble',
        play: true,
        caption: 'G, wrapped by the clef.',
      },
      {
        kind: 'staff',
        body: 'The **bass clef** does the same job with two dots, and they sit either side of the line that is F. Lower instruments and left hands live here.',
        index: 24,
        clef: 'bass',
        play: true,
        caption: 'F, between the two dots.',
      },
      {
        kind: 'question',
        prompt: 'Why does music need clefs at all?',
        options: [
          'To show how loud to play',
          'Because five lines cannot cover the range of every instrument',
          'To mark where the piece begins',
        ],
        answer: 1,
        because:
          'Five lines reach about nine notes. A clef re-points the stave at a different part of the range, which is how the same five lines serve a piccolo and a double bass.',
      },
      {
        kind: 'staff',
        body: 'A note past the end of the stave gets its own short **ledger line**. Middle C is the famous one: one ledger line below the treble stave, and one above the bass.',
        index: 28,
        clef: 'treble',
        play: true,
        caption: 'Middle C, hanging below the treble stave.',
      },
      {
        kind: 'text',
        body: 'When you start naming these, do not count up from the bottom line. Find the nearest **landmark** you already know — the clef tells you one for free — and read one or two steps from it. Counting is a habit you would only have to unlearn.',
      },
    ],
  },

  {
    id: 'note-values',
    title: 'How long is a note?',
    blurb: 'Why notes are hollow or filled, and what the tails mean.',
    minutes: 4,
    nextUp: 'Read the Rhythm — tapping these in time.',
    cards: [
      {
        kind: 'text',
        body: 'A notehead says *which* note. Its **shape** says how long to hold it. There are only four shapes worth knowing at first, and each one is half the length of the one before.',
      },
      {
        kind: 'rhythm',
        body: 'A **whole note** is hollow with no stem, and lasts four beats — a whole bar of the most common time signature.',
        beats: [4],
        bpm: 84,
        caption: 'One note, four beats.',
      },
      {
        kind: 'rhythm',
        body: 'A **half note** is hollow with a stem: two beats. Two of them fill the same bar.',
        beats: [2, 2],
        bpm: 84,
        caption: 'Two beats each.',
      },
      {
        kind: 'rhythm',
        body: 'A **quarter note** is filled in, with a stem: one beat. This is the note you tap your foot to.',
        beats: [1, 1, 1, 1],
        bpm: 84,
        caption: 'One beat each — the pulse itself.',
      },
      {
        kind: 'question',
        prompt: 'Which note is filled in rather than hollow?',
        options: ['The whole note', 'The half note', 'The quarter note'],
        answer: 2,
        because:
          'Filling the head in halves the length. Hollow with no stem is four beats, hollow with a stem is two, filled with a stem is one — the shape is doing the arithmetic for you.',
      },
      {
        kind: 'rhythm',
        body: 'An **eighth note** adds a tail. Two fit in a beat, and when they are neighbours the tails join into a **beam** — which is there purely so you can see the beats at a glance.',
        beats: [0.5, 0.5, 0.5, 0.5, 1, 1],
        bpm: 84,
        caption: 'Beamed in pairs, so the beat stays visible.',
      },
      {
        kind: 'question',
        prompt: 'How many eighth notes fit in a half note?',
        options: ['Two', 'Three', 'Four', 'Eight'],
        answer: 2,
        because:
          'Four. A half note is two beats, and each beat holds two eighths. Every step down the list halves the length, so the arithmetic is always powers of two.',
      },
      {
        kind: 'rhythm',
        body: 'Silence is written too. A **rest** has a shape for each length, and it is counted exactly like a note — it is a held nothing, not a gap in the music.',
        beats: [1, -1, 1, 1],
        bpm: 84,
        caption: 'A quarter rest on beat two.',
      },
      {
        kind: 'text',
        body: 'This is the part people get wrong when they start: **rests are counted, not waited out.** Keep the pulse running underneath and the silence looks after itself. Trying to feel a gap as a gap is what makes rests hard.',
      },
    ],
  },

  {
    id: 'meter',
    title: 'What the two numbers mean',
    blurb: 'Time signatures, and why some music feels like 1-2-3.',
    minutes: 3,
    nextUp: 'Read the Rhythm — everything here, tapped.',
    cards: [
      {
        kind: 'text',
        body: 'The two stacked numbers at the front of a piece are the **time signature**. The top one counts beats in a bar. The bottom one says which note value gets one beat — 4 means a quarter note.',
      },
      {
        kind: 'rhythm',
        body: '**4/4** is four quarter-note beats to a bar, and it is so common it is also called *common time*. The first beat of each bar is the strong one.',
        beats: [1, 1, 1, 1],
        bars: 1,
        bpm: 88,
        caption: 'Four beats. Count 1-2-3-4.',
      },
      {
        kind: 'rhythm',
        body: '**3/4** is three. That single missing beat is the whole difference between a rock song and a waltz — nothing else has changed.',
        beats: [1, 1, 1],
        beatsPerBar: 3,
        bars: 1,
        bpm: 88,
        caption: 'Three beats. Count 1-2-3, 1-2-3.',
      },
      {
        kind: 'question',
        prompt: 'In 3/4, what does the 4 tell you?',
        options: [
          'There are four bars',
          'A quarter note gets one beat',
          'The piece is in four sharps',
        ],
        answer: 1,
        because:
          'It names the beat. The top number counts them, the bottom number says what kind — so 3/4 is three quarter-note beats, and 3/8 would be three eighth-note beats.',
      },
      {
        kind: 'text',
        body: 'The **bar lines** are not decoration either: they mark where the strong beat lands. Once you feel where beat one is, reading rhythm stops being arithmetic and becomes a shape you recognise.',
      },
    ],
  },

  {
    id: 'cadences',
    title: 'How a phrase ends',
    blurb: 'The two or three chords that make music sound finished — or not.',
    minutes: 4,
    nextUp: 'Progressions — hearing these arrive at the end of a phrase.',
    cards: [
      {
        kind: 'text',
        body: 'A **cadence** is how a phrase lands. It is usually the last two chords, and it does the same job as punctuation: it tells you whether that was a full stop, a comma, or a surprise.',
      },
      {
        kind: 'keys',
        body: 'The **full stop**: V then I. The tense chord resolves to home, and it sounds completely finished. Almost every piece of tonal music ends this way.',
        highlight: [67, 71, 74, 60, 64, 67],
        play: [67, 71, 74],
        together: true,
        caption: 'V into I — hear it land.',
      },
      {
        kind: 'keys',
        body: 'The **comma**: a phrase that stops *on* V instead of moving off it. Nothing has resolved, so the music sounds like it is waiting — which is exactly what a question mark does.',
        highlight: [67, 71, 74],
        play: [67, 71, 74],
        together: true,
        caption: 'Ending on V. It hangs.',
      },
      {
        kind: 'keys',
        body: 'The **surprise**: V then vi. Everything sets up a landing on home, and then the sad chord arrives instead. Songwriters use this exactly where you expect the end and do not get it.',
        highlight: [69, 72, 76],
        play: [69, 72, 76],
        together: true,
        caption: 'vi where I was expected.',
      },
      {
        kind: 'question',
        prompt: 'A phrase stops on V and sounds unfinished. What is that?',
        options: [
          'A full stop — the piece has ended',
          'A comma — the phrase is waiting for an answer',
          'A mistake',
        ],
        answer: 1,
        because:
          'It is a half cadence. Stopping on the tense chord is a deliberate device: it makes the next phrase feel like a reply, which is how question-and-answer melodies are built.',
      },
      {
        kind: 'text',
        body: 'This is worth knowing because cadences are where chord progressions are *easiest* to hear. The end of a phrase is the most predictable moment in music — start listening there and work backwards.',
      },
    ],
  },

  {
    id: 'sevenths',
    title: 'Adding a fourth note',
    blurb: 'What a seventh does to a chord, and why one of them pulls so hard.',
    minutes: 4,
    nextUp: 'Chords — telling the four sevenths apart by ear.',
    cards: [
      {
        kind: 'text',
        body: 'Stack one more third on top of a triad and you get a **seventh chord** — four notes instead of three. The extra note is a seventh above the root, which is where the name comes from.',
      },
      {
        kind: 'keys',
        body: 'A plain major triad: settled, and going nowhere in particular.',
        highlight: [60, 64, 67],
        play: [60, 64, 67],
        together: true,
        caption: 'C major.',
      },
      {
        kind: 'keys',
        body: 'Add the note a **minor** seventh above the root and you get a **dominant seventh**. Something has changed: it no longer sounds settled, it sounds like it is leaning somewhere.',
        highlight: [60, 64, 67, 70],
        play: [60, 64, 67, 70],
        together: true,
        caption: 'C7 — the same chord, now restless.',
      },
      {
        kind: 'text',
        body: 'The lean is real, not poetic. The chord now contains a **tritone** — the most unstable interval there is — between its third and its seventh, and both of those notes want to move by a half step. That is why V7 pulls home harder than V alone.',
      },
      {
        kind: 'question',
        prompt: 'What did adding the seventh change?',
        options: [
          'The chord got louder',
          'The chord stopped sounding settled and started leaning',
          'The chord changed from major to minor',
        ],
        answer: 1,
        because:
          'The root, third and fifth are all still there, so it is still a major chord — but it no longer sounds like an ending. That restlessness is the whole reason sevenths exist.',
      },
      {
        kind: 'keys',
        body: 'Add a **major** seventh instead and the effect is completely different: lush and floating rather than tense. This is the sound of a jazz ballad, not a blues turnaround.',
        highlight: [60, 64, 67, 71],
        play: [60, 64, 67, 71],
        together: true,
        caption: 'Cmaj7 — soft, not pulling.',
      },
      {
        kind: 'question',
        prompt: 'Why does a dominant seventh sound like it wants to move?',
        options: [
          'It is played louder',
          'It contains a tritone, and both notes of it want to resolve by a half step',
          'It has four notes instead of three',
        ],
        answer: 1,
        because:
          'The tritone between the third and the seventh. Four notes on their own change nothing — a major seventh has four too and sounds relaxed. It is the interval inside that does the work.',
      },
      {
        kind: 'text',
        body: 'When you meet these by ear, listen for the **rub**. A triad is clean. A seventh has a note in it grinding gently against another, and which kind it is depends on whether the chord feels tense or lush.',
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
        kind: 'question',
        prompt: 'The second example started on a different note. What stayed the same?',
        options: [
          'The two notes',
          'The distance between them',
          'Nothing — it was a different interval',
        ],
        answer: 1,
        because:
          'The distance, which is the entire definition. Both were seven half steps, so both are fifths — an interval has no key and no home, only a width.',
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

/**
 * The lesson behind a drill — the other half of the linkage rule.
 *
 * Lessons have always pointed forward at the drill that uses them. Pointing
 * back was the missing direction (docs/02-FEATURES.md §3.3): someone stuck on
 * roman numerals inside Progressions had no way to reach the explanation
 * except by leaving, finding the theory course, and reading past everything
 * ahead of it. That is the difference between theory and trivia.
 *
 * Keyed on the kind of question rather than the course, because a course can
 * change what it asks as it climbs — Chords starts on triads and ends on
 * inversions, and those are different explanations.
 */
export function conceptFor(kind: string, levelId = 1): string | null {
  switch (kind) {
    case 'read-note':
      return 'staff';
    case 'tap-rhythm':
      // The first levels are about note lengths; the later ones are about
      // where the bar line falls.
      return levelId >= 5 ? 'meter' : 'note-values';
    case 'interval-id':
      return 'intervals';
    case 'chord-quality':
      return levelId >= 3 ? 'sevenths' : 'triads';
    case 'chord-inversion':
      return 'triads';
    case 'progression-id':
      return levelId >= 4 ? 'cadences' : 'chords-in-key';
    case 'home-or-not':
    case 'rest-or-move':
    case 'which-is-home':
    case 'name-the-note':
    case 'sing-home':
    case 'sing-back':
    case 'sing-degree':
    case 'sing-phrase':
      return 'home';
    default:
      return null;
  }
}
