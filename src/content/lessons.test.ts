import { describe, expect, it } from 'vitest';
import { LESSONS, conceptFor, getLesson } from './lessons';
import { COURSES } from '@/core/courses';
import { NOTE_VALUES } from '@/core/rhythm';
import { indexToName } from '@/core/reading';

const KINDS = [
  'home-or-not',
  'rest-or-move',
  'which-is-home',
  'name-the-note',
  'sing-home',
  'sing-back',
  'sing-degree',
  'sing-phrase',
  'tap-rhythm',
  'interval-id',
  'read-note',
  'chord-quality',
  'chord-inversion',
  'progression-id',
];

describe('the lesson set', () => {
  it('has a unique id per lesson', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every lesson a title, blurb and a drill to go to next', () => {
    for (const lesson of LESSONS) {
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(lesson.blurb.length).toBeGreaterThan(0);
      // The linkage rule, forward direction: theory that points nowhere is
      // trivia (docs/02-FEATURES.md §3.3).
      expect(lesson.nextUp.length).toBeGreaterThan(0);
      expect(lesson.minutes).toBeGreaterThan(0);
    }
  });

  it('asks a question in every lesson', () => {
    // Retrieval practice, not reading: a lesson with no question is a page.
    for (const lesson of LESSONS) {
      expect(lesson.cards.some((c) => c.kind === 'question')).toBe(true);
    }
  });

  it('never runs more than four cards before asking something', () => {
    for (const lesson of LESSONS) {
      let sinceQuestion = 0;
      for (const card of lesson.cards) {
        sinceQuestion = card.kind === 'question' ? 0 : sinceQuestion + 1;
        expect(sinceQuestion, `${lesson.id} ran ${sinceQuestion} cards without a question`)
          .toBeLessThanOrEqual(4);
      }
    }
  });

  it('gives every question a real answer and an explanation', () => {
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        if (card.kind !== 'question') continue;
        expect(card.options.length).toBeGreaterThanOrEqual(2);
        expect(card.answer).toBeGreaterThanOrEqual(0);
        expect(card.answer).toBeLessThan(card.options.length);
        // The explanation has to say *why*, so it shows on a right answer too.
        expect(card.because.length).toBeGreaterThan(20);
      }
    }
  });

  it('does not always put the answer in the same place', () => {
    const answers = LESSONS.flatMap((l) =>
      l.cards.filter((c) => c.kind === 'question').map((c) => (c as { answer: number }).answer),
    );
    expect(new Set(answers).size).toBeGreaterThan(1);
  });

  it('closes every bold marker it opens', () => {
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        const body = 'body' in card ? card.body : '';
        expect((body.match(/\*\*/g) ?? []).length % 2, `${lesson.id}: ${body.slice(0, 40)}`).toBe(0);
      }
    }
  });
});

describe('the interactive cards', () => {
  it('keeps every keyboard note inside the keyboard the lesson draws', () => {
    // The lesson keyboard spans A3 to C6; anything outside is invisible.
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        if (card.kind !== 'keys') continue;
        for (const midi of [...card.highlight, ...(card.play ?? [])]) {
          expect(midi, `${lesson.id}`).toBeGreaterThanOrEqual(57);
          expect(midi, `${lesson.id}`).toBeLessThanOrEqual(84);
        }
      }
    }
  });

  it('only writes staff notes that actually land on a stave', () => {
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        if (card.kind !== 'staff') continue;
        // Four ledger lines either side of either clef is the drawable range.
        expect(indexToName(card.index)).toMatch(/^[A-G]\d$/);
        expect(card.index).toBeGreaterThan(14);
        expect(card.index).toBeLessThan(45);
      }
    }
  });

  it('fills whole bars in every rhythm example', () => {
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        if (card.kind !== 'rhythm') continue;
        const total = card.beats.reduce((sum, b) => sum + Math.abs(b), 0);
        const perBar = card.beatsPerBar ?? 4;
        expect(total % perBar, `${lesson.id}: ${card.beats.join(',')}`).toBe(0);
      }
    }
  });

  it('only uses note lengths the notation can draw', () => {
    const drawable = Object.values(NOTE_VALUES);
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        if (card.kind !== 'rhythm') continue;
        for (const beat of card.beats) {
          expect(drawable, `${lesson.id}`).toContain(Math.abs(beat));
        }
      }
    }
  });

  it('never opens a rhythm example on a rest', () => {
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        if (card.kind !== 'rhythm') continue;
        expect(card.beats[0]).toBeGreaterThan(0);
      }
    }
  });
});

describe('conceptFor — the linkage rule, backwards', () => {
  it('points every drill kind at a lesson', () => {
    // A drill with no concept behind it is one someone can get stuck in with
    // nowhere to go, which is the gap this closes.
    for (const kind of KINDS) {
      expect(conceptFor(kind), kind).not.toBeNull();
    }
  });

  it('only ever names a lesson that exists', () => {
    for (const kind of KINDS) {
      for (const level of [1, 3, 5, 9]) {
        const id = conceptFor(kind, level);
        expect(getLesson(id ?? ''), `${kind} level ${level} -> ${id}`).toBeDefined();
      }
    }
  });

  it('names nothing for a kind it has never heard of', () => {
    expect(conceptFor('something-invented')).toBeNull();
  });

  it('moves on to the later concept as a course climbs', () => {
    expect(conceptFor('chord-quality', 1)).toBe('triads');
    expect(conceptFor('chord-quality', 4)).toBe('sevenths');
    expect(conceptFor('progression-id', 1)).toBe('chords-in-key');
    expect(conceptFor('progression-id', 6)).toBe('cadences');
    expect(conceptFor('tap-rhythm', 1)).toBe('note-values');
    expect(conceptFor('tap-rhythm', 7)).toBe('meter');
  });

  it('covers every level of every ready course', () => {
    for (const course of COURSES.filter((c) => c.status === 'ready')) {
      for (const level of course.levels) {
        const id = conceptFor(level.kind, level.id);
        expect(getLesson(id ?? ''), `${course.id} level ${level.id}`).toBeDefined();
      }
    }
  });
});
