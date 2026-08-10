import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  retentionLabel,
  retrievability,
  review,
  speedFactor,
  urgency,
  type Memory,
} from './retention';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const at = (days: number) => T0 + days * DAY;

const memory = (partial: Partial<Memory> = {}): Memory => ({
  lastAt: T0,
  stability: 5,
  difficulty: 5,
  reviews: 3,
  ...partial,
});

describe('retrievability', () => {
  it('is 1 the moment it was practised', () => {
    expect(retrievability(memory(), T0)).toBeCloseTo(1, 6);
  });

  it('is exactly 90% after one stability interval — that is what stability means', () => {
    expect(retrievability(memory({ stability: 5 }), at(5))).toBeCloseTo(0.9, 3);
    expect(retrievability(memory({ stability: 20 }), at(20))).toBeCloseTo(0.9, 3);
  });

  it('never rises again as time passes', () => {
    let previous = 1.1;
    for (let d = 0; d <= 200; d += 5) {
      const r = retrievability(memory({ stability: 10 }), at(d));
      expect(r).toBeLessThanOrEqual(previous);
      previous = r;
    }
  });

  it('keeps a long tail rather than collapsing to nothing', () => {
    // The whole reason for a power curve over an exponential.
    const r = retrievability(memory({ stability: 10 }), at(365));
    expect(r).toBeGreaterThan(0.1);
    expect(r).toBeLessThan(0.35);
  });

  it('decays more slowly the more stable it is', () => {
    const weak = retrievability(memory({ stability: 2 }), at(30));
    const strong = retrievability(memory({ stability: 60 }), at(30));
    expect(strong).toBeGreaterThan(weak);
  });

  it('treats never-practised as gone, since both mean the same for practice', () => {
    expect(retrievability(null)).toBe(0);
    expect(retrievability(undefined)).toBe(0);
  });

  it('does not exceed 1 if the clock goes backwards', () => {
    expect(retrievability(memory(), T0 - 5 * DAY)).toBeLessThanOrEqual(1);
  });
});

describe('daysUntil', () => {
  it('is the stability interval for a fresh review at 90%', () => {
    expect(daysUntil(memory({ stability: 12 }), 0.9, T0)).toBeCloseTo(12, 1);
  });

  it('counts down as time passes, and goes negative once overdue', () => {
    const m = memory({ stability: 10 });
    expect(daysUntil(m, 0.9, at(4))).toBeCloseTo(6, 1);
    expect(daysUntil(m, 0.9, at(15))).toBeLessThan(0);
  });

  it('gives a longer wait for a lower target', () => {
    const m = memory({ stability: 10 });
    expect(daysUntil(m, 0.7, T0)).toBeGreaterThan(daysUntil(m, 0.9, T0));
  });
});

describe('review', () => {
  it('creates a memory from a first success', () => {
    const m = review(null, 1, { correct: true, responseMs: 2000, parMs: 4000 }, T0);
    expect(m.reviews).toBe(1);
    expect(m.lastAt).toBe(T0);
    expect(m.stability).toBeGreaterThan(1);
  });

  it('gives a first failure much less stability than a first success', () => {
    const win = review(null, 1, { correct: true }, T0);
    const loss = review(null, 0.2, { correct: false }, T0);
    expect(loss.stability).toBeLessThan(win.stability);
    expect(loss.difficulty).toBeGreaterThan(win.difficulty);
  });

  it('grows stability on every success', () => {
    let m = review(null, 1, { correct: true }, T0);
    let previous = m.stability;
    for (let i = 1; i <= 6; i++) {
      m = review(m, 1, { correct: true }, at(i * 10));
      expect(m.stability).toBeGreaterThan(previous);
      previous = m.stability;
    }
  });

  it('rewards recalling something nearly lost far more than something fresh', () => {
    // The spacing effect, which is the whole reason to schedule at all.
    const base = memory({ stability: 10 });
    const crammed = review(base, 1, { correct: true }, at(0.5));
    const spaced = review(base, 1, { correct: true }, at(25));
    expect(spaced.stability).toBeGreaterThan(crammed.stability * 1.3);
  });

  it('cuts stability on a failure without wiping it out', () => {
    const m = memory({ stability: 30 });
    const after = review(m, 0.3, { correct: false }, at(10));
    expect(after.stability).toBeLessThan(30);
    // Relearning is faster than learning; a lapse is not a reset to zero.
    expect(after.stability).toBeGreaterThan(1);
  });

  it('never lets stability fall below the floor or run past the ceiling', () => {
    let m: Memory | null = null;
    for (let i = 0; i < 40; i++) m = review(m, 0, { correct: false }, at(i));
    expect(m!.stability).toBeGreaterThanOrEqual(0.2);

    let up: Memory | null = null;
    for (let i = 0; i < 60; i++) up = review(up, 1, { correct: true }, at(i * 200));
    expect(up!.stability).toBeLessThanOrEqual(365);
  });

  it('keeps difficulty inside its bounds however lopsided the history', () => {
    let easy: Memory | null = null;
    for (let i = 0; i < 40; i++) easy = review(easy, 1, { correct: true, responseMs: 500 }, at(i * 5));
    expect(easy!.difficulty).toBeGreaterThanOrEqual(1);

    let hard: Memory | null = null;
    for (let i = 0; i < 40; i++) hard = review(hard, 0, { correct: false }, at(i));
    expect(hard!.difficulty).toBeLessThanOrEqual(10);
  });

  it('grows a fluent answer faster than a laboured one', () => {
    const base = memory({ stability: 10 });
    const quick = review(base, 1, { correct: true, responseMs: 1000, parMs: 4000 }, at(12));
    const slow = review(base, 1, { correct: true, responseMs: 9000, parMs: 4000 }, at(12));
    expect(quick.stability).toBeGreaterThan(slow.stability);
  });

  it('grows an easy item faster than one it has found hard', () => {
    const easy = review(memory({ stability: 10, difficulty: 2 }), 1, { correct: true }, at(12));
    const hard = review(memory({ stability: 10, difficulty: 9 }), 1, { correct: true }, at(12));
    expect(easy.stability).toBeGreaterThan(hard.stability);
  });

  it('treats a scraped pass as a pass, and a bad round as a failure', () => {
    const base = memory({ stability: 10 });
    expect(review(base, 0.8, { correct: true }, at(12)).stability).toBeGreaterThan(10);
    expect(review(base, 0.5, { correct: false }, at(12)).stability).toBeLessThan(10);
  });

  it('always stamps the time it was reviewed', () => {
    expect(review(memory(), 1, { correct: true }, at(9)).lastAt).toBe(at(9));
  });
});

describe('speedFactor', () => {
  it('is neutral when nothing was measured, rather than guessing', () => {
    expect(speedFactor(null)).toBe(0.5);
    expect(speedFactor(undefined)).toBe(0.5);
    expect(speedFactor(0)).toBe(0.5);
  });

  it('is full marks at half par and nothing at double par', () => {
    expect(speedFactor(2000, 4000)).toBe(1);
    expect(speedFactor(500, 4000)).toBe(1);
    expect(speedFactor(8000, 4000)).toBe(0);
    expect(speedFactor(20000, 4000)).toBe(0);
  });

  it('falls off smoothly between them', () => {
    const mid = speedFactor(4000, 4000);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(0.8);
    expect(speedFactor(3000, 4000)).toBeGreaterThan(speedFactor(6000, 4000));
  });

  it('is measured against par, so a slow drill is not punished for being slow', () => {
    // Six seconds is fluent for a four-chord progression and laboured for a
    // single note; the same figure must mean different things.
    expect(speedFactor(6000, 12000)).toBe(1);
    expect(speedFactor(6000, 3000)).toBe(0);
  });
});

describe('urgency', () => {
  it('peaks where recall is shaky rather than where it is gone', () => {
    const shaky = memory({ stability: 10 });
    const fresh = urgency(shaky, at(0));
    const wobbling = urgency(shaky, at(28));
    const lapsed = urgency(shaky, at(3000));
    expect(wobbling).toBeGreaterThan(fresh);
    expect(wobbling).toBeGreaterThan(lapsed);
  });

  it('gives something untouched a middling score, not a top one', () => {
    // New material matters, but not more than something about to be lost.
    expect(urgency(null)).toBe(0.5);
  });

  it('stays inside 0 and 1', () => {
    for (const d of [0, 1, 10, 100, 5000]) {
      const u = urgency(memory({ stability: 3 }), at(d));
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
    }
  });
});

describe('retentionLabel', () => {
  it('says it in words rather than a bare percentage', () => {
    expect(retentionLabel(1)).toBe('fresh');
    expect(retentionLabel(0.75)).toBe('holding');
    expect(retentionLabel(0.5)).toBe('fading');
    expect(retentionLabel(0.2)).toBe('nearly gone');
    expect(retentionLabel(0)).toBe('not started');
  });
});
