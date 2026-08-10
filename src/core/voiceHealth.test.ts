import { describe, expect, it } from 'vitest';
import {
  COOL_DOWN,
  HIGH_ZONE,
  SAFETY_NOTE,
  STRAIN_MISSES,
  WARM_FOR_MS,
  WARM_UP,
  isWarm,
  routineSeconds,
  sessionAdvice,
  shouldEase,
  stepNotes,
  stepPitch,
  type SungAttempt,
} from './voiceHealth';
import type { VocalRange } from './range';

const MID: VocalRange = { low: 48, high: 72 };
const LOW: VocalRange = { low: 40, high: 60 };
const MINUTE = 60_000;

describe('the routines', () => {
  it('has a warm-up and a cool-down, both short enough to actually do', () => {
    expect(WARM_UP.length).toBeGreaterThan(2);
    expect(COOL_DOWN.length).toBeGreaterThan(1);
    // A routine longer than the practice it precedes will simply be skipped.
    expect(routineSeconds(WARM_UP)).toBeLessThanOrEqual(180);
    expect(routineSeconds(COOL_DOWN)).toBeLessThanOrEqual(90);
  });

  it('gives every step something to actually do', () => {
    for (const step of [...WARM_UP, ...COOL_DOWN]) {
      expect(step.name.length).toBeGreaterThan(0);
      expect(step.how.length).toBeGreaterThan(20);
      expect(step.seconds).toBeGreaterThan(10);
    }
  });

  it('has a unique id per step', () => {
    const ids = [...WARM_UP, ...COOL_DOWN].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never opens a routine at the top or bottom of the range', () => {
    // Starting cold at an extreme is the exact thing a warm-up prevents.
    for (const step of [...WARM_UP, ...COOL_DOWN]) {
      expect(step.at).toBeGreaterThan(0.25);
      expect(step.at).toBeLessThan(0.7);
    }
  });

  it('cools down lower than it warmed up', () => {
    const warmEnd = WARM_UP[WARM_UP.length - 1].at;
    const coolEnd = COOL_DOWN[COOL_DOWN.length - 1].at;
    expect(coolEnd).toBeLessThan(warmEnd);
  });
});

describe('pitching a routine to a voice', () => {
  it('places steps inside the measured range', () => {
    for (const step of [...WARM_UP, ...COOL_DOWN]) {
      for (const range of [MID, LOW]) {
        const pitch = stepPitch(step, range);
        expect(pitch).toBeGreaterThanOrEqual(range.low);
        expect(pitch).toBeLessThanOrEqual(range.high);
      }
    }
  });

  it('pitches a low voice lower than a high one', () => {
    const step = WARM_UP[0];
    expect(stepPitch(step, LOW)).toBeLessThan(stepPitch(step, MID));
  });

  it('falls back to somewhere sane with no range measured', () => {
    for (const step of [...WARM_UP, ...COOL_DOWN]) {
      const pitch = stepPitch(step, null);
      expect(pitch).toBeGreaterThan(50);
      expect(pitch).toBeLessThan(70);
    }
  });

  it('keeps a whole pattern inside the range, not just its first note', () => {
    for (const step of [...WARM_UP, ...COOL_DOWN]) {
      for (const midi of stepNotes(step, MID)) {
        expect(midi).toBeGreaterThanOrEqual(MID.low);
        expect(midi).toBeLessThanOrEqual(MID.high);
      }
    }
  });

  it('gives no notes for a free glide', () => {
    const siren = WARM_UP.find((s) => s.pattern === null)!;
    expect(stepNotes(siren, MID)).toEqual([]);
  });
});

describe('staying warm', () => {
  it('is cold with no warm-up on record', () => {
    expect(isWarm(null)).toBe(false);
  });

  it('is warm right after one', () => {
    const now = Date.now();
    expect(isWarm(now, now)).toBe(true);
  });

  it('stays warm for the whole window, then goes cold', () => {
    const now = Date.now();
    expect(isWarm(now - WARM_FOR_MS + MINUTE, now)).toBe(true);
    expect(isWarm(now - WARM_FOR_MS - MINUTE, now)).toBe(false);
  });
});

describe('sessionAdvice', () => {
  it('says nothing early on', () => {
    expect(sessionAdvice(0)).toBeNull();
    expect(sessionAdvice(10 * MINUTE)).toBeNull();
  });

  it('escalates at fifteen, twenty-five and forty minutes', () => {
    expect(sessionAdvice(15 * MINUTE)?.level).toBe('note');
    expect(sessionAdvice(20 * MINUTE)?.level).toBe('note');
    expect(sessionAdvice(25 * MINUTE)?.level).toBe('nudge');
    expect(sessionAdvice(39 * MINUTE)?.level).toBe('nudge');
    expect(sessionAdvice(40 * MINUTE)?.level).toBe('stop');
    expect(sessionAdvice(90 * MINUTE)?.level).toBe('stop');
  });

  it('says something usable at every level', () => {
    for (const minutes of [15, 25, 40]) {
      const advice = sessionAdvice(minutes * MINUTE)!;
      expect(advice.message.length).toBeGreaterThan(30);
    }
  });

  it('advises rather than forbids, even at the top', () => {
    // Locking someone out of their own practice would be a dark pattern
    // wearing a lab coat, and the app cannot actually tell a tired voice.
    const stop = sessionAdvice(60 * MINUTE)!;
    expect(stop.message).not.toMatch(/you (must|cannot|can't)/i);
  });
});

describe('shouldEase', () => {
  const high = (hit: boolean): SungAttempt => ({
    midi: MID.low + (MID.high - MID.low) * (HIGH_ZONE + 0.1),
    hit,
  });
  const low = (hit: boolean): SungAttempt => ({ midi: MID.low + 2, hit });

  it('does not ease with nothing to go on', () => {
    expect(shouldEase([], MID)).toBe(false);
    expect(shouldEase([high(false)], MID)).toBe(false);
  });

  it('eases after repeated misses at the top of the range', () => {
    expect(shouldEase(Array.from({ length: STRAIN_MISSES }, () => high(false)), MID)).toBe(true);
  });

  it('ignores misses low in the range, which are not strain', () => {
    // Failing on a low note means you have not learned it, not that you are
    // pushing — and dropping the octave would make it worse, not better.
    expect(shouldEase(Array.from({ length: 6 }, () => low(false)), MID)).toBe(false);
  });

  it('ignores high notes that were hit', () => {
    expect(shouldEase(Array.from({ length: 6 }, () => high(true)), MID)).toBe(false);
  });

  it('only looks at recent attempts, so an old bad patch stops counting', () => {
    const history = [
      ...Array.from({ length: STRAIN_MISSES }, () => high(false)),
      ...Array.from({ length: 6 }, () => low(true)),
    ];
    expect(shouldEase(history, MID)).toBe(false);
  });

  it('cannot ease without a measured range to judge "high" against', () => {
    expect(shouldEase(Array.from({ length: 6 }, () => high(false)), null)).toBe(false);
  });

  it('handles a degenerate range without dividing by zero', () => {
    expect(shouldEase([high(false)], { low: 60, high: 60 })).toBe(false);
  });
});

describe('the safety note', () => {
  it('says it is not diagnosis, and says what to do if it hurts', () => {
    expect(SAFETY_NOTE).toMatch(/not diagnosis/i);
    expect(SAFETY_NOTE).toMatch(/hurt/i);
    expect(SAFETY_NOTE).toMatch(/stop/i);
  });
});
