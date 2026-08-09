import { describe, expect, it } from 'vitest';
import { COURSES, PILLARS, getCourse, statKey } from './courses';
import { generate } from './question';
import { INTERVAL_LONG, INTERVAL_SHORT } from './intervals';
import { LETTERS, indexToMidi, letterOf, staffStep } from './reading';
import { buildChord } from './chords';
import { REAL_PROGRESSIONS, voiceProgression } from './progressions';

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

describe('chords course', () => {
  const course = getCourse('chord-quality')!;

  it('is a ready course in the ear pillar', () => {
    expect(course.status).toBe('ready');
    expect(course.pillar).toBe('ear');
  });

  it('only asks for qualities the level declares', () => {
    for (const level of course.levels) {
      for (const _ of times(200)) {
        void _;
        const q = generate(level, null);
        if (level.kind === 'chord-quality') {
          expect(level.chordSet).toContain(q.correctIds[0]);
          expect(q.options.map((o) => o.id)).toContain(q.correctIds[0]);
        }
        expect(q.midis!.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('varies root, register and voicing, so no single sound can be memorised', () => {
    const level = course.levels[0];
    const roots = new Set<number>();
    const shapes = new Set<string>();
    for (const _ of times(300)) {
      void _;
      const midis = generate(level, null).midis!;
      roots.add(midis[0]);
      shapes.add(midis.map((m) => m - midis[0]).join(','));
    }
    expect(roots.size).toBeGreaterThan(8);
    expect(shapes.size).toBeGreaterThan(1);
  });

  it('builds each quality from the right intervals', () => {
    expect(buildChord(60, 'maj')).toEqual([60, 64, 67]);
    expect(buildChord(60, 'min')).toEqual([60, 63, 67]);
    expect(buildChord(60, 'dim')).toEqual([60, 63, 66]);
    expect(buildChord(60, 'aug')).toEqual([60, 64, 68]);
    expect(buildChord(60, 'dom7')).toEqual([60, 64, 67, 70]);
    expect(buildChord(60, 'm7b5')).toEqual([60, 63, 66, 70]);
  });

  it('actually changes the bass note when inverting', () => {
    // First inversion of C major puts E at the bottom, not C.
    expect(buildChord(60, 'maj', 1)[0]).toBe(64);
    expect(buildChord(60, 'maj', 2)[0]).toBe(67);
    expect(buildChord(60, 'dom7', 3)[0]).toBe(70);
  });

  it('offers one inversion option per chord tone', () => {
    const level = course.levels.find((l) => l.kind === 'chord-inversion')!;
    for (const _ of times(100)) {
      void _;
      const q = generate(level, null);
      expect(q.options).toHaveLength(q.midis!.length);
      expect(Number(q.correctIds[0])).toBeLessThan(q.midis!.length);
    }
  });

  it('keeps every chord tone in a playable register', () => {
    for (const level of course.levels) {
      for (const _ of times(200)) {
        void _;
        for (const midi of generate(level, null).midis!) {
          expect(midi).toBeGreaterThanOrEqual(48);
          expect(midi).toBeLessThanOrEqual(96);
        }
      }
    }
  });
});

describe('progressions course', () => {
  const course = getCourse('progressions')!;

  it('always starts on home, and never asks you to name it', () => {
    for (const level of course.levels) {
      for (const _ of times(150)) {
        void _;
        const q = generate(level, null, undefined, 60);
        // One fewer answer than chords: the opening chord is given.
        expect(q.correctIds).toHaveLength(q.chordSeq!.length - 1);
        expect(q.answerLabel.startsWith(level.mode === 'minor' ? 'i' : 'I')).toBe(true);
      }
    }
  });

  it('only asks for chords the level declares', () => {
    for (const level of course.levels.filter((l) => !l.useRealProgressions)) {
      for (const _ of times(150)) {
        void _;
        const q = generate(level, null, undefined, 60);
        for (const id of q.correctIds) expect(level.romanSet).toContain(id);
        expect(q.options.map((o) => o.id)).toEqual(level.romanSet);
      }
    }
  });

  it('never repeats a chord back to back — a repeat wastes a slot', () => {
    const level = course.levels.find((l) => (l.progressionLength ?? 0) >= 3 && !l.useRealProgressions)!;
    for (const _ of times(200)) {
      void _;
      const ids = generate(level, null, undefined, 60).correctIds;
      for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    }
  });

  it('voices every chord in a singable register', () => {
    for (const level of course.levels) {
      for (const _ of times(100)) {
        void _;
        for (const chord of generate(level, null, undefined, 60).chordSeq!) {
          expect(Math.min(...chord)).toBeGreaterThanOrEqual(36);
          expect(Math.max(...chord)).toBeLessThanOrEqual(84);
        }
      }
    }
  });

  it('voice-leads smoothly rather than jumping between root positions', () => {
    // Total movement between adjacent chords should be small; four blocks in
    // root position would average far more than this.
    const chords = voiceProgression(60, ['I', 'V', 'vi', 'IV']);
    for (let i = 1; i < chords.length; i++) {
      const movement = chords[i].reduce(
        (sum, note) => sum + Math.min(...chords[i - 1].map((p) => Math.abs(p - note))),
        0,
      );
      expect(movement).toBeLessThanOrEqual(6);
    }
  });

  it('builds each roman numeral on the right degree with the right quality', () => {
    const [tonic, subdominant, dominant, submediant] = voiceProgression(60, ['I', 'IV', 'V', 'vi']);
    const pcs = (c: number[]) => new Set(c.map((m) => ((m % 12) + 12) % 12));
    expect(pcs(tonic)).toEqual(new Set([0, 4, 7])); // C E G
    expect(pcs(subdominant)).toEqual(new Set([5, 9, 0])); // F A C
    expect(pcs(dominant)).toEqual(new Set([7, 11, 2])); // G B D
    expect(pcs(submediant)).toEqual(new Set([9, 0, 4])); // A C E
  });

  it('uses real progressions on the last level', () => {
    const level = course.levels.find((l) => l.useRealProgressions)!;
    const seen = new Set<string>();
    for (const _ of times(200)) {
      void _;
      seen.add(generate(level, null, undefined, 60).correctIds.join('-'));
    }
    // Drawn from a fixed set, so there should be a handful, not hundreds.
    expect(seen.size).toBeGreaterThan(2);
    expect(seen.size).toBeLessThanOrEqual(REAL_PROGRESSIONS.length);
  });
});
