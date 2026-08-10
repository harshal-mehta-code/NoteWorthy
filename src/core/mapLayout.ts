/**
 * Where the courses sit on the Musicianship Map, and how bright each one is.
 *
 * Kept out of the component so the arithmetic — which is the part that can be
 * wrong in ways nobody notices by looking — is testable on its own.
 *
 * The layout is deliberately hand-placed rather than force-directed. A
 * force-directed graph of ten nodes rearranges itself every time a course is
 * added, which means the map a user learned last week is a different picture
 * this week; the whole value of a map is that it stays put.
 */

import { COURSES, type Course, type CourseId, type Pillar } from './courses';
import { retrievability, type Memory } from './retention';

export type MapNode = {
  course: Course;
  x: number;
  y: number;
  /** 0-1. How much of this course's ladder you've climbed. */
  progress: number;
  /** 0-1, or null when never touched. How much of it you still have. */
  retention: number | null;
  started: boolean;
};

export type MapEdge = { from: CourseId; to: CourseId };

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 106;
/** Node radius, in map units. The ring sits just outside it. */
export const NODE_R = 6;

/**
 * Fixed positions, in map units.
 *
 * Ear training runs down the middle because everything else leans on it.
 * Reading is a column of its own on the right, theory sits at the top as the
 * thing that precedes everything, and voice branches left off Find the Note.
 */
const POSITIONS: Record<CourseId, { x: number; y: number }> = {
  theory: { x: 50, y: 8 },
  'find-the-note': { x: 50, y: 30 },
  'sing-phrases': { x: 16, y: 30 },
  intervals: { x: 50, y: 52 },
  'chord-quality': { x: 38, y: 74 },
  'melodic-dictation': { x: 66, y: 74 },
  progressions: { x: 38, y: 96 },
  'note-reading': { x: 86, y: 8 },
  'rhythm-reading': { x: 86, y: 30 },
  'scroll-reading': { x: 86, y: 52 },
};

/**
 * Names as they appear on the map. The full name has to fit under a node
 * without colliding with its neighbour, and a couple are long enough that
 * they would.
 */
export const MAP_LABEL: Partial<Record<CourseId, string>> = {
  'rhythm-reading': 'Rhythm',
};

export function mapLabel(id: CourseId, name: string): string {
  return MAP_LABEL[id] ?? name;
}

export function mapEdges(): MapEdge[] {
  const edges: MapEdge[] = [];
  for (const course of COURSES) {
    for (const from of course.after ?? []) edges.push({ from, to: course.id });
  }
  return edges;
}

/**
 * How far up a course's ladder you are, 0-1.
 *
 * Lesson courses count lessons read. A course you've just started is not at
 * zero — reaching level 1 of 17 is progress, and drawing it as nothing is the
 * discouraging lie every progress bar makes.
 */
export function courseProgress(
  course: Course,
  progress: Record<string, number>,
  lessonsDone: number,
): number {
  if (course.lessons) return Math.min(1, lessonsDone / course.lessons);
  if (course.levels.length === 0) return 0;
  const level = progress[course.id] ?? 0;
  if (level === 0) return 0;
  return Math.min(1, level / course.levels.length);
}

/**
 * What you still have of a course.
 *
 * Measured at the level you're actually on, not the best you ever managed:
 * the question the map answers is "what would happen if I sat down now", and
 * that is decided by where you are.
 */
export function courseRetention(
  course: Course,
  progress: Record<string, number>,
  memories: Record<string, Memory>,
  now = Date.now(),
): number | null {
  if (course.lessons) {
    // Lessons are read, not drilled. Nothing decays here in a way the app can
    // honestly measure, so it does not pretend to.
    return null;
  }
  const level = progress[course.id];
  if (!level) return null;
  const memory = memories[`${course.id}:${level}`];
  if (!memory) return null;
  return retrievability(memory, now);
}

export function buildMap(
  progress: Record<string, number>,
  memories: Record<string, Memory>,
  lessonsDone: number,
  now = Date.now(),
): MapNode[] {
  return COURSES.map((course) => ({
    course,
    ...POSITIONS[course.id],
    progress: courseProgress(course, progress, lessonsDone),
    retention: courseRetention(course, progress, memories, now),
    started: course.lessons
      ? lessonsDone > 0
      : (progress[course.id] ?? 0) > 0 ||
        Object.keys(memories).some((k) => k.startsWith(`${course.id}:`)),
  }));
}

/** The one node most worth a round right now, or null if nothing is fading. */
export function mostFaded(nodes: MapNode[]): MapNode | null {
  const candidates = nodes.filter(
    (n) => n.started && n.retention !== null && n.retention < 0.7,
  );
  if (!candidates.length) return null;
  return candidates.reduce((worst, n) => (n.retention! < worst.retention! ? n : worst));
}

export const PILLAR_TINT: Record<Pillar, string> = {
  ear: 'var(--nw-accent)',
  reading: 'var(--nw-cool)',
  theory: 'var(--nw-accent)',
  voice: 'var(--nw-cool)',
};
