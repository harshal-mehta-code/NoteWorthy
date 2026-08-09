import { describe, expect, it } from 'vitest';
import {
  centerOf,
  describeSpan,
  isUsable,
  MIN_USABLE_SEMITONES,
  octaveShiftFor,
  shiftIntoRange,
  spanInOctaves,
  type VocalRange,
} from './range';

/** Roughly a bass, a tenor and a soprano, in MIDI. */
const LOW: VocalRange = { low: 40, high: 60 }; // E2 – C4
const MID: VocalRange = { low: 48, high: 69 }; // C3 – A4
const HIGH: VocalRange = { low: 60, high: 81 }; // C4 – A5

describe('isUsable', () => {
  it('rejects nothing measured', () => {
    expect(isUsable(null)).toBe(false);
  });

  it('rejects a range too narrow to be a voice', () => {
    expect(isUsable({ low: 60, high: 60 })).toBe(false);
    expect(isUsable({ low: 60, high: 60 + MIN_USABLE_SEMITONES - 1 })).toBe(false);
    expect(isUsable({ low: 60, high: 60 + MIN_USABLE_SEMITONES })).toBe(true);
  });

  it('rejects pitches outside human singing, which mean a detector octave error', () => {
    expect(isUsable({ low: 12, high: 40 })).toBe(false); // absurdly low
    expect(isUsable({ low: 70, high: 120 })).toBe(false); // absurdly high
    expect(isUsable(LOW)).toBe(true);
    expect(isUsable(HIGH)).toBe(true);
  });
});

describe('octaveShiftFor', () => {
  it('is a no-op when no range has been measured', () => {
    expect(octaveShiftFor(60, null)).toBe(0);
    expect(octaveShiftFor(60, { low: 60, high: 62 })).toBe(0); // unusable
  });

  it('only ever shifts by whole octaves', () => {
    for (const range of [LOW, MID, HIGH]) {
      for (let midi = 50; midi <= 75; midi++) {
        expect(Number.isInteger(octaveShiftFor(midi, range) / 12)).toBe(true);
      }
    }
  });

  it('moves middle C down for a low voice and up for a high one', () => {
    expect(octaveShiftFor(60, LOW)).toBe(-12); // centre 50, so C3
    expect(octaveShiftFor(60, HIGH)).toBe(12); // centre 70.5, so C5
  });

  it('leaves a note alone when it already sits near the middle', () => {
    expect(octaveShiftFor(Math.round(centerOf(MID)), MID)).toBe(0);
  });

  it('always lands within a tritone of the centre of the range', () => {
    for (const range of [LOW, MID, HIGH]) {
      for (let midi = 36; midi <= 84; midi++) {
        const landed = midi + octaveShiftFor(midi, range);
        expect(Math.abs(landed - centerOf(range))).toBeLessThanOrEqual(6);
      }
    }
  });

  it('preserves the note itself — a shift never changes the pitch class', () => {
    for (let midi = 48; midi <= 72; midi++) {
      const landed = midi + octaveShiftFor(midi, LOW);
      expect(((landed % 12) + 12) % 12).toBe(((midi % 12) + 12) % 12);
    }
  });
});

describe('shiftIntoRange', () => {
  it('returns the phrase untouched with no range', () => {
    expect(shiftIntoRange([60, 64, 67], null)).toEqual([60, 64, 67]);
  });

  it('handles an empty phrase', () => {
    expect(shiftIntoRange([], MID)).toEqual([]);
  });

  it('moves the whole phrase by one shift, keeping every interval intact', () => {
    const phrase = [60, 64, 67, 72];
    const moved = shiftIntoRange(phrase, LOW);
    const gaps = (xs: number[]) => xs.slice(1).map((n, i) => n - xs[i]);
    expect(gaps(moved)).toEqual(gaps(phrase));
    expect(moved[0]).toBeLessThan(phrase[0]);
    // One shift for all of them, not one per note.
    expect(new Set(moved.map((m, i) => m - phrase[i])).size).toBe(1);
  });

  it('shifts from the lowest note, so a wide phrase is not pushed under the range', () => {
    // A phrase spanning an octave, anchored well above a low voice.
    const phrase = [72, 79, 84];
    const moved = shiftIntoRange(phrase, LOW);
    expect(Math.min(...moved)).toBeGreaterThanOrEqual(LOW.low - 6);
  });
});

describe('descriptions', () => {
  it('reports the span in octaves to one decimal', () => {
    expect(spanInOctaves({ low: 48, high: 72 })).toBe(2);
    expect(spanInOctaves({ low: 48, high: 66 })).toBe(1.5);
  });

  it('describes spans in words, without claiming a voice type', () => {
    expect(describeSpan({ low: 60, high: 67 })).toBe('around half an octave');
    expect(describeSpan({ low: 60, high: 70 })).toBe('just under an octave');
    expect(describeSpan({ low: 60, high: 72 })).toBe('about an octave');
    expect(describeSpan({ low: 60, high: 78 })).toBe('an octave and a bit');
    expect(describeSpan({ low: 48, high: 72 })).toBe('about two octaves');
    expect(describeSpan({ low: 40, high: 76 })).toBe('over two octaves');
  });
});
