/**
 * Question generation and grading, one shape for every level kind.
 *
 * Keeping this separate from the Practice screen is the first move toward
 * the drill contract in docs/04-ARCHITECTURE.md §3.5 — the screen renders a
 * Question and reports an answer, and knows nothing about how either is made.
 */

import type { Level, LevelKind } from './levels';
import {
  RESTFUL,
  degreeLabel,
  degreeNickname,
  degreeSolfege,
  pickDegree,
  pickRandom,
  type Deg,
} from './music';

export type Option = { id: string; primary: string; secondary?: string };

export type Question = {
  kind: LevelKind;
  /** Degrees to play, in order. */
  sequence: Deg[];
  /** Per-note octave displacement, parallel to `sequence`. */
  octaveUp: boolean[];
  options: Option[];
  /** For multi-note questions this is the answer for each slot, in order. */
  correctIds: string[];
  /** Shown as the headline in feedback. */
  answerLabel: string;
  /** One line under it, explaining *why*. */
  explain: string;
};

/** How many answer slots the learner has to fill. */
export function slotCount(q: Question): number {
  return q.correctIds.length;
}

export function columnsFor(q: Question): number {
  if (q.options.length <= 3) return q.options.length;
  if (q.options.length <= 6) return 3;
  return q.options.length <= 8 ? 4 : 5;
}

export function generate(
  level: Level,
  previous: Deg | null,
  weights?: Map<Deg, number>,
): Question {
  switch (level.kind) {
    case 'home-or-not':
      return homeOrNot(level, previous, weights);
    case 'rest-or-move':
      return restOrMove(level, previous, weights);
    case 'which-is-home':
      return whichIsHome(level);
    case 'name-the-note':
      return nameTheNote(level, previous, weights);
  }
}

/**
 * Home is asked for on roughly half the questions, so "always guess away"
 * never pays and the two answers stay genuinely equally weighted.
 */
function homeOrNot(level: Level, previous: Deg | null, weights?: Map<Deg, number>): Question {
  const others = level.degrees.filter((d) => d !== 0);
  const deg = Math.random() < 0.5 ? 0 : pickDegree(others, previous, weights);
  const isHome = deg === 0;

  return {
    kind: 'home-or-not',
    sequence: [deg],
    octaveUp: [false],
    options: [
      { id: 'home', primary: 'Home', secondary: 'it blends in' },
      { id: 'away', primary: 'Away', secondary: 'it sits apart' },
    ],
    correctIds: [isHome ? 'home' : 'away'],
    answerLabel: isHome ? 'That was home' : 'That was away from home',
    explain: isHome
      ? 'Home disappears into the drone — same note, nothing rubbing.'
      : `That was ${degreeLabel(deg, level.mode)} · ${degreeSolfege(deg)}, ${degreeNickname(deg, level.mode)}.`,
  };
}

function restOrMove(level: Level, previous: Deg | null, weights?: Map<Deg, number>): Question {
  const deg = pickDegree(level.degrees, previous, weights);
  const restful = RESTFUL[level.mode].includes(deg);

  return {
    kind: 'rest-or-move',
    sequence: [deg],
    octaveUp: [false],
    options: [
      { id: 'rest', primary: 'Settled', secondary: 'it has arrived' },
      { id: 'move', primary: 'Restless', secondary: 'it wants to move' },
    ],
    correctIds: [restful ? 'rest' : 'move'],
    answerLabel: restful ? 'Settled' : 'Restless',
    explain: `${degreeLabel(deg, level.mode)} · ${degreeSolfege(deg)} — ${degreeNickname(deg, level.mode)}. ${
      restful
        ? 'It belongs to the home chord, so it can sit there indefinitely.'
        : 'It sits between the home chord notes, so it leans toward one of them.'
    }`,
  };
}

/**
 * Three notes, one of them home. One distractor is deliberately a strong
 * one — the third or the fifth — because those are what people mistake for
 * home, and a test made only of easy distractors teaches nothing.
 */
function whichIsHome(level: Level): Question {
  const restful = RESTFUL[level.mode].filter((d) => d !== 0);
  const strong = pickRandom(restful);
  const weakPool = level.degrees.filter((d) => d !== 0 && d !== strong);
  const weak = pickRandom(weakPool);

  const sequence = shuffle([0, strong, weak]);
  const homeIndex = sequence.indexOf(0);
  const ordinals = ['First', 'Second', 'Third'];

  return {
    kind: 'which-is-home',
    sequence,
    octaveUp: [false, false, false],
    options: ordinals.map((label, i) => ({ id: String(i), primary: label })),
    correctIds: [String(homeIndex)],
    answerLabel: `Home was ${ordinals[homeIndex].toLowerCase()}`,
    explain: `The other two were ${sequence
      .filter((d) => d !== 0)
      .map((d) => `${degreeLabel(d, level.mode)} · ${degreeSolfege(d)}`)
      .join(' and ')}. Home is the one you could stop on.`,
  };
}

function nameTheNote(level: Level, previous: Deg | null, weights?: Map<Deg, number>): Question {
  const sequence: Deg[] = [];
  let prev = previous;
  for (let i = 0; i < level.sequenceLength; i++) {
    const deg = pickDegree(level.degrees, prev, weights);
    sequence.push(deg);
    prev = deg;
  }

  const octaveUp = sequence.map(() => level.twoOctaves && Math.random() < 0.35);
  const labels = sequence.map((d) => `${degreeLabel(d, level.mode)} · ${degreeSolfege(d)}`);

  return {
    kind: 'name-the-note',
    sequence,
    octaveUp,
    options: level.degrees.map((d) => ({
      id: String(d),
      primary: degreeLabel(d, level.mode),
      secondary: degreeSolfege(d),
    })),
    correctIds: sequence.map(String),
    answerLabel: labels.join('  →  '),
    explain:
      sequence.length === 1
        ? degreeNickname(sequence[0], level.mode)
        : sequence.map((d) => degreeNickname(d, level.mode)).join(', then '),
  };
}

/** The degree an option represents, when there is one. Used for playback. */
export function degreeForOption(q: Question, optionId: string): Deg | null {
  switch (q.kind) {
    case 'name-the-note':
      return Number(optionId);
    case 'which-is-home':
      return q.sequence[Number(optionId)] ?? null;
    default:
      return null;
  }
}

/**
 * Which degrees an error should be blamed on, so stats and the summary can
 * be specific. For 'which-is-home' that's the note you mistook for home;
 * everywhere else it's the note (or notes) you failed to place.
 */
export function blamedDegrees(q: Question, answer: string[]): Deg[] {
  if (q.kind === 'which-is-home') {
    const picked = degreeForOption(q, answer[0] ?? '0');
    return picked === null ? [q.sequence[0]] : [picked];
  }
  if (q.kind === 'name-the-note') {
    const wrong = q.sequence.filter((_, i) => answer[i] !== q.correctIds[i]);
    return wrong.length ? wrong : q.sequence;
  }
  return [q.sequence[0]];
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
