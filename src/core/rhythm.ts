/**
 * Rhythm — reading it, and tapping it back.
 *
 * The reading pillar could name notes on a stave and nothing else, which is
 * half of reading music at most. Pitch tells you *which* note; rhythm tells
 * you when, and a reader who can do one and not the other cannot read.
 *
 * The awkward part of grading taps is latency. Between the screen, the audio
 * output, the input stack and the person, there is a constant offset that has
 * nothing to do with musicianship, and it is large enough to fail someone who
 * played perfectly. The usual answer is a calibration wizard before you are
 * allowed to start.
 *
 * This grades on **relative** timing instead: the median offset across the
 * whole attempt is measured and subtracted before anything is judged, so a
 * constant lag cancels itself out and there is nothing to calibrate. The
 * offset is not thrown away though — it is reported back, because "you were
 * consistently 60ms behind the beat" is worth knowing, and because a person
 * who drifts steadily late is doing something real that the correction would
 * otherwise hide.
 */

/** A note or rest in a bar. Positions and durations are in beats. */
export type RhythmEvent = { start: number; duration: number; rest: boolean };

export type RhythmPattern = {
  /** Beats per bar. 4/4 throughout for now. */
  beatsPerBar: number;
  bars: number;
  events: RhythmEvent[];
};

export type NoteState = 'hit' | 'early' | 'late' | 'missed';

export type NoteResult = {
  /** Index into the pattern's sounding notes. */
  index: number;
  /** Where it should have landed, in ms from the start of the bar. */
  expectedMs: number;
  /** How far off it was after the constant offset was removed. */
  deltaMs: number | null;
  state: NoteState;
};

export type RhythmGrade = {
  notes: NoteResult[];
  /** Taps that matched nothing. Flams and panic count against you. */
  extraTaps: number;
  /**
   * The constant lag that was subtracted, in ms. Positive means late. May
   * have come from an earlier attempt when this one was too short to measure.
   */
  offsetMs: number | null;
  /** What *this* attempt measured, if it had enough notes to mean anything. */
  measuredOffsetMs: number | null;
  /** Share of notes hit, 0-1. */
  accuracy: number;
};

/** Everything must land inside this to be worth matching at all. */
const MATCH_WINDOW_BEATS = 0.6;

export function soundingNotes(pattern: RhythmPattern): RhythmEvent[] {
  return pattern.events.filter((e) => !e.rest);
}

function countSounding(events: RhythmEvent[]): number {
  return events.filter((e) => !e.rest).length;
}

export function patternDurationMs(pattern: RhythmPattern, msPerBeat: number): number {
  return pattern.beatsPerBar * pattern.bars * msPerBeat;
}

/**
 * Grade an attempt.
 *
 * `taps` are ms from the start of the bar, in the order they happened.
 * `toleranceMs` is how far a note may sit from the beat and still count.
 */
export function gradeRhythm(
  taps: number[],
  pattern: RhythmPattern,
  msPerBeat: number,
  toleranceMs: number,
  /**
   * A lag already learned from earlier attempts. A short pattern cannot
   * measure one from itself — with a single note there is nothing to compare
   * against — and the lag belongs to the device and the person, not to this
   * bar, so carrying it forward is both fair and more accurate.
   */
  priorOffsetMs: number | null = null,
): RhythmGrade {
  const notes = soundingNotes(pattern);
  const expected = notes.map((n) => n.start * msPerBeat);
  const window = MATCH_WINDOW_BEATS * msPerBeat;

  // First pass: match with no correction, purely to estimate the offset.
  const rough = match(taps, expected, window);
  const deltas = rough.filter((d): d is number => d !== null);
  const offset = deltas.length >= 2 ? median(deltas) : priorOffsetMs;

  // Second pass: match against the corrected grid. Doing this again rather
  // than just subtracting matters — a large lag can push a tap nearer the
  // *following* note, so the first pass can pair things up wrongly.
  const corrected = offset === null ? expected : expected.map((e) => e + offset);
  const final = match(taps, corrected, window);

  const results: NoteResult[] = notes.map((_, i) => {
    const delta = final[i];
    if (delta === null) {
      return { index: i, expectedMs: expected[i], deltaMs: null, state: 'missed' };
    }
    const state: NoteState =
      Math.abs(delta) <= toleranceMs ? 'hit' : delta < 0 ? 'early' : 'late';
    return { index: i, expectedMs: expected[i], deltaMs: delta, state };
  });

  const matched = final.filter((d) => d !== null).length;
  const hits = results.filter((r) => r.state === 'hit').length;

  return {
    notes: results,
    extraTaps: Math.max(0, taps.length - matched),
    offsetMs: offset === null ? null : Math.round(offset),
    // Only an offset this attempt actually measured is worth learning from.
    measuredOffsetMs: deltas.length >= 3 ? Math.round(median(deltas)) : null,
    accuracy: notes.length === 0 ? 1 : hits / notes.length,
  };
}

/**
 * Fold a newly measured lag into the running estimate.
 *
 * Weighted rather than replaced: one attempt where the person rushed should
 * nudge the estimate, not redefine it. Clamped, because a value beyond this
 * is a wild attempt rather than a device — no real output chain is a second
 * behind.
 */
export function blendOffset(stored: number | null, measured: number | null): number | null {
  if (measured === null) return stored;
  const clamped = Math.max(-400, Math.min(400, measured));
  if (stored === null) return clamped;
  return Math.round(stored * 0.7 + clamped * 0.3);
}

/**
 * Pair each expected onset with at most one tap, and each tap with at most
 * one onset. Closest pairs are settled first, so one wild tap near a
 * boundary cannot steal a note that another tap fits better.
 */
function match(taps: number[], expected: number[], window: number): (number | null)[] {
  type Pair = { note: number; tap: number; delta: number };
  const pairs: Pair[] = [];

  expected.forEach((e, note) => {
    taps.forEach((t, tap) => {
      const delta = t - e;
      if (Math.abs(delta) <= window) pairs.push({ note, tap, delta });
    });
  });

  pairs.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

  const out: (number | null)[] = expected.map(() => null);
  const usedTaps = new Set<number>();
  const usedNotes = new Set<number>();

  for (const pair of pairs) {
    if (usedTaps.has(pair.tap) || usedNotes.has(pair.note)) continue;
    usedTaps.add(pair.tap);
    usedNotes.add(pair.note);
    out[pair.note] = pair.delta;
  }
  return out;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * What the offset is worth saying out loud, if anything.
 *
 * Below a threshold it is noise and mentioning it would be false precision.
 * Above it, it is either a device with lag or a person who leans — the app
 * cannot tell which, so it says so rather than guessing.
 */
export function offsetNote(offsetMs: number | null): string | null {
  if (offsetMs === null || Math.abs(offsetMs) < 45) return null;
  const dir = offsetMs > 0 ? 'behind' : 'ahead of';
  return `Everything sat about ${Math.abs(offsetMs)}ms ${dir} the beat — evenly, so it was graded on the spacing rather than that lag. It could be your device, or it could be you leaning.`;
}

// ---------------------------------------------------------------- generating

/** Note values in beats, with the names used in the lesson copy. */
export const NOTE_VALUES = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
} as const;

export type NoteValue = keyof typeof NOTE_VALUES;

/**
 * Fill bars with the given note values.
 *
 * Rests are placed rather than generated as a value, because a bar that is
 * mostly rests is not a rhythm, it is a waiting exercise. `restChance`
 * converts an already-chosen note, so the note values stay in charge of the
 * shape.
 */
export function buildPattern(
  values: NoteValue[],
  bars: number,
  beatsPerBar: number,
  restChance = 0,
  random: () => number = Math.random,
): RhythmPattern {
  const sizes = values.map((v) => NOTE_VALUES[v]).sort((a, b) => a - b);
  const events: RhythmEvent[] = [];

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * beatsPerBar;
    let filled = 0;

    while (filled < beatsPerBar) {
      const room = beatsPerBar - filled;
      // Two rules keep the notation honest, and both were producing bad bars
      // before they existed:
      //
      // A note of a beat or longer may only begin *on* a beat. Starting one
      // off the beat is syncopation, which belongs to a later level and is
      // much harder to read.
      //
      // A note that starts off the beat may not run past the next beat line.
      // Real notation writes that as two tied notes, and the app draws no
      // ties — so generating one would draw a bar that could not be played
      // from as written.
      const onBeat = Number.isInteger(filled);
      const toNextBeat = Math.floor(filled) + 1 - filled;
      const fits = sizes.filter(
        (s) => s <= room && (onBeat ? true : s < 1 && s <= toNextBeat),
      );
      // Sizes are sorted ascending and the smallest always fits a bar whose
      // length is a multiple of it, so `fits` is never empty in practice.
      const duration = fits[Math.floor(random() * fits.length)] ?? sizes[0];

      // The first beat of a bar always sounds. A bar that opens on a rest is
      // genuinely hard to place and is not what these levels are teaching.
      const rest = filled > 0 && random() < restChance;

      events.push({ start: barStart + filled, duration, rest });
      filled += duration;
    }
  }

  // One note is not a rhythm: there is no spacing to read, and nothing for
  // the grader to measure a lag against — which would then fail a perfectly
  // played bar on a laggy device. Sound a rest if there is one; otherwise the
  // bar is a single long note filling it, so halve that instead.
  for (let guard = 0; guard < 4 && countSounding(events) < 2; guard++) {
    const rest = events.find((e) => e.rest);
    if (rest) {
      rest.rest = false;
      continue;
    }

    let longest = 0;
    events.forEach((e, i) => {
      if (e.duration > events[longest].duration) longest = i;
    });
    const half = events[longest].duration / 2;
    events.splice(
      longest,
      1,
      { start: 0, duration: half, rest: false },
      { start: 0, duration: half, rest: false },
    );

    let at = 0;
    for (const e of events) {
      e.start = at;
      at += e.duration;
    }
  }

  return { beatsPerBar, bars, events };
}

/** Group events into beams: runs of sub-beat notes inside one beat. */
export function beamGroups(pattern: RhythmPattern): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  let currentBeat = -1;

  pattern.events.forEach((event, i) => {
    const beat = Math.floor(event.start);
    const beamable = event.duration < 1 && !event.rest;

    if (!beamable || beat !== currentBeat) {
      if (current.length > 1) groups.push(current);
      current = beamable ? [i] : [];
      currentBeat = beamable ? beat : -1;
      return;
    }
    current.push(i);
  });

  if (current.length > 1) groups.push(current);
  return groups;
}
