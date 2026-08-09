/**
 * Vocal range, and what the app does with it.
 *
 * Grading has always been octave-agnostic — a bass and a soprano asked for
 * the same note correctly sing octaves apart, and marking either wrong would
 * be nonsense. But the *reference* the app plays was still fixed around
 * middle C, which quietly turned "sing that back" into "transpose that, then
 * sing it" for anyone whose voice doesn't live there. Two extra steps, both
 * of them harder than the skill being trained.
 *
 * So: measure the range once, then move every sung reference into it. Nothing
 * about the exercise changes — only the octave it arrives in.
 */

export type VocalRange = { low: number; high: number };

/**
 * A range narrower than this is almost certainly a bad capture — a cough, a
 * hum that never moved, the mic picking up the room — rather than a voice.
 */
export const MIN_USABLE_SEMITONES = 7;

/** Ranges outside human singing are a detector octave error, not a voice. */
export const PLAUSIBLE_LOW = 33; // A1
export const PLAUSIBLE_HIGH = 88; // E6

export function isUsable(range: VocalRange | null): range is VocalRange {
  if (!range) return false;
  const { low, high } = range;
  if (high - low < MIN_USABLE_SEMITONES) return false;
  return low >= PLAUSIBLE_LOW && high <= PLAUSIBLE_HIGH;
}

/**
 * The middle of the range, which is where singing is easiest. Deliberately
 * the plain midpoint: the "most comfortable" part of a voice sits a little
 * below centre, but that varies enough between people that pretending to
 * model it would be false precision.
 */
export function centerOf(range: VocalRange): number {
  return (range.low + range.high) / 2;
}

/**
 * Semitones — always a whole number of octaves — to move a note into the
 * singer's range. Returns 0 when there's no usable range recorded, so every
 * caller works unchanged for someone who never ran the check.
 *
 * Octaves only: shifting by anything else would change the note, and the
 * note is the entire answer.
 */
export function octaveShiftFor(midi: number, range: VocalRange | null): number {
  if (!isUsable(range)) return 0;
  const center = centerOf(range);
  const octaves = Math.round((center - midi) / 12);
  // `|| 0` normalises the -0 that Math.round returns for a small negative,
  // which is arithmetically harmless but reads as "-0 semitones" if displayed.
  return octaves * 12 || 0;
}

/** Apply the shift to a whole phrase, keeping its internal shape intact. */
export function shiftIntoRange(midis: number[], range: VocalRange | null): number[] {
  if (!midis.length || !isUsable(range)) return midis;
  // One shift for the phrase, chosen from its lowest note, so the intervals
  // between notes survive untouched.
  const shift = octaveShiftFor(Math.min(...midis), range);
  return midis.map((m) => m + shift);
}

/** Range width in octaves, to one decimal — the number singers actually quote. */
export function spanInOctaves(range: VocalRange): number {
  return Math.round(((range.high - range.low) / 12) * 10) / 10;
}

/**
 * A plain description of the span. Deliberately *not* a voice type: bass,
 * tenor, alto and soprano are classifications about timbre and tessitura as
 * much as range, they carry gender baggage the app has no business assigning,
 * and a two-note measurement cannot support any of it.
 */
export function describeSpan(range: VocalRange): string {
  const semis = range.high - range.low;
  if (semis < 9) return 'around half an octave';
  if (semis < 11) return 'just under an octave';
  if (semis < 14) return 'about an octave';
  if (semis < 22) return 'an octave and a bit';
  if (semis < 26) return 'about two octaves';
  return 'over two octaves';
}
