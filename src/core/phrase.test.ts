import { describe, expect, it } from 'vitest';
import { PhraseGrader } from './phrase';

const FRAME = 16; // one animation frame, roughly

/** Feed a steady pitch for a duration. `null` feeds silence. */
function hold(g: PhraseGrader, midi: number | null, ms: number) {
  for (let t = 0; t < ms; t += FRAME) g.feed(midi, FRAME);
}

describe('PhraseGrader', () => {
  it('commits one slot per sustained note', () => {
    const g = new PhraseGrader([60, 62]);
    hold(g, 60, 400);
    expect(g.index).toBe(1);
    expect(g.slots[0].state).toBe('hit');
    // Still holding the same note must not fill the second slot.
    hold(g, 60, 2000);
    expect(g.index).toBe(1);
    expect(g.slots[1].state).toBe('pending');
  });

  it('advances on a move to a new pitch, with no silence between', () => {
    const g = new PhraseGrader([60, 62, 64]);
    hold(g, 60, 400);
    hold(g, 62, 400);
    hold(g, 64, 400);
    expect(g.done).toBe(true);
    expect(g.slots.map((s) => s.state)).toEqual(['hit', 'hit', 'hit']);
  });

  it('advances after silence, so a repeated note can be sung twice', () => {
    const g = new PhraseGrader([60, 60]);
    hold(g, 60, 400);
    hold(g, null, 200);
    hold(g, 60, 400);
    expect(g.done).toBe(true);
    expect(g.slots.map((s) => s.state)).toEqual(['hit', 'hit']);
  });

  it('does not commit a note that was only passed through', () => {
    const g = new PhraseGrader([60, 67]);
    // A quick slide up through the scale, nothing held long enough to count.
    for (const m of [60, 61, 62, 63, 64, 65, 66]) hold(g, m, 48);
    expect(g.index).toBe(0);
    // Landing on the destination and holding it commits exactly one slot.
    hold(g, 67, 400);
    expect(g.index).toBe(1);
  });

  it('separates a legato half step, which is narrower than vibrato', () => {
    // E to F with no gap. A fixed tolerance band wide enough for vibrato
    // would swallow this whole and never advance.
    const g = new PhraseGrader([64, 65]);
    hold(g, 64, 400);
    hold(g, 65, 400);
    expect(g.slots.map((s) => s.state)).toEqual(['hit', 'hit']);
  });

  it('does not split a note on wide vibrato', () => {
    const g = new PhraseGrader([60, 62]);
    // ±70 cents, wider than the new-note threshold — but it keeps coming
    // back, so it must never read as a move to a new note.
    for (let t = 0; t < 700; t += FRAME) g.feed(60 + Math.sin(t / 25) * 0.7, FRAME);
    expect(g.index).toBe(1);
    expect(g.slots[0].state).toBe('hit');
  });

  it('ignores a scoop into the note when grading it', () => {
    const g = new PhraseGrader([60], { toleranceCents: 30 });
    // Sliding up from well flat, then sitting on the note. A mean would be
    // dragged flat by the approach; the median should not be.
    for (const m of [58.5, 59, 59.5]) hold(g, m, 32);
    hold(g, 60, 500);
    expect(g.slots[0].state).toBe('hit');
  });

  it('grades on pitch class, so any octave counts', () => {
    const g = new PhraseGrader([60, 64]);
    hold(g, 48, 400); // C an octave down
    hold(g, 76, 400); // E an octave up
    expect(g.slots.map((s) => s.state)).toEqual(['hit', 'hit']);
  });

  it('marks a wrong note as a miss and moves on rather than trapping you', () => {
    const g = new PhraseGrader([60, 62]);
    hold(g, 63, 400); // a semitone and a half off the first target
    expect(g.index).toBe(1);
    expect(g.slots[0].state).toBe('miss');
    hold(g, 62, 400);
    expect(g.slots[1].state).toBe('hit');
    expect(g.hits).toBe(1);
  });

  it('accepts a note inside the tolerance and rejects one outside it', () => {
    const near = new PhraseGrader([60], { toleranceCents: 55 });
    hold(near, 60.4, 400); // 40 cents sharp
    expect(near.slots[0].state).toBe('hit');

    const far = new PhraseGrader([60], { toleranceCents: 55 });
    hold(far, 60.8, 400); // 80 cents sharp
    expect(far.slots[0].state).toBe('miss');
  });

  it('tolerates wobble inside a held note without splitting it', () => {
    const g = new PhraseGrader([60, 62]);
    // Vibrato around C, well inside the stability band.
    for (let t = 0; t < 500; t += FRAME) g.feed(60 + Math.sin(t / 40) * 0.4, FRAME);
    expect(g.index).toBe(1);
    expect(g.slots[0].state).toBe('hit');
  });

  it('records what was actually sung, and by how much it missed', () => {
    const g = new PhraseGrader([60]);
    hold(g, 61, 400);
    expect(g.slots[0].sung).toBeCloseTo(61, 1);
    expect(g.slots[0].cents).toBeCloseTo(100, 0);
  });

  it('reports progress toward the current note and stops at done', () => {
    const g = new PhraseGrader([60], { holdMs: 300 });
    expect(g.progress).toBe(0);
    hold(g, 60, 150);
    expect(g.progress).toBeGreaterThan(0.4);
    expect(g.progress).toBeLessThan(0.7);
    hold(g, 60, 200);
    expect(g.done).toBe(true);
    expect(g.progress).toBe(0);
  });

  it('exposes the pitch being held, for the live readout', () => {
    const g = new PhraseGrader([60, 67]);
    expect(g.holding).toBeNull();
    hold(g, 67.2, 100);
    expect(g.holding).toBeCloseTo(67.2, 1);
  });

  it('counts anything unsung as a miss when it times out', () => {
    const g = new PhraseGrader([60, 62, 64]);
    hold(g, 60, 400);
    g.timeOut();
    expect(g.done).toBe(true);
    expect(g.slots.map((s) => s.state)).toEqual(['hit', 'miss', 'miss']);
    expect(g.hits).toBe(1);
  });

  it('ignores anything fed after the phrase is finished', () => {
    const g = new PhraseGrader([60]);
    hold(g, 60, 400);
    const before = JSON.stringify(g.slots);
    hold(g, 71, 900);
    expect(JSON.stringify(g.slots)).toBe(before);
    expect(g.index).toBe(1);
  });

  it('handles a phrase sung entirely legato through several notes', () => {
    const g = new PhraseGrader([60, 62, 64, 65, 67]);
    for (const m of [60, 62, 64, 65, 67]) hold(g, m, 320);
    expect(g.done).toBe(true);
    expect(g.hits).toBe(5);
  });
});
