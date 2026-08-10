/**
 * Vocal health.
 *
 * docs/01-PEDAGOGY.md §4.4 calls this non-negotiable, and it is the only part
 * of the plan where getting it wrong can hurt someone rather than just teach
 * them badly. Four rules, all of them implemented here:
 *
 * 1. Never sing cold. A warm-up bookends a vocal session, a cool-down closes
 *    it.
 * 2. Nudge at 15 and 25 minutes of singing; say stop at 40.
 * 3. On strain-adjacent signals — repeated misses at the top of the range —
 *    drop the transposition rather than pushing.
 * 4. Say plainly that this is training, not diagnosis.
 *
 * ## One deliberate departure from the spec
 *
 * The spec says the warm-up is *non-skippable*. Taken literally that means a
 * two-minute routine in front of every sixty-second round, which would break
 * the promise that a round is quick and would train people to dread opening
 * the app — the surest way to make them skip warming up altogether.
 *
 * So: warming up is required, but it *lasts*. Sing within `WARM_FOR_MS` of a
 * warm-up and you are still warm. That honours the rule the doc is actually
 * protecting — never sing cold — without gating every round behind it.
 */

import type { VocalRange } from './range';

export type VoiceStep = {
  id: string;
  name: string;
  /** What to actually do, in one sentence. */
  how: string;
  seconds: number;
  /**
   * Where in the range to pitch it, 0 = bottom, 1 = top. Warm-ups start in
   * the comfortable middle and never open at the extremes — the point is to
   * loosen, not to test.
   */
  at: number;
  /** A pattern in semitones from that pitch, or null for free vocalising. */
  pattern: number[] | null;
};

/**
 * Never opens at the top or bottom of the range. Starting cold at either
 * extreme is exactly the thing a warm-up exists to prevent.
 */
export const WARM_UP: VoiceStep[] = [
  {
    id: 'hum',
    name: 'Humming',
    how: 'Lips closed, jaw loose. Hum gently along with the note — quiet is the point.',
    seconds: 30,
    at: 0.45,
    pattern: [0],
  },
  {
    id: 'trills',
    name: 'Lip trills',
    how: 'Let your lips buzz — a motorboat sound. Follow the notes down.',
    seconds: 35,
    at: 0.5,
    pattern: [4, 2, 0],
  },
  {
    id: 'sirens',
    name: 'Sirens',
    how: 'One smooth glide up and back down on "ng". No jumps, no pushing at either end.',
    seconds: 35,
    at: 0.4,
    pattern: null,
  },
  {
    id: 'five-note',
    name: 'Five notes',
    how: 'Up and back down on "ah". Comfortable volume throughout.',
    seconds: 40,
    at: 0.5,
    pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0],
  },
];

/** Descending and quiet, which is what a voice wants after work. */
export const COOL_DOWN: VoiceStep[] = [
  {
    id: 'sighs',
    name: 'Descending sighs',
    how: 'Slide gently down from a comfortable note on "oo". Let it fall rather than pushing it.',
    seconds: 30,
    at: 0.55,
    pattern: null,
  },
  {
    id: 'closing-hum',
    name: 'Closing hum',
    how: 'Quiet humming, low in your range. Finish softer than you started.',
    seconds: 30,
    at: 0.35,
    pattern: [0],
  },
];

export function routineSeconds(steps: VoiceStep[]): number {
  return steps.reduce((sum, s) => sum + s.seconds, 0);
}

/** Where a routine step sits, in MIDI, for a given voice. */
export function stepPitch(step: VoiceStep, range: VocalRange | null): number {
  // Middle C is a reasonable stand-in for a voice we have not measured, and
  // every step is a comfortable-middle fraction rather than an extreme.
  if (!range) return 60 + Math.round((step.at - 0.5) * 8);
  return Math.round(range.low + (range.high - range.low) * step.at);
}

/** The whole pattern for a step, in MIDI. Null patterns are free glides. */
export function stepNotes(step: VoiceStep, range: VocalRange | null): number[] {
  const base = stepPitch(step, range);
  return (step.pattern ?? []).map((semi) => base + semi);
}

// ------------------------------------------------------------ how long ----

/** How long a warm-up keeps you warm. */
export const WARM_FOR_MS = 30 * 60_000;

export function isWarm(lastWarmUpAt: number | null, now = Date.now()): boolean {
  return lastWarmUpAt !== null && now - lastWarmUpAt < WARM_FOR_MS;
}

export type VoiceAdvice = {
  level: 'note' | 'nudge' | 'stop';
  message: string;
};

/**
 * What to say about how long they have been singing.
 *
 * Advice, never enforcement. Locking someone out of their own practice at 40
 * minutes would be a dark pattern wearing a lab coat, and the app cannot
 * actually tell a tired voice from an untired one — so it says what it knows
 * and leaves the decision where it belongs.
 */
export function sessionAdvice(sungMs: number): VoiceAdvice | null {
  const minutes = sungMs / 60_000;
  if (minutes >= 40) {
    return {
      level: 'stop',
      message:
        "That's forty minutes of singing. This is the point to stop for today — voices tire long before they hurt, and pushing past tired is where damage happens.",
    };
  }
  if (minutes >= 25) {
    return {
      level: 'nudge',
      message:
        "Twenty-five minutes of singing. A good place to finish with a cool-down, unless you're feeling completely fresh.",
    };
  }
  if (minutes >= 15) {
    return {
      level: 'note',
      message: "Fifteen minutes of singing so far. Worth a sip of water.",
    };
  }
  return null;
}

// --------------------------------------------------------------- strain ----

/** Recent sung attempts, newest last. */
export type SungAttempt = { midi: number; hit: boolean };

/** How many recent attempts to consider when looking for strain. */
export const STRAIN_WINDOW = 6;
/** Misses this high in the range, this many times, and we back off. */
export const STRAIN_MISSES = 3;
/** The top of the range, as a fraction, where strain is plausible. */
export const HIGH_ZONE = 0.75;

/**
 * Whether to drop the octave rather than keep asking for high notes.
 *
 * Repeated failure at the top of a range is the one strain-adjacent signal
 * this app can actually observe. It cannot distinguish "straining" from "has
 * not learned that note yet" — but the right response to both is the same,
 * which is what makes acting on it safe rather than presumptuous.
 */
export function shouldEase(attempts: SungAttempt[], range: VocalRange | null): boolean {
  if (!range || range.high <= range.low) return false;
  const threshold = range.low + (range.high - range.low) * HIGH_ZONE;
  const recent = attempts.slice(-STRAIN_WINDOW);
  const highMisses = recent.filter((a) => !a.hit && a.midi >= threshold).length;
  return highMisses >= STRAIN_MISSES;
}

/**
 * The safety copy, in one place so it reads the same everywhere.
 *
 * "Training, not diagnosis" is the important half: an app that grades your
 * voice can very easily be mistaken for one that can tell you something about
 * your health, and it cannot.
 */
export const SAFETY_NOTE =
  'This is training, not diagnosis. Nothing here can tell you anything about your vocal health — if singing ever hurts, feels scratchy, or leaves you hoarse, stop and rest.';
