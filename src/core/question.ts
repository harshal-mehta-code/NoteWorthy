/**
 * Question generation and grading, one shape for every level kind.
 *
 * Keeping this separate from the Practice screen is the first move toward
 * the drill contract in docs/04-ARCHITECTURE.md §3.5 — the screen renders a
 * Question and reports an answer, and knows nothing about how either is made.
 */

import { RESTFUL_STEPS, type Level, type LevelKind } from './levels';
import { SOLFEGE, STEP_NICKNAME, pickRandom, pickStep } from './music';

export type Option = { id: string; primary: string; secondary?: string };

export type Question = {
  kind: LevelKind;
  /** Scale steps to play, in order. Usually one; three for 'which-is-home'. */
  sequence: number[];
  /** Per-note octave displacement, parallel to `sequence`. */
  octaveUp: boolean[];
  options: Option[];
  correctId: string;
  /** Shown as the headline in feedback. */
  answerLabel: string;
  /** One line under it, explaining *why*. */
  explain: string;
};

/** How the answer buttons should be laid out for a kind. */
export function columnsFor(q: Question): number {
  if (q.options.length <= 3) return q.options.length;
  return q.options.length <= 6 ? 3 : 4;
}

export function generate(level: Level, previousStep: number | null): Question {
  switch (level.kind) {
    case 'home-or-not':
      return homeOrNot(level, previousStep);
    case 'rest-or-move':
      return restOrMove(level, previousStep);
    case 'which-is-home':
      return whichIsHome(level);
    case 'name-the-note':
      return nameTheNote(level, previousStep);
  }
}

/**
 * Home is asked for on roughly half the questions, so "always guess away"
 * never pays and the two answers stay genuinely equally weighted.
 */
function homeOrNot(level: Level, previousStep: number | null): Question {
  const others = level.steps.filter((s) => s !== 1);
  const step = Math.random() < 0.5 ? 1 : pickStep(others, previousStep);
  const isHome = step === 1;

  return {
    kind: 'home-or-not',
    sequence: [step],
    octaveUp: [false],
    options: [
      { id: 'home', primary: 'Home', secondary: 'it blends in' },
      { id: 'away', primary: 'Away', secondary: 'it sits apart' },
    ],
    correctId: isHome ? 'home' : 'away',
    answerLabel: isHome ? 'That was home' : 'That was away from home',
    explain: isHome
      ? 'Home disappears into the drone — same note, nothing rubbing.'
      : `That was ${step} · ${SOLFEGE[step - 1]}, ${STEP_NICKNAME[step]}.`,
  };
}

function restOrMove(level: Level, previousStep: number | null): Question {
  const step = pickStep(level.steps, previousStep);
  const restful = RESTFUL_STEPS.includes(step);

  return {
    kind: 'rest-or-move',
    sequence: [step],
    octaveUp: [false],
    options: [
      { id: 'rest', primary: 'Settled', secondary: 'it has arrived' },
      { id: 'move', primary: 'Restless', secondary: 'it wants to move' },
    ],
    correctId: restful ? 'rest' : 'move',
    answerLabel: restful ? 'Settled' : 'Restless',
    explain: `${step} · ${SOLFEGE[step - 1]} — ${STEP_NICKNAME[step]}. ${
      restful
        ? 'It belongs to the home chord, so it can sit there indefinitely.'
        : 'It sits between the home chord notes, so it leans toward one of them.'
    }`,
  };
}

/**
 * Three notes, one of them home. One distractor is deliberately a strong
 * one — 5 or 3 — because those are what people mistake for home, and a test
 * made only of easy distractors teaches nothing.
 */
function whichIsHome(_level: Level): Question {
  const strong = pickRandom([3, 5]);
  const weakPool = [2, 4, 6, 7].filter((s) => s !== strong);
  const weak = pickRandom(weakPool);

  const steps = shuffle([1, strong, weak]);
  const homeIndex = steps.indexOf(1);
  const ordinals = ['First', 'Second', 'Third'];

  return {
    kind: 'which-is-home',
    sequence: steps,
    octaveUp: [false, false, false],
    options: ordinals.map((label, i) => ({ id: String(i), primary: label })),
    correctId: String(homeIndex),
    answerLabel: `Home was ${ordinals[homeIndex].toLowerCase()}`,
    explain: `The other two were ${steps
      .filter((s) => s !== 1)
      .map((s) => `${s} · ${SOLFEGE[s - 1]}`)
      .join(' and ')}. Home is the one you could stop on.`,
  };
}

function nameTheNote(level: Level, previousStep: number | null): Question {
  const step = pickStep(level.steps, previousStep);
  const octaveUp = level.twoOctaves && Math.random() < 0.35;

  return {
    kind: 'name-the-note',
    sequence: [step],
    octaveUp: [octaveUp],
    options: level.steps.map((s) => ({
      id: String(s),
      primary: String(s),
      secondary: SOLFEGE[s - 1],
    })),
    correctId: String(step),
    answerLabel: `${step} · ${SOLFEGE[step - 1]}`,
    explain: STEP_NICKNAME[step],
  };
}

/** The step a given option represents, when there is one. Used for playback. */
export function stepForOption(q: Question, optionId: string): number | null {
  switch (q.kind) {
    case 'name-the-note':
      return Number(optionId);
    case 'which-is-home':
      return q.sequence[Number(optionId)] ?? null;
    default:
      return null;
  }
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
