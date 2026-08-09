/**
 * Grading a sung phrase, note by note.
 *
 * Single sung notes were easy: wait for one steady pitch and compare it. A
 * phrase is harder, because the app has to work out *where one note ends and
 * the next begins* from a continuous pitch stream. People sing legato — there
 * is often no silence between notes at all — so silence cannot be the only
 * boundary.
 *
 * Two things end a note here: going quiet, or moving somewhere else. That
 * second rule is what makes legato singing work, and it is why a single long
 * held note fills exactly one slot rather than racing through the whole
 * phrase.
 *
 * Deliberately a pure state machine fed with (pitch, elapsed) so it can be
 * tested against synthetic streams. Getting this wrong by eye is very easy —
 * it looks like it works right up until someone sings two of the same note in
 * a row.
 */

import { centsFromNearestOctave } from '@/mic/pitch';

export type SlotState = 'pending' | 'hit' | 'miss';

export type PhraseSlot = {
  /** Absolute MIDI note wanted. Octave is ignored when grading. */
  target: number;
  state: SlotState;
  /** What was actually sung here, once committed. */
  sung: number | null;
  /** How far off, in cents from the nearest octave of the target. */
  cents: number | null;
};

export type PhraseOptions = {
  /** How far out of tune a note may be and still count. */
  toleranceCents?: number;
  /** How long a pitch must hold steady before it counts as a note. */
  holdMs?: number;
  /** How far from the current note counts as "somewhere else", in semitones. */
  newNoteSemitones?: number;
  /** ...and for how long, before that becomes a new note. */
  newNoteMs?: number;
  /** Silence this long ends the current note. */
  releaseMs?: number;
};

/**
 * A note boundary is *sustained* deviation, not instantaneous deviation.
 *
 * A fixed tolerance band cannot do this job: it has to be wide enough for
 * vibrato, and vibrato is wider than the semitone step it would then swallow —
 * so a legato E to F reads as one note and the phrase never advances. Time
 * separates them instead. Vibrato swings past the threshold and comes
 * straight back; a real step goes and stays.
 */
const DEFAULTS = {
  toleranceCents: 55,
  holdMs: 260,
  newNoteSemitones: 0.6,
  newNoteMs: 70,
  releaseMs: 90,
};

export class PhraseGrader {
  readonly slots: PhraseSlot[];
  private readonly opts: Required<PhraseOptions>;

  /** Index of the slot currently being listened for. */
  private cursor = 0;

  // The note being held right now.
  private center: number | null = null;
  private samples: number[] = [];
  private sum = 0;
  private stableMs = 0;
  private silentMs = 0;

  // A candidate departure from that note, not yet long enough to count.
  private awayMs = 0;
  private awaySamples: number[] = [];

  /**
   * Whether a new note may be committed. Cleared on every commit and set
   * again by a release — silence, or a move to a different pitch. Without it
   * one sustained note would satisfy the hold over and over and fill every
   * remaining slot in a few hundred milliseconds.
   */
  private armed = true;

  constructor(targets: number[], options: PhraseOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
    this.slots = targets.map((target) => ({ target, state: 'pending', sung: null, cents: null }));
  }

  get index(): number {
    return this.cursor;
  }

  get done(): boolean {
    return this.cursor >= this.slots.length;
  }

  get hits(): number {
    return this.slots.filter((s) => s.state === 'hit').length;
  }

  /** 0-1, how close the current note is to committing. For the progress bar. */
  get progress(): number {
    if (!this.armed || this.done) return 0;
    return Math.min(1, this.stableMs / this.opts.holdMs);
  }

  /** The pitch currently being held, or null. For the live readout. */
  get holding(): number | null {
    return this.center;
  }

  feed(midi: number | null, dtMs: number): void {
    if (this.done) return;

    if (midi === null) {
      this.silentMs += dtMs;
      if (this.silentMs >= this.opts.releaseMs) this.release();
      return;
    }

    this.silentMs = 0;

    if (this.center === null) {
      this.startNote([midi], dtMs);
      return;
    }

    if (Math.abs(midi - this.center) > this.opts.newNoteSemitones) {
      this.awayMs += dtMs;
      this.awaySamples.push(midi);
      // Gone, and stayed gone: that ends the previous note and begins a new
      // one with no silence required. This is the legato case.
      if (this.awayMs >= this.opts.newNoteMs) {
        this.armed = true;
        this.startNote(this.awaySamples, this.awayMs);
      }
      return;
    }

    // Back inside the band — that was vibrato, or a wobble, not a move.
    this.awayMs = 0;
    this.awaySamples = [];

    this.samples.push(midi);
    this.sum += midi;
    this.center = this.sum / this.samples.length;
    this.stableMs += dtMs;

    if (this.armed && this.stableMs >= this.opts.holdMs) this.commit();
  }

  private startNote(samples: number[], elapsedMs: number): void {
    this.samples = [...samples];
    this.sum = samples.reduce((a, b) => a + b, 0);
    this.center = this.sum / samples.length;
    this.stableMs = elapsedMs;
    this.awayMs = 0;
    this.awaySamples = [];
  }

  private release(): void {
    this.armed = true;
    this.center = null;
    this.samples = [];
    this.sum = 0;
    this.stableMs = 0;
    this.awayMs = 0;
    this.awaySamples = [];
  }

  private commit(): void {
    // The median, not the mean: a scoop into the note drags a mean sharp or
    // flat, and singers scoop.
    const sung = median(this.samples);
    const slot = this.slots[this.cursor];
    const cents = centsFromNearestOctave(sung, slot.target);

    slot.sung = sung;
    slot.cents = cents;
    slot.state = Math.abs(cents) <= this.opts.toleranceCents ? 'hit' : 'miss';

    this.cursor += 1;
    // Holding the same note on does not commit again; the singer has to
    // either stop or move.
    this.armed = false;
    this.stableMs = 0;
  }

  /**
   * Give up on the rest of the phrase. Anything still pending is a miss —
   * not singing a note is not the same as singing it right.
   */
  timeOut(): void {
    for (const slot of this.slots) {
      if (slot.state === 'pending') slot.state = 'miss';
    }
    this.cursor = this.slots.length;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
