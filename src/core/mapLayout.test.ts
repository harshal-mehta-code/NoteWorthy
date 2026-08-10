import { describe, expect, it } from 'vitest';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  NODE_R,
  buildMap,
  courseProgress,
  courseRetention,
  mapEdges,
  mostFaded,
} from './mapLayout';
import { COURSES, getCourse } from './courses';
import type { Memory } from './retention';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const at = (days: number) => T0 + days * DAY;

const memory = (partial: Partial<Memory> = {}): Memory => ({
  lastAt: T0,
  stability: 10,
  difficulty: 5,
  reviews: 3,
  ...partial,
});

describe('the map layout', () => {
  it('places every course, with no course left off', () => {
    const nodes = buildMap({}, {}, 0, T0);
    expect(nodes).toHaveLength(COURSES.length);
    expect(new Set(nodes.map((n) => n.course.id)).size).toBe(COURSES.length);
  });

  it('keeps every node inside the viewBox, allowing for its radius', () => {
    for (const n of buildMap({}, {}, 0, T0)) {
      expect(n.x).toBeGreaterThanOrEqual(NODE_R + 2.5);
      expect(n.x).toBeLessThanOrEqual(MAP_WIDTH - NODE_R - 2.5);
      expect(n.y).toBeGreaterThanOrEqual(NODE_R + 2);
      // Room below the last row for its label.
      expect(n.y).toBeLessThanOrEqual(MAP_HEIGHT - NODE_R - 4);
    }
  });

  it('never overlaps two nodes', () => {
    const nodes = buildMap({}, {}, 0, T0);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        // Two radii, two progress rings, and room for a label under each.
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(2 * (NODE_R + 2.2) + 3);
      }
    }
  });
});

describe('mapEdges', () => {
  it('draws an edge for every declared prerequisite', () => {
    const declared = COURSES.reduce((sum, c) => sum + (c.after?.length ?? 0), 0);
    expect(mapEdges()).toHaveLength(declared);
  });

  it('only ever points at courses that exist', () => {
    for (const { from, to } of mapEdges()) {
      expect(getCourse(from)).toBeDefined();
      expect(getCourse(to)).toBeDefined();
    }
  });

  it('has no course listed as its own prerequisite', () => {
    for (const { from, to } of mapEdges()) expect(from).not.toBe(to);
  });

  it('has no cycles, so the map reads as a direction of travel', () => {
    const edges = mapEdges();
    const seen = new Set<string>();
    const stack = new Set<string>();

    const walk = (id: string): boolean => {
      if (stack.has(id)) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      stack.add(id);
      const cycled = edges
        .filter((e) => e.from === id)
        .some((e) => walk(e.to));
      stack.delete(id);
      return cycled;
    };

    expect(COURSES.some((c) => walk(c.id))).toBe(false);
  });
});

describe('courseProgress', () => {
  const findTheNote = getCourse('find-the-note')!;
  const theory = getCourse('theory')!;

  it('is zero for a course never opened', () => {
    expect(courseProgress(findTheNote, {}, 0)).toBe(0);
  });

  it('counts reaching level 1 as progress, not as nothing', () => {
    // Drawing a started course as empty is the discouraging lie every
    // progress bar makes.
    expect(courseProgress(findTheNote, { 'find-the-note': 1 }, 0)).toBeGreaterThan(0);
  });

  it('reaches 1 at the last level and never exceeds it', () => {
    const last = findTheNote.levels.length;
    expect(courseProgress(findTheNote, { 'find-the-note': last }, 0)).toBe(1);
    expect(courseProgress(findTheNote, { 'find-the-note': last + 40 }, 0)).toBe(1);
  });

  it('counts lessons for a lesson course', () => {
    expect(courseProgress(theory, {}, 0)).toBe(0);
    expect(courseProgress(theory, {}, theory.lessons!)).toBe(1);
    expect(courseProgress(theory, {}, theory.lessons! + 5)).toBe(1);
  });

  it('is zero for a planned course, which has no ladder to climb', () => {
    expect(courseProgress(getCourse('scroll-reading')!, {}, 0)).toBe(0);
  });
});

describe('courseRetention', () => {
  const course = getCourse('intervals')!;

  it('is null with nothing practised, rather than a misleading zero', () => {
    expect(courseRetention(course, {}, {}, T0)).toBeNull();
    expect(courseRetention(course, { intervals: 3 }, {}, T0)).toBeNull();
  });

  it('reads the level you are actually on, not the best you ever managed', () => {
    const memories = {
      'intervals:1': memory({ stability: 200 }),
      'intervals:4': memory({ stability: 2 }),
    };
    const onLevel4 = courseRetention(course, { intervals: 4 }, memories, at(10))!;
    const onLevel1 = courseRetention(course, { intervals: 1 }, memories, at(10))!;
    // Level 1 is rock solid; level 4 is where you actually are and is shakier.
    expect(onLevel1).toBeGreaterThan(0.98);
    expect(onLevel4).toBeLessThan(onLevel1 - 0.25);
  });

  it('fades as time passes without practice', () => {
    const memories = { 'intervals:3': memory({ stability: 5 }) };
    const fresh = courseRetention(course, { intervals: 3 }, memories, T0)!;
    const later = courseRetention(course, { intervals: 3 }, memories, at(60))!;
    expect(later).toBeLessThan(fresh);
    expect(later).toBeGreaterThan(0);
  });

  it('claims nothing for a lesson course, which does not decay measurably', () => {
    expect(courseRetention(getCourse('theory')!, {}, {}, T0)).toBeNull();
  });
});

describe('mostFaded', () => {
  it('finds nothing when nothing has been started', () => {
    expect(mostFaded(buildMap({}, {}, 0, T0))).toBeNull();
  });

  it('finds nothing when everything is still fresh', () => {
    const nodes = buildMap(
      { intervals: 2, 'find-the-note': 3 },
      { 'intervals:2': memory({ stability: 40 }), 'find-the-note:3': memory({ stability: 40 }) },
      0,
      at(1),
    );
    expect(mostFaded(nodes)).toBeNull();
  });

  it('picks the faintest of several fading courses', () => {
    const nodes = buildMap(
      { intervals: 2, 'find-the-note': 3, 'note-reading': 2 },
      {
        'intervals:2': memory({ stability: 3 }),
        'find-the-note:3': memory({ stability: 12 }),
        'note-reading:2': memory({ stability: 8 }),
      },
      0,
      at(30),
    );
    expect(mostFaded(nodes)?.course.id).toBe('intervals');
  });

  it('never suggests a course that was never started', () => {
    const nodes = buildMap(
      { intervals: 2 },
      { 'intervals:2': memory({ stability: 2 }) },
      0,
      at(40),
    );
    const faded = mostFaded(nodes);
    expect(faded?.started).toBe(true);
  });
});

describe('buildMap', () => {
  it('marks a course started once it has any progress', () => {
    const nodes = buildMap({ intervals: 2 }, {}, 0, T0);
    expect(nodes.find((n) => n.course.id === 'intervals')!.started).toBe(true);
    expect(nodes.find((n) => n.course.id === 'progressions')!.started).toBe(false);
  });

  it('marks the lesson course started once a lesson is read', () => {
    expect(buildMap({}, {}, 0, T0).find((n) => n.course.id === 'theory')!.started).toBe(false);
    expect(buildMap({}, {}, 1, T0).find((n) => n.course.id === 'theory')!.started).toBe(true);
  });

  it('leaves planned courses unstarted and at zero', () => {
    for (const n of buildMap({ 'scroll-reading': 4 }, {}, 0, T0)) {
      if (n.course.status !== 'planned') continue;
      expect(n.progress).toBe(0);
      expect(n.retention).toBeNull();
    }
  });
});
