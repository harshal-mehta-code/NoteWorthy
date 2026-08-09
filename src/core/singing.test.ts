import { describe, expect, it } from 'vitest';
import { SING_PHRASES, buildPhrase } from './singing';
import { generate } from './question';
import { DIATONIC } from './music';

const MAJOR = DIATONIC.major;
const times = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('the Sing a Phrase ladder', () => {
  it('is entirely sing-phrase levels in the voice stage', () => {
    for (const level of SING_PHRASES) {
      expect(level.kind).toBe('sing-phrase');
      expect(level.stage).toBe('voice');
    }
  });

  it('never gets shorter as it goes up', () => {
    for (let i = 1; i < SING_PHRASES.length; i++) {
      expect(SING_PHRASES[i].sequenceLength).toBeGreaterThanOrEqual(
        SING_PHRASES[i - 1].sequenceLength,
      );
    }
  });

  it('moves one axis at a time — a level that changes mode does not also speed up', () => {
    for (let i = 1; i < SING_PHRASES.length; i++) {
      const prev = SING_PHRASES[i - 1];
      const next = SING_PHRASES[i];
      if (next.mode !== prev.mode) {
        expect(next.phraseGap!).toBeGreaterThanOrEqual(prev.phraseGap!);
      } else {
        expect(next.phraseGap!).toBeLessThanOrEqual(prev.phraseGap!);
      }
    }
  });

  it('gives every level enough notes to build its phrase from', () => {
    for (const level of SING_PHRASES) {
      // 'free' needs two to alternate between; runs need the full length.
      const needed = level.phraseShape === 'free' ? 2 : level.sequenceLength;
      expect(level.degrees.length).toBeGreaterThanOrEqual(needed);
    }
  });

  it('leaves enough time to sing each note before the next one arrives', () => {
    for (const level of SING_PHRASES) {
      expect(level.phraseGap! * 1000).toBeGreaterThan(level.phraseHoldMs!);
    }
  });

  it('generates only in-key notes, at the right length, on every level', () => {
    for (const level of SING_PHRASES) {
      for (const _ of times(40)) {
        const q = generate(level, null);
        expect(q.kind).toBe('sing-phrase');
        expect(q.sequence).toHaveLength(level.sequenceLength);
        expect(q.options).toHaveLength(0);
        for (const deg of q.sequence) expect(level.degrees).toContain(deg);
      }
    }
  });
});

describe('buildPhrase', () => {
  it('returns exactly the requested number of notes', () => {
    for (const shape of ['free', 'run', 'turn'] as const) {
      for (const length of [2, 3, 4, 5]) {
        expect(buildPhrase(MAJOR, length, shape)).toHaveLength(length);
      }
    }
  });

  it('never repeats a note immediately in a free phrase', () => {
    // A repeated note needs a break to be graded, which asks the singer to
    // phrase in a way nobody would choose.
    for (const _ of times(200)) {
      const phrase = buildPhrase([0, 4, 7], 5, 'free');
      for (let i = 1; i < phrase.length; i++) {
        expect(phrase[i]).not.toBe(phrase[i - 1]);
      }
    }
  });

  it('walks consecutive scale steps in a run', () => {
    for (const _ of times(100)) {
      const phrase = buildPhrase(MAJOR, 4, 'run');
      const sorted = [...MAJOR].sort((a, b) => a - b);
      const indices = phrase.map((d) => sorted.indexOf(d));
      const step = indices[1] - indices[0];
      expect(Math.abs(step)).toBe(1);
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i] - indices[i - 1]).toBe(step);
      }
    }
  });

  it('runs both up and down over many draws', () => {
    const directions = new Set(
      times(200).map(() => {
        const p = buildPhrase(MAJOR, 4, 'run');
        return p[1] > p[0] ? 'up' : 'down';
      }),
    );
    expect(directions.size).toBe(2);
  });

  it('turns around at the top and comes back', () => {
    for (const _ of times(100)) {
      const phrase = buildPhrase(MAJOR, 5, 'turn');
      const peak = phrase.indexOf(Math.max(...phrase));
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThan(phrase.length - 1);
      // Rising to the peak, falling after it.
      for (let i = 1; i <= peak; i++) expect(phrase[i]).toBeGreaterThan(phrase[i - 1]);
      for (let i = peak + 1; i < phrase.length; i++) {
        expect(phrase[i]).toBeLessThan(phrase[i - 1]);
      }
    }
  });

  it('never repeats the top note of a turn, which would need a break mid-run', () => {
    for (const length of [4, 5, 6, 7]) {
      for (const _ of times(50)) {
        const phrase = buildPhrase(MAJOR, length, 'turn');
        for (let i = 1; i < phrase.length; i++) {
          expect(phrase[i]).not.toBe(phrase[i - 1]);
        }
      }
    }
  });

  it('stays inside the given note set', () => {
    const pool = [0, 2, 4, 5, 7];
    for (const shape of ['free', 'run', 'turn'] as const) {
      for (const _ of times(100)) {
        for (const deg of buildPhrase(pool, 4, shape)) expect(pool).toContain(deg);
      }
    }
  });

  it('is deterministic when given a fixed random source', () => {
    const fixed = () => 0.5;
    const a = buildPhrase(MAJOR, 5, 'turn', fixed);
    const b = buildPhrase(MAJOR, 5, 'turn', fixed);
    expect(a).toEqual(b);
  });
});
