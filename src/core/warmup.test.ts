import { describe, expect, it } from 'vitest';
import { buildWarmup, interleave, planBreakdown, warmupCourses, WARMUP_LENGTH } from './warmup';
import { getCourse } from './courses';
import type { LevelStats } from '@/store/useStore';

/** A deterministic stand-in for Math.random: cycles a fixed sequence. */
function seeded(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

/**
 * A generator that's random enough for distribution checks but repeatable.
 *
 * Sequential seeds in a plain LCG produce correlated streams, which skews any
 * test that loops over seeds 1..n — so the seed is scrambled and the first few
 * outputs discarded.
 */
function lcg(seed = 1): () => number {
  let s = (seed * 2654435761) >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  for (let i = 0; i < 8; i++) next();
  return next;
}

function stats(entries: Record<string, { right: number; wrong: number }>) {
  const out: Record<string, LevelStats> = {};
  for (const [key, { right, wrong }] of Object.entries(entries)) {
    out[key] = {
      recent: [...Array(right).fill(true), ...Array(wrong).fill(false)],
      correct: right,
      total: right + wrong,
    };
  }
  return out;
}

describe('warmupCourses', () => {
  it('offers only ready courses that have levels to draw from', () => {
    const ids = warmupCourses().map((c) => c.id);
    expect(ids).toContain('find-the-note');
    expect(ids).toContain('intervals');
    // Theory is ready but reads rather than drills, so it can't be a step.
    expect(ids).not.toContain('theory');
    // Planned courses have no levels.
    expect(ids).not.toContain('scroll-reading');
    for (const course of warmupCourses()) {
      expect(course.status).toBe('ready');
      expect(course.levels.length).toBeGreaterThan(0);
    }
  });
});

describe('buildWarmup', () => {
  const started = stats({
    'find-the-note:3': { right: 10, wrong: 2 },
    'intervals:2': { right: 8, wrong: 4 },
    'chord-quality:1': { right: 6, wrong: 0 },
  });
  const progress = { 'find-the-note': 3, intervals: 2, 'chord-quality': 1 };

  it('produces exactly the requested number of steps', () => {
    expect(buildWarmup(progress, started, lcg(7))).toHaveLength(WARMUP_LENGTH);
    expect(buildWarmup(progress, started, lcg(7), 4)).toHaveLength(4);
  });

  it('only draws from courses the user has started, once there are enough', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plan = buildWarmup(progress, started, lcg(seed));
      for (const step of plan) {
        expect(['find-the-note', 'intervals', 'chord-quality']).toContain(step.courseId);
      }
    }
  });

  it('falls back to every course when fewer than two have been touched', () => {
    const plan = buildWarmup(
      { 'find-the-note': 2 },
      stats({ 'find-the-note:2': { right: 5, wrong: 1 } }),
      lcg(3),
    );
    expect(new Set(plan.map((s) => s.courseId)).size).toBeGreaterThan(1);
  });

  it('never asks for a level the course does not have', () => {
    // Progress deliberately past the end, as a corrupt profile would be.
    const overrun = { 'find-the-note': 99, intervals: 99, 'chord-quality': 99 };
    for (let seed = 1; seed <= 20; seed++) {
      for (const step of buildWarmup(overrun, started, lcg(seed))) {
        const course = getCourse(step.courseId)!;
        expect(step.levelId).toBeGreaterThanOrEqual(1);
        expect(step.levelId).toBeLessThanOrEqual(course.levels.length);
      }
    }
  });

  it('never lets the same course land three times in a row', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const plan = buildWarmup(progress, started, lcg(seed));
      for (let i = 2; i < plan.length; i++) {
        const run = plan[i].courseId === plan[i - 1].courseId && plan[i].courseId === plan[i - 2].courseId;
        expect(run, `run of three at ${i} with seed ${seed}`).toBe(false);
      }
    }
  });

  it('keeps adjacent repeats down to at most one per warm-up', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const plan = buildWarmup(progress, started, lcg(seed));
      let adjacent = 0;
      for (let i = 1; i < plan.length; i++) {
        if (plan[i].courseId === plan[i - 1].courseId) adjacent++;
      }
      expect(adjacent, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  });

  it('never hands one course more than 60% of the questions', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const { count } of planBreakdown(buildWarmup(progress, started, lcg(seed)))) {
        expect(count).toBeLessThanOrEqual(Math.ceil(WARMUP_LENGTH * 0.6));
      }
    }
  });

  it('reaches back below the current level often enough to count as review', () => {
    // Everything at level 5, so any step below 5 is a deliberate review.
    const deep = { 'find-the-note': 5, intervals: 5, 'chord-quality': 5 };
    let review = 0;
    let total = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const step of buildWarmup(deep, started, lcg(seed))) {
        total++;
        if (step.levelId < 5) review++;
      }
    }
    const share = review / total;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.5);
  });

  it('never reviews below level 1, and never above the current level', () => {
    const deep = { 'find-the-note': 4, intervals: 4, 'chord-quality': 4 };
    for (let seed = 1; seed <= 30; seed++) {
      for (const step of buildWarmup(deep, started, lcg(seed))) {
        expect(step.levelId).toBeGreaterThanOrEqual(1);
        expect(step.levelId).toBeLessThanOrEqual(4);
      }
    }
  });

  it('stays on level 1 when there is nothing below it', () => {
    const fresh = { 'find-the-note': 1, intervals: 1, 'chord-quality': 1 };
    for (const step of buildWarmup(fresh, started, lcg(11))) {
      expect(step.levelId).toBe(1);
    }
  });

  it('gives the weaker course more slots than the stronger one', () => {
    const lopsided = stats({
      'find-the-note:1': { right: 2, wrong: 10 }, // struggling
      'intervals:1': { right: 12, wrong: 0 }, // solid
    });
    const flat = { 'find-the-note': 1, intervals: 1 };

    let weak = 0;
    let strong = 0;
    for (let seed = 1; seed <= 80; seed++) {
      for (const step of buildWarmup(flat, lopsided, lcg(seed))) {
        if (step.courseId === 'find-the-note') weak++;
        if (step.courseId === 'intervals') strong++;
      }
    }
    expect(weak).toBeGreaterThan(strong);
    // But the strong course must not vanish — practising only weak spots
    // lets everything else rot.
    expect(strong / (weak + strong)).toBeGreaterThan(0.2);
  });

  it('does not weight on a level with too little history to judge', () => {
    // Three answers is not a verdict, so this course must be treated as unseen
    // (weight 1.5) rather than as a 0%-accuracy disaster.
    const thin = stats({
      'find-the-note:1': { right: 0, wrong: 3 },
      'intervals:1': { right: 6, wrong: 6 },
    });
    let thinCount = 0;
    let evenCount = 0;
    for (let seed = 1; seed <= 80; seed++) {
      for (const step of buildWarmup({ 'find-the-note': 1, intervals: 1 }, thin, lcg(seed))) {
        if (step.courseId === 'find-the-note') thinCount++;
        if (step.courseId === 'intervals') evenCount++;
      }
    }
    // 50% accuracy earns 2.25 vs the unseen 1.5, so the even course leads.
    expect(evenCount).toBeGreaterThan(thinCount);
  });

  it('works with an empty profile', () => {
    const plan = buildWarmup({}, {}, lcg(5));
    expect(plan).toHaveLength(WARMUP_LENGTH);
    for (const step of plan) expect(step.levelId).toBe(1);
  });
});

describe('interleave', () => {
  it('preserves every step exactly once', () => {
    const steps = [
      { courseId: 'a', levelId: 1 },
      { courseId: 'a', levelId: 2 },
      { courseId: 'b', levelId: 1 },
      { courseId: 'c', levelId: 3 },
    ];
    const out = interleave(steps, seeded([0.9, 0.1, 0.7, 0.3]));
    expect(out).toHaveLength(steps.length);
    const key = (s: { courseId: string; levelId: number }) => `${s.courseId}:${s.levelId}`;
    expect(out.map(key).sort()).toEqual(steps.map(key).sort());
  });

  it('separates a run of one course when others are available', () => {
    const steps = [
      ...Array.from({ length: 5 }, () => ({ courseId: 'a', levelId: 1 })),
      ...Array.from({ length: 5 }, () => ({ courseId: 'b', levelId: 1 })),
    ];
    const out = interleave(steps, lcg(2));
    for (let i = 1; i < out.length; i++) {
      expect(out[i].courseId).not.toBe(out[i - 1].courseId);
    }
  });

  it('tolerates a majority course rather than looping forever', () => {
    // Six of 'a' and one of 'b' cannot be fully separated; it must still
    // terminate and return everything.
    const steps = [
      ...Array.from({ length: 6 }, () => ({ courseId: 'a', levelId: 1 })),
      { courseId: 'b', levelId: 1 },
    ];
    const out = interleave(steps, lcg(4));
    expect(out).toHaveLength(7);
    expect(out.filter((s) => s.courseId === 'b')).toHaveLength(1);
  });

  it('handles a single course and an empty plan', () => {
    expect(interleave([], lcg(1))).toEqual([]);
    const one = [{ courseId: 'a', levelId: 1 }];
    expect(interleave(one, lcg(1))).toEqual(one);
  });
});

describe('planBreakdown', () => {
  it('counts steps per course, biggest first', () => {
    const out = planBreakdown([
      { courseId: 'a', levelId: 1 },
      { courseId: 'b', levelId: 1 },
      { courseId: 'a', levelId: 2 },
      { courseId: 'a', levelId: 1 },
    ]);
    expect(out).toEqual([
      { courseId: 'a', count: 3 },
      { courseId: 'b', count: 1 },
    ]);
  });

  it('totals back to the plan length', () => {
    const plan = buildWarmup({ 'find-the-note': 2, intervals: 2 }, {}, lcg(9));
    const total = planBreakdown(plan).reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(plan.length);
  });
});
