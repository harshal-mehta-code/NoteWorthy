import { describe, expect, it } from 'vitest';
import { FIND_THE_NOTE as LEVELS, getLevel, isSingKind } from './levels';
import { blamedDegrees, generate, singDegrees, slotCount } from './question';
import { DIATONIC } from './music';

const times = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('every level generates valid questions', () => {
  for (const level of LEVELS) {
    it(`level ${level.id} — ${level.name}`, () => {
      for (const _ of times(200)) {
        void _;
        const q = generate(level, null);

        expect(q.octaveUp.length).toBe(q.sequence.length);
        expect(q.answerLabel.length).toBeGreaterThan(0);

        // Everything played has to be a degree the level actually declares,
        // or the answer buttons cannot contain the right answer.
        for (const deg of q.sequence) {
          expect(level.degrees).toContain(deg);
        }

        if (isSingKind(level.kind)) {
          // Graded by the microphone, so there are no options at all — but
          // there must be a target, and it must be in the level's pool.
          expect(q.options).toHaveLength(0);
          expect(q.correctIds).toHaveLength(0);
          expect(q.target).toBeDefined();
          expect(level.degrees).toContain(q.target!);
          continue;
        }

        expect(q.sequence.length).toBeGreaterThan(0);
        expect(q.options.length).toBeGreaterThan(1);
        expect(q.correctIds.length).toBeGreaterThan(0);

        // Every correct answer must be selectable.
        const ids = new Set(q.options.map((o) => o.id));
        for (const id of q.correctIds) {
          expect(ids.has(id)).toBe(true);
        }
      }
    });
  }
});

describe('answer slots match the question', () => {
  it('asks for one answer per note in a naming sequence', () => {
    for (const level of LEVELS.filter((l) => l.kind === 'name-the-note')) {
      const q = generate(level, null);
      expect(slotCount(q)).toBe(level.sequenceLength);
    }
  });

  it('asks for a single answer on the yes/no and find-home levels', () => {
    for (const level of LEVELS.filter(
      (l) => l.kind !== 'name-the-note' && !isSingKind(l.kind),
    )) {
      expect(slotCount(generate(level, null))).toBe(1);
    }
  });
});

describe('sing levels', () => {
  it('always asks for home on sing-home', () => {
    const level = getLevel(15);
    for (const _ of times(50)) {
      void _;
      expect(generate(level, null).target).toBe(0);
    }
  });

  it('plays the note on sing-back, so you have something to copy', () => {
    const level = getLevel(16);
    for (const _ of times(100)) {
      void _;
      const q = generate(level, null);
      expect(q.sequence).toEqual([q.target]);
    }
  });

  it('plays nothing on sing-degree — that is the whole point', () => {
    const level = getLevel(17);
    for (const _ of times(100)) {
      void _;
      const q = generate(level, null);
      expect(q.sequence).toHaveLength(0);
      expect(level.degrees).toContain(q.target!);
    }
  });

  it('credits and blames the target degree', () => {
    for (const id of [15, 16, 17]) {
      const q = generate(getLevel(id), null);
      expect(singDegrees(q)).toEqual([q.target]);
      expect(blamedDegrees(q, [])).toEqual([q.target]);
    }
  });

  it('never repeats the previous note back to back', () => {
    const level = getLevel(16);
    for (const _ of times(200)) {
      void _;
      expect(generate(level, 7).target).not.toBe(7);
    }
  });
});

describe('home-or-not', () => {
  it('asks for home roughly half the time, so guessing "away" does not pay', () => {
    const level = getLevel(2);
    let home = 0;
    for (const _ of times(2000)) {
      void _;
      if (generate(level, null).correctIds[0] === 'home') home++;
    }
    expect(home / 2000).toBeGreaterThan(0.4);
    expect(home / 2000).toBeLessThan(0.6);
  });
});

describe('rest-or-move', () => {
  it('calls the home chord settled and everything else restless', () => {
    const level = getLevel(3);
    for (const _ of times(400)) {
      void _;
      const q = generate(level, null);
      const expected = [0, 4, 7].includes(q.sequence[0]) ? 'rest' : 'move';
      expect(q.correctIds[0]).toBe(expected);
    }
  });
});

describe('which-is-home', () => {
  const level = getLevel(4);

  it('always includes home exactly once, in a varying position', () => {
    const positions = new Set<string>();
    for (const _ of times(400)) {
      void _;
      const q = generate(level, null);
      expect(q.sequence.filter((d) => d === 0)).toHaveLength(1);
      expect(q.sequence[Number(q.correctIds[0])]).toBe(0);
      positions.add(q.correctIds[0]);
    }
    expect(positions.size).toBe(3);
  });

  it('always includes a strong distractor, since easy ones teach nothing', () => {
    for (const _ of times(400)) {
      void _;
      const q = generate(level, null);
      const distractors = q.sequence.filter((d) => d !== 0);
      expect(distractors.some((d) => d === 4 || d === 7)).toBe(true);
    }
  });
});

describe('minor level', () => {
  it('only ever plays notes of the minor scale', () => {
    const level = getLevel(12);
    expect(level.mode).toBe('minor');
    for (const _ of times(300)) {
      void _;
      for (const deg of generate(level, null).sequence) {
        expect(DIATONIC.minor).toContain(deg);
      }
    }
  });
});

describe('blamedDegrees', () => {
  it('blames the notes you got wrong, not the whole phrase', () => {
    const level = getLevel(10); // two in a row
    const q = generate(level, null);
    const [a, b] = q.correctIds;
    const wrongSecond = [a, String((Number(b) + 1) % 12)];
    expect(blamedDegrees(q, wrongSecond)).toEqual([q.sequence[1]]);
  });

  it('blames the note you mistook for home on find-home', () => {
    const q = generate(getLevel(4), null);
    const wrongIndex = ['0', '1', '2'].find((i) => i !== q.correctIds[0])!;
    expect(blamedDegrees(q, [wrongIndex])).toEqual([q.sequence[Number(wrongIndex)]]);
  });
});
