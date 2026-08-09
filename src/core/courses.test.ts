import { describe, expect, it } from 'vitest';
import { COURSES, PILLARS, getCourse, statKey } from './courses';
import { generate } from './question';
import { INTERVAL_LONG, INTERVAL_SHORT } from './intervals';
import { LETTERS, indexToMidi, letterOf, staffStep } from './reading';

const times = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('course registry', () => {
  it('has a unique id per course', () => {
    const ids = COURSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every pillar with at least one course', () => {
    for (const pillar of PILLARS) {
      expect(COURSES.some((c) => c.pillar === pillar)).toBe(true);
    }
  });

  it('gives every ready course either levels or lessons', () => {
    for (const c of COURSES.filter((c) => c.status === 'ready')) {
      expect(c.levels.length > 0 || (c.lessons ?? 0) > 0).toBe(true);
    }
  });

  it('numbers levels from 1 without gaps, since progress is an index', () => {
    for (const c of COURSES) {
      c.levels.forEach((l, i) => expect(l.id).toBe(i + 1));
    }
  });

  it('keys stats per course, so two courses cannot collide', () => {
    expect(statKey('intervals', 3)).toBe('intervals:3');
    expect(statKey('find-the-note', 3)).not.toBe(statKey('intervals', 3));
  });
});

describe('intervals course', () => {
  const course = getCourse('intervals')!;

  it('generates a playable pair for every level', () => {
    for (const level of course.levels) {
      for (const _ of times(200)) {
        void _;
        const q = generate(level, null);
        expect(q.midis).toHaveLength(2);

        const size = Math.abs(q.midis![1] - q.midis![0]);
        expect(level.intervalSet).toContain(size);
        expect(q.correctIds[0]).toBe(String(size));

        // The right answer has to be on a button.
        expect(q.options.map((o) => o.id)).toContain(q.correctIds[0]);
        expect(q.answerLabel).toBe(INTERVAL_LONG[size]);
      }
    }
  });

  it('actually descends on the descending level', () => {
    const down = course.levels.find((l) => l.intervalDirection === 'down')!;
    for (const _ of times(100)) {
      void _;
      const q = generate(down, null);
      expect(q.midis![1]).toBeLessThan(q.midis![0]);
    }
  });

  it('plays harmonic intervals together', () => {
    const harmonic = course.levels.find((l) => l.intervalDirection === 'harmonic')!;
    expect(generate(harmonic, null).simultaneous).toBe(true);
  });

  it('goes both ways on the mixed level', () => {
    const both = course.levels.find((l) => l.intervalDirection === 'both')!;
    const dirs = new Set(
      times(200).map(() => {
        const q = generate(both, null);
        return q.midis![1] > q.midis![0] ? 'up' : 'down';
      }),
    );
    expect(dirs.size).toBe(2);
  });

  it('keeps every pitch in a sane register', () => {
    for (const level of course.levels) {
      for (const _ of times(200)) {
        void _;
        for (const midi of generate(level, null).midis!) {
          expect(midi).toBeGreaterThanOrEqual(43); // G2
          expect(midi).toBeLessThanOrEqual(84); // C6
        }
      }
    }
  });

  it('labels every interval it can ask for', () => {
    for (const level of course.levels) {
      for (const size of level.intervalSet!) {
        expect(INTERVAL_SHORT[size]).toBeTruthy();
        expect(INTERVAL_LONG[size]).toBeTruthy();
      }
    }
  });
});

describe('note reading course', () => {
  const course = getCourse('note-reading')!;

  it('asks only for notes the level declares', () => {
    for (const level of course.levels) {
      for (const _ of times(200)) {
        void _;
        const q = generate(level, null);
        const index = q.staff!.index;

        if (level.readNotes) {
          expect(level.readNotes).toContain(index);
        } else {
          const [lo, hi] = level.readRange!;
          expect(index).toBeGreaterThanOrEqual(lo);
          expect(index).toBeLessThanOrEqual(hi);
        }

        expect(q.correctIds[0]).toBe(letterOf(index));
        expect(LETTERS).toContain(q.correctIds[0]);
      }
    }
  });

  it('uses the clef the level asks for', () => {
    for (const level of course.levels.filter((l) => l.clef !== 'both')) {
      for (const _ of times(50)) {
        void _;
        expect(generate(level, null).staff!.clef).toBe(level.clef);
      }
    }
  });

  it('mixes both clefs on the last level', () => {
    const both = course.levels.find((l) => l.clef === 'both')!;
    const clefs = new Set(times(200).map(() => generate(both, null).staff!.clef));
    expect(clefs.size).toBe(2);
  });

  it('always offers all seven letters as answers', () => {
    const q = generate(course.levels[0], null);
    expect(q.options.map((o) => o.id).sort()).toEqual([...LETTERS].sort());
  });

  it('plays the pitch the notation shows', () => {
    for (const _ of times(100)) {
      void _;
      const q = generate(course.levels[3], null);
      expect(q.midis![0]).toBe(indexToMidi(q.staff!.index));
    }
  });
});

describe('staff geometry', () => {
  it('puts the bottom line of each clef at step zero', () => {
    expect(staffStep(indexOfE4(), 'treble')).toBe(0);
    expect(staffStep(indexOfG2(), 'bass')).toBe(0);
  });

  it('puts middle C one ledger line below the treble stave', () => {
    // Step -2 is the first ledger line below; -1 would be the space under it.
    expect(staffStep(indexOfC4(), 'treble')).toBe(-2);
  });

  it('puts middle C one ledger line above the bass stave', () => {
    expect(staffStep(indexOfC4(), 'bass')).toBe(10);
  });
});

const indexOfC4 = () => 4 * 7 + 0;
const indexOfE4 = () => 4 * 7 + 2;
const indexOfG2 = () => 2 * 7 + 4;
