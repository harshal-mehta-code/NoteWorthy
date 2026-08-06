import { describe, expect, it } from 'vitest';
import {
  DIATONIC,
  RESTFUL,
  degreeLabel,
  degreeSolfege,
  degreeToMidi,
  keyLabel,
  pickDegree,
  tonicTriad,
} from './music';

describe('degree labels', () => {
  it('names the major scale by step number', () => {
    expect(DIATONIC.major.map((d) => degreeLabel(d, 'major'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
  });

  it('flattens the third, sixth and seventh in minor', () => {
    expect(DIATONIC.minor.map((d) => degreeLabel(d, 'minor'))).toEqual([
      '1',
      '2',
      '♭3',
      '4',
      '5',
      '♭6',
      '♭7',
    ]);
  });

  it('spells chromatics in major', () => {
    expect(degreeLabel(6, 'major')).toBe('♯4');
    expect(degreeLabel(10, 'major')).toBe('♭7');
  });

  it('uses mode-independent chromatic solfege', () => {
    // The same semitone gets the same syllable whichever mode you are in —
    // that is the whole point of movable do.
    expect(degreeSolfege(3)).toBe('Me');
    expect(degreeSolfege(4)).toBe('Mi');
    expect(degreeSolfege(10)).toBe('Te');
  });
});

describe('pitch maths', () => {
  it('places degrees the right distance above home', () => {
    expect(degreeToMidi(60, 0)).toBe(60);
    expect(degreeToMidi(60, 7)).toBe(67);
    expect(degreeToMidi(60, 7, true)).toBe(79);
  });

  it('builds a minor home chord with a flat third', () => {
    expect(tonicTriad(60, 'major')).toContain(76); // E5
    expect(tonicTriad(60, 'minor')).toContain(75); // E♭5
  });

  it('labels minor keys', () => {
    expect(keyLabel({ name: 'C', tonic: 60 }, 'major')).toBe('C');
    expect(keyLabel({ name: 'C', tonic: 60 }, 'minor')).toBe('C minor');
  });
});

describe('restful degrees', () => {
  it('is the home chord in each mode', () => {
    expect(RESTFUL.major).toEqual([0, 4, 7]);
    expect(RESTFUL.minor).toEqual([0, 3, 7]);
  });
});

describe('pickDegree', () => {
  const pool = DIATONIC.major;

  it('never repeats the previous degree', () => {
    for (let i = 0; i < 200; i++) {
      expect(pickDegree(pool, 4)).not.toBe(4);
    }
  });

  it('returns the only option when the pool has one', () => {
    expect(pickDegree([5], null)).toBe(5);
    // Even when that one degree is also the previous one — there is nothing
    // else to pick, and returning undefined would break the caller.
    expect(pickDegree([5], 5)).toBe(5);
  });

  it('favours heavily weighted degrees', () => {
    const weights = new Map(pool.map((d) => [d, d === 5 ? 3.5 : 1]));
    const counts = new Map<number, number>();
    for (let i = 0; i < 4000; i++) {
      const d = pickDegree(pool, null, weights);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    const heavy = counts.get(5) ?? 0;
    const others = pool.filter((d) => d !== 5).map((d) => counts.get(d) ?? 0);
    const meanOther = others.reduce((a, b) => a + b, 0) / others.length;

    // Weight 3.5 against 1.0 should show up as roughly 3.5x, with slack for
    // sampling noise.
    expect(heavy / meanOther).toBeGreaterThan(2.5);
    expect(heavy / meanOther).toBeLessThan(4.5);
  });

  it('still shows every degree, so strong notes cannot rot', () => {
    const weights = new Map(pool.map((d) => [d, d === 5 ? 3.5 : 1]));
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(pickDegree(pool, null, weights));
    expect(seen.size).toBe(pool.length);
  });
});
