import { describe, expect, it } from 'vitest';
import {
  NOTE_VALUES,
  beamGroups,
  blendOffset,
  buildPattern,
  gradeRhythm,
  offsetNote,
  soundingNotes,
  type NoteValue,
  type RhythmPattern,
} from './rhythm';

const MS = 500; // 120bpm
const times = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Four quarter notes in one bar. */
const FOUR: RhythmPattern = {
  beatsPerBar: 4,
  bars: 1,
  events: times(4).map((i) => ({ start: i, duration: 1, rest: false })),
};

/** Quarter, rest, quarter, quarter. */
const WITH_REST: RhythmPattern = {
  beatsPerBar: 4,
  bars: 1,
  events: [
    { start: 0, duration: 1, rest: false },
    { start: 1, duration: 1, rest: true },
    { start: 2, duration: 1, rest: false },
    { start: 3, duration: 1, rest: false },
  ],
};

const perfect = (p: RhythmPattern) => soundingNotes(p).map((n) => n.start * MS);

describe('gradeRhythm', () => {
  it('gives full marks for a perfect attempt', () => {
    const g = gradeRhythm(perfect(FOUR), FOUR, MS, 110);
    expect(g.accuracy).toBe(1);
    expect(g.notes.every((n) => n.state === 'hit')).toBe(true);
    expect(g.extraTaps).toBe(0);
  });

  it('ignores rests — you tap the notes, not the bar', () => {
    const g = gradeRhythm(perfect(WITH_REST), WITH_REST, MS, 110);
    expect(g.notes).toHaveLength(3);
    expect(g.accuracy).toBe(1);
  });

  it('cancels a constant lag rather than failing someone for their device', () => {
    // Everything 180ms late — well outside the tolerance, perfectly even.
    const late = perfect(FOUR).map((t) => t + 180);
    const g = gradeRhythm(late, FOUR, MS, 110);
    expect(g.accuracy).toBe(1);
    expect(g.offsetMs).toBe(180);
  });

  it('cancels a constant lead too', () => {
    const early = perfect(FOUR).map((t) => t - 150);
    const g = gradeRhythm(early, FOUR, MS, 110);
    expect(g.accuracy).toBe(1);
    expect(g.offsetMs).toBe(-150);
  });

  it('still catches uneven timing once the lag is removed', () => {
    // Constant 120ms lag, but the third note is another 200ms adrift.
    const taps = perfect(FOUR).map((t, i) => t + 120 + (i === 2 ? 200 : 0));
    const g = gradeRhythm(taps, FOUR, MS, 110);
    expect(g.notes[2].state).toBe('late');
    expect(g.notes.filter((n) => n.state === 'hit')).toHaveLength(3);
  });

  it('says which way a bad note went', () => {
    const taps = perfect(FOUR);
    taps[1] -= 260;
    const early = gradeRhythm(taps, FOUR, MS, 110);
    expect(early.notes[1].state).toBe('early');

    const taps2 = perfect(FOUR);
    taps2[3] += 260;
    const late = gradeRhythm(taps2, FOUR, MS, 110);
    expect(late.notes[3].state).toBe('late');
  });

  it('marks a note missed when nothing lands near it', () => {
    const taps = perfect(FOUR).filter((_, i) => i !== 2);
    const g = gradeRhythm(taps, FOUR, MS, 110);
    expect(g.notes[2].state).toBe('missed');
    expect(g.notes[2].deltaMs).toBeNull();
    expect(g.accuracy).toBeCloseTo(0.75, 5);
  });

  it('counts taps that matched nothing', () => {
    const g = gradeRhythm([...perfect(FOUR), 1900], FOUR, MS, 110);
    expect(g.extraTaps).toBe(1);
  });

  it('counts a double tap on one note as an extra rather than two hits', () => {
    const taps = [...perfect(FOUR), 20]; // a flam on the first note
    const g = gradeRhythm(taps, FOUR, MS, 110);
    expect(g.extraTaps).toBe(1);
    expect(g.notes.filter((n) => n.state === 'hit')).toHaveLength(4);
  });

  it('never pairs one tap with two notes', () => {
    const g = gradeRhythm([0], FOUR, MS, 110);
    expect(g.notes.filter((n) => n.deltaMs !== null)).toHaveLength(1);
  });

  it('settles the closest pairs first, so a stray tap cannot steal a note', () => {
    // A tap at 750 sits between note 1 (500) and note 2 (1000), and there is
    // also an exact tap on note 2. The exact one must win note 2, leaving the
    // stray to note 1 — where it reads as late, since 750 is past 500.
    const g = gradeRhythm([0, 750, 1000, 1500], FOUR, MS, 110);
    expect(g.notes[2].deltaMs).toBe(0);
    expect(g.notes[2].state).toBe('hit');
    expect(g.notes[1].deltaMs).toBe(250);
    expect(g.notes[1].state).toBe('late');
  });

  it('handles no taps at all without dividing by zero', () => {
    const g = gradeRhythm([], FOUR, MS, 110);
    expect(g.accuracy).toBe(0);
    expect(g.offsetMs).toBeNull();
    expect(g.notes.every((n) => n.state === 'missed')).toBe(true);
  });

  it('does not claim an offset from a single tap', () => {
    // One data point is not a measurement of a constant lag.
    const g = gradeRhythm([180], FOUR, MS, 110);
    expect(g.offsetMs).toBeNull();
    expect(g.measuredOffsetMs).toBeNull();
  });

  it('uses a lag learned earlier when the pattern is too short to measure one', () => {
    const ONE: RhythmPattern = {
      beatsPerBar: 4,
      bars: 1,
      events: [
        { start: 0, duration: 2, rest: false },
        { start: 2, duration: 2, rest: true },
      ],
    };
    // A single note tapped 200ms late. On its own that fails; with the lag
    // already known from earlier rounds it is exactly on time.
    expect(gradeRhythm([200], ONE, MS, 110).notes[0].state).toBe('late');
    expect(gradeRhythm([200], ONE, MS, 110, 200).notes[0].state).toBe('hit');
  });

  it('prefers what this attempt measured over what was learned before', () => {
    const late = perfect(FOUR).map((t) => t + 180);
    const g = gradeRhythm(late, FOUR, MS, 110, -300);
    expect(g.offsetMs).toBe(180);
    expect(g.accuracy).toBe(1);
  });

  it('only offers an offset worth learning from when enough notes matched', () => {
    // Two matched notes is enough to correct this attempt, but not enough to
    // update a running estimate of the device's lag.
    const two = [0 + 90, 500 + 90];
    const g = gradeRhythm(two, FOUR, MS, 110);
    expect(g.offsetMs).toBe(90);
    expect(g.measuredOffsetMs).toBeNull();

    const three = [0 + 90, 500 + 90, 1000 + 90];
    expect(gradeRhythm(three, FOUR, MS, 110).measuredOffsetMs).toBe(90);
  });

  it('grades tighter tolerances more strictly', () => {
    const taps = perfect(FOUR).map((t, i) => t + (i === 1 ? 90 : 0));
    expect(gradeRhythm(taps, FOUR, MS, 110).notes[1].state).toBe('hit');
    expect(gradeRhythm(taps, FOUR, MS, 60).notes[1].state).toBe('late');
  });
});

describe('blendOffset', () => {
  it('takes the first measurement as-is', () => {
    expect(blendOffset(null, 120)).toBe(120);
  });

  it('keeps what it had when there is nothing new', () => {
    expect(blendOffset(120, null)).toBe(120);
    expect(blendOffset(null, null)).toBeNull();
  });

  it('nudges rather than replaces, so one rushed round cannot redefine it', () => {
    const next = blendOffset(100, 200);
    expect(next).toBeGreaterThan(100);
    expect(next).toBeLessThan(160);
  });

  it('converges when the same lag keeps showing up', () => {
    let offset: number | null = null;
    for (let i = 0; i < 12; i++) offset = blendOffset(offset, 150);
    expect(offset).toBeCloseTo(150, 0);
  });

  it('clamps a wild attempt — no output chain is a second behind', () => {
    expect(blendOffset(null, 5000)).toBe(400);
    expect(blendOffset(null, -5000)).toBe(-400);
  });
});

describe('offsetNote', () => {
  it('says nothing about an offset too small to be real', () => {
    expect(offsetNote(null)).toBeNull();
    expect(offsetNote(20)).toBeNull();
    expect(offsetNote(-30)).toBeNull();
  });

  it('reports a real one, without claiming to know the cause', () => {
    expect(offsetNote(120)).toContain('120ms behind');
    expect(offsetNote(-90)).toContain('90ms ahead of');
    expect(offsetNote(120)).toMatch(/device|leaning/);
  });
});

describe('buildPattern', () => {
  const fill = (values: NoteValue[], bars = 1, rest = 0) =>
    buildPattern(values, bars, 4, rest);

  it('fills every bar exactly, never over or under', () => {
    for (const values of [
      ['quarter'],
      ['quarter', 'half'],
      ['quarter', 'eighth'],
      ['quarter', 'half', 'whole'],
      ['quarter', 'eighth', 'sixteenth'],
    ] as NoteValue[][]) {
      for (const _ of times(60)) {
        const p = fill(values, 2);
        const total = p.events.reduce((sum, e) => sum + e.duration, 0);
        expect(total).toBe(8);
      }
    }
  });

  it('lays events end to end with no gaps or overlaps', () => {
    for (const _ of times(60)) {
      const p = fill(['quarter', 'eighth', 'half'], 2);
      let at = 0;
      for (const e of p.events) {
        expect(e.start).toBeCloseTo(at, 6);
        at += e.duration;
      }
    }
  });

  it('only ever uses the note values it was given', () => {
    const allowed = [NOTE_VALUES.quarter, NOTE_VALUES.eighth];
    for (const _ of times(60)) {
      for (const e of fill(['quarter', 'eighth']).events) {
        expect(allowed).toContain(e.duration);
      }
    }
  });

  it('never starts a note of a beat or longer off the beat', () => {
    // That is syncopation, which belongs to a much later level and is far
    // harder to read than the levels mixing halves with eighths intend.
    for (const _ of times(200)) {
      for (const e of fill(['quarter', 'half', 'whole', 'eighth', 'sixteenth'], 2).events) {
        if (e.duration >= 1) expect(Number.isInteger(e.start)).toBe(true);
      }
    }
  });

  it('never runs an off-beat note past the next beat line', () => {
    // Real notation writes that as two tied notes, and nothing here draws
    // ties — so such a bar could not be played from as written.
    for (const _ of times(200)) {
      for (const e of fill(['quarter', 'half', 'eighth', 'sixteenth'], 2).events) {
        if (Number.isInteger(e.start)) continue;
        const nextBeat = Math.floor(e.start) + 1;
        expect(e.start + e.duration).toBeLessThanOrEqual(nextBeat + 1e-9);
      }
    }
  });

  it('still lets sub-beat notes start anywhere in the beat', () => {
    const offBeat = times(200).some(() =>
      fill(['quarter', 'eighth'], 2).events.some((e) => !Number.isInteger(e.start)),
    );
    expect(offBeat).toBe(true);
  });

  it('always sounds the first beat of a bar', () => {
    for (const _ of times(80)) {
      const p = fill(['quarter', 'eighth'], 1, 0.9);
      expect(p.events[0].rest).toBe(false);
    }
  });

  it('always leaves at least two notes to tap, even at a punishing rest rate', () => {
    // One note is not a rhythm, and it gives the grader nothing to measure a
    // constant lag against — which would fail a perfect attempt on a laggy
    // device.
    for (const _ of times(80)) {
      expect(soundingNotes(fill(['quarter', 'eighth'], 1, 1)).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('splits a bar that would otherwise be one long note', () => {
    // A whole note fills 4/4 by itself, so there is no rest to sound instead.
    for (const _ of times(40)) {
      const p = buildPattern(['whole'], 1, 4, 0);
      expect(soundingNotes(p).length).toBeGreaterThanOrEqual(2);
      expect(p.events.reduce((sum, e) => sum + e.duration, 0)).toBe(4);
      let at = 0;
      for (const e of p.events) {
        expect(e.start).toBeCloseTo(at, 6);
        at += e.duration;
      }
    }
  });

  it('places no rests when asked for none', () => {
    for (const _ of times(40)) {
      expect(fill(['quarter', 'eighth'], 2, 0).events.some((e) => e.rest)).toBe(false);
    }
  });

  it('is deterministic given a fixed random source', () => {
    const fixed = () => 0.5;
    expect(buildPattern(['quarter', 'eighth'], 2, 4, 0, fixed)).toEqual(
      buildPattern(['quarter', 'eighth'], 2, 4, 0, fixed),
    );
  });
});

describe('beamGroups', () => {
  const pattern = (events: [number, number, boolean][]): RhythmPattern => ({
    beatsPerBar: 4,
    bars: 1,
    events: events.map(([start, duration, rest]) => ({ start, duration, rest })),
  });

  it('beams two eighths inside one beat', () => {
    const p = pattern([
      [0, 0.5, false],
      [0.5, 0.5, false],
      [1, 1, false],
      [2, 2, false],
    ]);
    expect(beamGroups(p)).toEqual([[0, 1]]);
  });

  it('never beams across a beat boundary', () => {
    const p = pattern([
      [0, 0.5, false],
      [0.5, 0.5, false],
      [1, 0.5, false],
      [1.5, 0.5, false],
      [2, 2, false],
    ]);
    expect(beamGroups(p)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('does not beam a lone eighth', () => {
    const p = pattern([
      [0, 0.5, false],
      [0.5, 0.5, true],
      [1, 1, false],
      [2, 2, false],
    ]);
    expect(beamGroups(p)).toEqual([]);
  });

  it('breaks a beam at a rest', () => {
    const p = pattern([
      [0, 0.25, false],
      [0.25, 0.25, true],
      [0.5, 0.25, false],
      [0.75, 0.25, false],
      [1, 1, false],
      [2, 2, false],
    ]);
    expect(beamGroups(p)).toEqual([[2, 3]]);
  });

  it('never beams quarter notes or longer', () => {
    const p = pattern([
      [0, 1, false],
      [1, 1, false],
      [2, 2, false],
    ]);
    expect(beamGroups(p)).toEqual([]);
  });

  it('beams four sixteenths within a beat', () => {
    const p = pattern([
      [0, 0.25, false],
      [0.25, 0.25, false],
      [0.5, 0.25, false],
      [0.75, 0.25, false],
      [1, 3, false],
    ]);
    expect(beamGroups(p)).toEqual([[0, 1, 2, 3]]);
  });
});
