/**
 * The Daily Warm-Up — the app's heartbeat.
 *
 * A short mixed session assembled fresh each time from every course you've
 * started. It exists because of one of the better-replicated findings in
 * learning science: **interleaving**. Mixing item types within a session
 * feels worse and performs worse *during* practice, and produces markedly
 * better retention and transfer afterwards (docs/01-PEDAGOGY.md §1.3).
 * Grinding one course is what people choose; mixing is what works.
 *
 * It is also the only place old material comes back on its own. Practising
 * a course always serves your current level, so everything below it quietly
 * rots — a share of warm-up questions deliberately reach back down.
 */

import { COURSES, statKey, type Course } from './courses';
import { urgency, type Memory } from './retention';
import type { LevelStats } from '@/store/useStore';

export type PlanStep = { courseId: string; levelId: number };

export const WARMUP_LENGTH = 10;

/** Courses that can appear in a warm-up: drills with levels, not lessons. */
export function warmupCourses(): Course[] {
  return COURSES.filter((c) => c.status === 'ready' && c.levels.length > 0);
}

function accuracyAt(stats: Record<string, LevelStats>, courseId: string, levelId: number) {
  const s = stats[statKey(courseId, levelId)];
  if (!s || s.recent.length < 4) return null;
  return s.recent.filter(Boolean).length / s.recent.length;
}

function answeredIn(stats: Record<string, LevelStats>, courseId: string): number {
  return Object.entries(stats)
    .filter(([k]) => k.startsWith(`${courseId}:`))
    .reduce((sum, [, v]) => sum + v.total, 0);
}

/**
 * Build a warm-up.
 *
 * `random` is injectable so the tests can be deterministic without the
 * generator having to know anything about testing.
 */
export function buildWarmup(
  progress: Record<string, number>,
  stats: Record<string, LevelStats>,
  memories: Record<string, Memory> = {},
  random: () => number = Math.random,
  length = WARMUP_LENGTH,
  now = Date.now(),
): PlanStep[] {
  const all = warmupCourses();

  // Courses you've actually touched. If that's fewer than two there is
  // nothing to interleave, so fall back to everything — a warm-up that is
  // secretly one course is just a round with a different name.
  const started = all.filter((c) => answeredIn(stats, c.id) > 0);
  const pool = started.length >= 2 ? started : all;

  // Weight by two things that mean different things and are both needed.
  //
  // **Weakness** is how a course is going right now — low accuracy earns more
  // slots. **Urgency** is how close it is to being lost, from the forgetting
  // curve. A course you are bad at but drilled this morning is less worth a
  // question than one you were good at in March, and accuracy alone cannot
  // see that difference at all.
  const weights = new Map<string, number>();
  for (const course of pool) {
    const level = progress[course.id] ?? 1;
    const acc = accuracyAt(stats, course.id, level);
    // Unseen courses get a nudge so new material surfaces early; otherwise
    // 60% accuracy earns roughly double the slots of 100%.
    const weakness = acc === null ? 1.5 : 1 + (1 - acc) * 2.5;
    const slipping = urgency(memories[statKey(course.id, level)], now);
    weights.set(course.id, weakness * (0.7 + slipping * 0.9));
  }

  // Bound how much of the warm-up any one course can take. Left uncapped, a
  // weighted draw regularly hands one course seven of ten and the result is a
  // run of the same drill — the blocked practice this whole thing exists to
  // avoid. The bound is 60% rather than a strict half because an exact half
  // would erase the weighting altogether for anyone with two courses going;
  // 60% still leaves at most one adjacent pair for `interleave` to absorb, so
  // the same drill never lands three times running.
  const cap = pool.length > 1 ? Math.ceil(length * 0.6) : length;
  const taken = new Map<string, number>();

  const picks: PlanStep[] = [];
  for (let i = 0; i < length; i++) {
    const eligible = pool.filter((c) => (taken.get(c.id) ?? 0) < cap);
    const course = weightedPick(eligible.length ? eligible : pool, weights, random);
    taken.set(course.id, (taken.get(course.id) ?? 0) + 1);
    const current = Math.min(progress[course.id] ?? 1, course.levels.length);

    // Roughly a third of questions reach back to an earlier level. Practising
    // a course always serves the current level, so without this the ground
    // you've already covered is never revisited.
    const reviewing = current > 1 && random() < 0.35;
    const levelId = reviewing ? pickReviewLevel(course.id, current, memories, random, now) : current;

    picks.push({ courseId: course.id, levelId });
  }

  return interleave(picks, random);
}

/**
 * Which earlier level to revisit.
 *
 * Uniformly at random was the old behaviour and it is close to useless: most
 * of the levels behind you are solid, so a coin flip spends the review budget
 * on things you already have. This picks the one closest to slipping, and
 * only falls back to random when nothing behind you has been measured yet.
 */
function pickReviewLevel(
  courseId: string,
  current: number,
  memories: Record<string, Memory>,
  random: () => number,
  now: number,
): number {
  const earlier = Array.from({ length: current - 1 }, (_, i) => i + 1);
  const measured = earlier.filter((id) => memories[statKey(courseId, id)]);
  if (measured.length === 0) return 1 + Math.floor(random() * (current - 1));

  const scored = measured.map((id) => ({
    id,
    urgency: urgency(memories[statKey(courseId, id)], now),
  }));
  const total = scored.reduce((sum, s) => sum + s.urgency, 0);
  // Every measured level scoring zero means they are all either brand new or
  // completely lapsed; a straight pick is as good as anything then.
  if (total <= 0) return measured[Math.floor(random() * measured.length)];

  let roll = random() * total;
  for (const s of scored) {
    roll -= s.urgency;
    if (roll <= 0) return s.id;
  }
  return scored[scored.length - 1].id;
}

function weightedPick(
  courses: Course[],
  weights: Map<string, number>,
  random: () => number,
): Course {
  const total = courses.reduce((sum, c) => sum + (weights.get(c.id) ?? 1), 0);
  let roll = random() * total;
  for (const c of courses) {
    roll -= weights.get(c.id) ?? 1;
    if (roll <= 0) return c;
  }
  return courses[courses.length - 1];
}

/**
 * Spread the picks so the same course never lands twice in a row.
 *
 * Without this a weighted draw regularly produces three of the same course
 * back to back, which is exactly the blocked practice the warm-up exists to
 * avoid. Greedy: repeatedly take the most-remaining course that isn't the
 * one just placed.
 */
export function interleave(steps: PlanStep[], random: () => number = Math.random): PlanStep[] {
  const byCourse = new Map<string, PlanStep[]>();
  for (const step of steps) {
    const list = byCourse.get(step.courseId) ?? [];
    list.push(step);
    byCourse.set(step.courseId, list);
  }

  const out: PlanStep[] = [];
  let previous: string | null = null;

  while (out.length < steps.length) {
    const candidates = [...byCourse.entries()].filter(([id, list]) => list.length > 0 && id !== previous);
    // Everything left belongs to the course we just used — unavoidable, so
    // take it rather than loop forever.
    const usable = candidates.length
      ? candidates
      : [...byCourse.entries()].filter(([, list]) => list.length > 0);

    let best = usable[0];
    for (const entry of usable) {
      if (entry[1].length > best[1].length) best = entry;
      else if (entry[1].length === best[1].length && random() < 0.5) best = entry;
    }

    out.push(best[1].pop()!);
    previous = best[0];
  }

  return out;
}

/** How the warm-up broke down, for the summary. */
export function planBreakdown(plan: PlanStep[]): { courseId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const step of plan) counts.set(step.courseId, (counts.get(step.courseId) ?? 0) + 1);
  return [...counts.entries()]
    .map(([courseId, count]) => ({ courseId, count }))
    .sort((a, b) => b.count - a.count);
}
