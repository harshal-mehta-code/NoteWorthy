/**
 * Chord progressions — naming chords by their role in a key.
 *
 * This is the payoff of the whole ear pillar. Knowing a chord is minor is
 * useful; knowing it is the **vi** of the key you're in is what lets you
 * work out a song, transpose it, and play along with something you've never
 * heard. Quality (the Chords course) is the prerequisite; this is where it
 * gets used.
 *
 * Progressions always start on I, and the app says so. Guessing the first
 * chord is a different, much harder skill — finding the key — and mixing it
 * in would make every question test two things at once.
 */

import { buildChord, type ChordQuality } from './chords';
import type { Level } from './levels';
import type { Mode } from './music';

export type Roman =
  // major keys
  | 'I'
  | 'ii'
  | 'iii'
  | 'IV'
  | 'V'
  | 'vi'
  | 'vii°'
  // minor keys
  | 'i'
  | 'ii°'
  | 'III'
  | 'iv'
  | 'v'
  | 'VI'
  | 'VII';

type RomanInfo = {
  /** Semitones above the tonic. */
  root: number;
  quality: ChordQuality;
  mode: Mode;
  /** What the chord does, in plain words. */
  role: string;
};

export const ROMAN: Record<Roman, RomanInfo> = {
  I: { root: 0, quality: 'maj', mode: 'major', role: 'home — settled, where things end up' },
  ii: { root: 2, quality: 'min', mode: 'major', role: 'shaded, and almost always heading for V' },
  iii: { root: 4, quality: 'min', mode: 'major', role: 'the rarest one; shaded and a little wistful' },
  IV: { root: 5, quality: 'maj', mode: 'major', role: 'bright and lifting, a step away from home' },
  V: { root: 7, quality: 'maj', mode: 'major', role: 'tense and pulling hard back to home' },
  vi: { root: 9, quality: 'min', mode: 'major', role: 'the sad one — the minor chord inside a major key' },
  'vii°': { root: 11, quality: 'dim', mode: 'major', role: 'unstable, nearly always passing through' },

  i: { root: 0, quality: 'min', mode: 'minor', role: 'home, and home is dark here' },
  'ii°': { root: 2, quality: 'dim', mode: 'minor', role: 'unstable, on its way to v' },
  III: { root: 3, quality: 'maj', mode: 'minor', role: 'the bright relief inside a minor key' },
  iv: { root: 5, quality: 'min', mode: 'minor', role: 'shaded and lifting slightly' },
  v: { root: 7, quality: 'min', mode: 'minor', role: 'pulls home, but gently — no leading tone' },
  VI: { root: 8, quality: 'maj', mode: 'minor', role: 'bright and broad, a favourite in minor keys' },
  VII: { root: 10, quality: 'maj', mode: 'minor', role: 'bright, and usually a step toward III' },
};

/** Canonical order, used as the numeric key for per-item stats. */
export const ROMAN_ORDER: Roman[] = [
  'I',
  'ii',
  'iii',
  'IV',
  'V',
  'vi',
  'vii°',
  'i',
  'ii°',
  'III',
  'iv',
  'v',
  'VI',
  'VII',
];

export function romanIndex(r: Roman): number {
  return ROMAN_ORDER.indexOf(r);
}

/**
 * Voice a progression with smooth part-writing.
 *
 * Each chord is placed in whichever inversion moves least from the one
 * before. Without this every chord lands in root position and the result is
 * a slab of parallel blocks that sounds nothing like music — which matters,
 * because the whole point is to recognise these in real songs.
 */
export function voiceProgression(tonic: number, romans: Roman[]): number[][] {
  const out: number[][] = [];
  let previous: number[] | null = null;

  for (const roman of romans) {
    const info = ROMAN[roman];
    const root = tonic + info.root;

    let best: number[] | null = null;
    let bestCost = Infinity;

    // Try every inversion in a couple of octaves and keep the closest.
    for (let inversion = 0; inversion < 3; inversion++) {
      for (const shift of [-12, 0, 12]) {
        const candidate = buildChord(root + shift, info.quality, inversion);
        if (candidate[0] < 48 || candidate[candidate.length - 1] > 79) continue;

        const cost = previous
          ? candidate.reduce(
              (sum, note) =>
                sum + Math.min(...previous!.map((p) => Math.abs(p - note))),
              0,
            )
          : Math.abs(candidate[0] - (tonic + 12));

        if (cost < bestCost) {
          bestCost = cost;
          best = candidate;
        }
      }
    }

    const chord = best ?? buildChord(root, info.quality);
    out.push(chord);
    previous = chord;
  }
  return out;
}

/** A bass note an octave below the chord, so the root is audible. */
export function bassFor(tonic: number, roman: Roman): number {
  return tonic + ROMAN[roman].root - 12;
}

function level(
  partial: Partial<Level> & Pick<Level, 'id' | 'name' | 'blurb' | 'romanSet' | 'progressionLength'>,
): Level {
  return {
    stage: 'naming',
    kind: 'progression-id',
    mode: 'major',
    degrees: [],
    intro: 'full',
    drone: false,
    twoOctaves: false,
    sequenceLength: 1,
    keyPerQuestion: false,
    singTolerance: 45,
    roundLength: 5,
    ...partial,
  } as Level;
}

export const PROGRESSIONS: Level[] = [
  level({
    id: 1,
    name: 'Two chords',
    blurb: 'Home, then one other. Was it the bright lift or the tense one?',
    romanSet: ['IV', 'V'],
    progressionLength: 2,
    roundLength: 6,
  }),
  level({
    id: 2,
    name: 'The big three, plus the sad one',
    blurb: 'Add vi — the minor chord hiding inside every major key.',
    romanSet: ['IV', 'V', 'vi'],
    progressionLength: 2,
    roundLength: 6,
  }),
  level({
    id: 3,
    name: 'Three chords',
    blurb: 'Two to name now, and you have to hold the first while the second plays.',
    romanSet: ['IV', 'V', 'vi'],
    progressionLength: 3,
  }),
  level({
    id: 4,
    name: 'The whole family',
    blurb: 'Add ii and iii. Every common chord of a major key is now in play.',
    romanSet: ['ii', 'iii', 'IV', 'V', 'vi'],
    progressionLength: 3,
  }),
  level({
    id: 5,
    name: 'Four chords',
    blurb: 'Full-length progressions — the shape most songs are actually built from.',
    romanSet: ['ii', 'iii', 'IV', 'V', 'vi'],
    progressionLength: 4,
    roundLength: 4,
  }),
  level({
    id: 6,
    name: 'Minor keys',
    blurb: 'Home is dark now, and the family around it has changed.',
    mode: 'minor',
    romanSet: ['III', 'iv', 'v', 'VI', 'VII'],
    progressionLength: 3,
  }),
  level({
    id: 7,
    name: 'Songs you know',
    blurb: 'Progressions lifted from real music, four chords at a time.',
    romanSet: ['ii', 'iii', 'IV', 'V', 'vi'],
    progressionLength: 4,
    useRealProgressions: true,
    roundLength: 4,
  }),
];

/**
 * Progressions that carry an enormous amount of real music between them.
 * Level 7 draws from these rather than generating, because recognising
 * *these specific shapes* is most of what playing along actually requires.
 */
export const REAL_PROGRESSIONS: { romans: Roman[]; name: string }[] = [
  { romans: ['I', 'V', 'vi', 'IV'], name: 'the four-chord song' },
  { romans: ['I', 'vi', 'IV', 'V'], name: 'the fifties turnaround' },
  { romans: ['I', 'IV', 'V', 'IV'], name: 'the three-chord rock shape' },
  { romans: ['I', 'iii', 'IV', 'V'], name: 'a gentler climb to V' },
  { romans: ['I', 'vi', 'ii', 'V'], name: 'the circle turnaround' },
  { romans: ['I', 'IV', 'vi', 'V'], name: 'a lifted variant of the four-chord song' },
  { romans: ['I', 'V', 'IV', 'V'], name: 'a rocking back and forth around V' },
];
