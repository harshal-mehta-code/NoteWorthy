/**
 * The course registry — the map of everything the app contains.
 *
 * A *course* is one drill family with its own ladder and its own progress.
 * Courses that aren't built yet are listed here too, with `status: 'planned'`,
 * because the Practice library is how anyone learns what this app is. Hiding
 * the unbuilt parts made a seventeen-level app look like a one-trick toy.
 */

import type { Level } from './levels';
import { FIND_THE_NOTE } from './levels';
import { INTERVALS } from './intervals';
import { NOTE_READING } from './reading';
import { CHORDS } from './chords';
import { PROGRESSIONS } from './progressions';
import { LESSONS } from '@/content/lessons';

export type Pillar = 'ear' | 'reading' | 'theory' | 'voice';

export const PILLAR_LABEL: Record<Pillar, string> = {
  ear: 'Ear training',
  reading: 'Sight reading',
  theory: 'Music theory',
  voice: 'Your voice',
};

export const PILLAR_BLURB: Record<Pillar, string> = {
  ear: 'Hear where notes sit, and what they do.',
  reading: 'Turn dots on a stave into sound, fast.',
  theory: 'Understand why any of it works.',
  voice: 'Produce notes, not just recognise them.',
};

/** Order the pillars appear in. Ear first: it's the backbone. */
export const PILLARS: Pillar[] = ['ear', 'reading', 'theory', 'voice'];

export type CourseId =
  | 'find-the-note'
  | 'intervals'
  | 'note-reading'
  | 'theory'
  | 'melodic-dictation'
  | 'chord-quality'
  | 'progressions'
  | 'rhythm-reading'
  | 'scroll-reading'
  | 'sing-phrases';

export type Course = {
  id: CourseId;
  pillar: Pillar;
  name: string;
  /** One line, in the user's words, about what you'll be doing. */
  blurb: string;
  status: 'ready' | 'planned';
  /** Ladder levels. Empty for lesson-based and planned courses. */
  levels: Level[];
  /** Lesson-based courses read instead of drilling. */
  lessons?: number;
  /** Shown on the card when planned, so "coming" isn't a dead end. */
  planNote?: string;
};

export const COURSES: Course[] = [
  {
    id: 'find-the-note',
    pillar: 'ear',
    name: 'Find the Note',
    blurb: 'Hear a note and place it inside the key. The backbone of playing by ear.',
    status: 'ready',
    levels: FIND_THE_NOTE,
  },
  {
    id: 'intervals',
    pillar: 'ear',
    name: 'Intervals',
    blurb: 'Name the distance between two notes, up, down, or together.',
    status: 'ready',
    levels: INTERVALS,
  },
  {
    id: 'chord-quality',
    pillar: 'ear',
    name: 'Chords',
    blurb: 'Major or minor, then sevenths and inversions.',
    status: 'ready',
    levels: CHORDS,
  },
  {
    id: 'progressions',
    pillar: 'ear',
    name: 'Progressions',
    blurb: 'Name chords by their role in the key. This is what lets you work out a song.',
    status: 'ready',
    levels: PROGRESSIONS,
  },
  {
    id: 'note-reading',
    pillar: 'reading',
    name: 'Read the Note',
    blurb: 'Name notes on the stave by sight, until it stops being work.',
    status: 'ready',
    levels: NOTE_READING,
  },
  {
    id: 'theory',
    pillar: 'theory',
    name: 'Foundations',
    blurb: 'Short lessons with a keyboard you can play. Why a key is a key.',
    status: 'ready',
    levels: [],
    lessons: LESSONS.length,
  },
  {
    id: 'sing-phrases',
    pillar: 'voice',
    name: 'Sing a Phrase',
    blurb: 'Sing back two notes, then three. Melodic dictation with your voice.',
    status: 'planned',
    levels: [],
    planNote: 'Single sung notes are already in Find the Note, stage 4.',
  },
  {
    id: 'melodic-dictation',
    pillar: 'ear',
    name: 'Melodies',
    blurb: 'Hear a phrase and write it down, note by note.',
    status: 'planned',
    levels: [],
    planNote: 'Two- and three-note phrases already appear in Find the Note, stage 3.',
  },
  {
    id: 'rhythm-reading',
    pillar: 'reading',
    name: 'Rhythm',
    blurb: 'Tap what you read, in time.',
    status: 'planned',
    levels: [],
    planNote: 'Needs latency calibration first, or the scoring is meaningless.',
  },
  {
    id: 'scroll-reading',
    pillar: 'reading',
    name: 'Scroll Reading',
    blurb: 'A line of music passes a playhead. It never stops, and never repeats.',
    status: 'planned',
    levels: [],
  },
];

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

export function coursesFor(pillar: Pillar): Course[] {
  return COURSES.filter((c) => c.pillar === pillar);
}

/** Courses you can actually start right now. */
export const READY_COURSES = COURSES.filter((c) => c.status === 'ready');

/** A stable key for per-level stats, now that levels live inside courses. */
export function statKey(courseId: string, levelId: number): string {
  return `${courseId}:${levelId}`;
}
