/**
 * How much of a skill you still have.
 *
 * Everything the app knew until now was *accuracy*, which says how you did
 * while you were practising and nothing at all about what survived the week
 * afterwards. Retention is the thing people actually want and the thing every
 * ear-training app is worst at reporting.
 *
 * ## The curve
 *
 * Retrievability follows the power function FSRS settled on after fitting it
 * against a very large review corpus:
 *
 *     R(t) = (1 + F · t/S) ^ C,   F = 19/81,  C = -0.5
 *
 * `S` (stability) is defined as the interval at which R falls to 90% — check
 * it: (1 + 19/81)^-0.5 = 0.9. A power curve rather than the exponential from
 * the older literature, because real forgetting has a long tail that an
 * exponential badly underestimates.
 *
 * ## What this is not
 *
 * The curve is FSRS's. The **stability update below is not** — full FSRS
 * fits seventeen weights against a review history this app does not have and
 * could not honestly fit from a few dozen rounds. What is here is a
 * deliberately simple model with the same shape: successful recall multiplies
 * stability, the multiplier is larger the more overdue the item was (the
 * spacing effect), and difficulty and response speed scale it. When there is
 * enough history to fit properly, ts-fsrs replaces this file and the stored
 * shape already matches what it expects.
 */

export type Memory = {
  /** When this was last practised, ms since epoch. */
  lastAt: number;
  /** Interval in days at which recall would fall to 90%. */
  stability: number;
  /** How hard this item is for this person. 1 easy, 10 hard. */
  difficulty: number;
  /** How many times it has been reviewed. Used only for reporting. */
  reviews: number;
};

const FACTOR = 19 / 81;
const DECAY = -0.5;

const MS_PER_DAY = 86_400_000;

/** Stability floors and ceilings, in days. */
const MIN_STABILITY = 0.2;
const MAX_STABILITY = 365;

/**
 * How likely you are to still have it, 0-1.
 *
 * Returns 0 for something never practised: not knowing a thing and having
 * forgotten it are the same state as far as what to practise next goes.
 */
export function retrievability(memory: Memory | null | undefined, now = Date.now()): number {
  if (!memory) return 0;
  const days = Math.max(0, (now - memory.lastAt) / MS_PER_DAY);
  return Math.pow(1 + (FACTOR * days) / memory.stability, DECAY);
}

/** Days from now until retrievability falls to `target`. Negative if overdue. */
export function daysUntil(memory: Memory, target = 0.9, now = Date.now()): number {
  const dueDays = (memory.stability * (Math.pow(target, 1 / DECAY) - 1)) / FACTOR;
  const elapsed = (now - memory.lastAt) / MS_PER_DAY;
  return dueDays - elapsed;
}

export type Attempt = {
  correct: boolean;
  /** How long the answer took. Null when it can't be measured. */
  responseMs?: number | null;
  /**
   * What a fluent answer would take for this kind of question. Response time
   * is only meaningful against a baseline — three seconds is quick for a
   * four-chord progression and slow for naming one note.
   */
  parMs?: number;
};

/**
 * Fold one round's result into a memory.
 *
 * `accuracy` is the whole round rather than a single answer, because these
 * drills ask five to eight questions of the same thing and grading each one
 * separately would swing stability wildly on noise.
 */
export function review(
  memory: Memory | null | undefined,
  accuracy: number,
  attempt: Attempt = { correct: true },
  now = Date.now(),
): Memory {
  const passed = accuracy >= 0.75;
  const speed = speedFactor(attempt.responseMs, attempt.parMs);

  if (!memory) {
    // A first encounter. Getting it right quickly is worth more than getting
    // it right slowly, but neither is worth much until it survives a gap.
    const base = passed ? 1 + speed * 0.8 : 0.4;
    return {
      lastAt: now,
      stability: clampStability(base),
      difficulty: clampDifficulty(passed ? 5 - speed : 6.5),
      reviews: 1,
    };
  }

  const recalled = retrievability(memory, now);
  const difficulty = clampDifficulty(
    memory.difficulty + (passed ? -0.5 - speed * 0.5 : 1.2),
  );

  if (!passed) {
    // Forgetting does not reset you to nothing — relearning is faster than
    // learning, which is one of the most robust findings in the literature.
    return {
      lastAt: now,
      stability: clampStability(Math.max(MIN_STABILITY, memory.stability * 0.45)),
      difficulty,
      reviews: memory.reviews + 1,
    };
  }

  // The spacing effect: recalling something you had nearly lost is worth far
  // more than drilling something still fresh. `1 - recalled` is how close to
  // lost it was.
  const spacing = 1 + 2.4 * (1 - recalled);
  const ease = (11 - difficulty) / 8;
  const accuracyBonus = 0.7 + accuracy * 0.5;
  const gain = 1 + (spacing - 1) * ease * accuracyBonus * (0.85 + speed * 0.3);

  return {
    lastAt: now,
    stability: clampStability(memory.stability * Math.max(1.05, gain)),
    difficulty,
    reviews: memory.reviews + 1,
  };
}

/**
 * 0 when an answer was laboured, 1 when it was fluent.
 *
 * Accuracy alone cannot tell knowing something from working it out, and those
 * are different states of memory — the second decays much faster. Unknown
 * timing returns the neutral middle rather than a guess in either direction.
 */
export function speedFactor(responseMs?: number | null, parMs = 4000): number {
  if (responseMs === null || responseMs === undefined || responseMs <= 0) return 0.5;
  const ratio = responseMs / parMs;
  if (ratio <= 0.5) return 1;
  if (ratio >= 2) return 0;
  // Linear between half par and double par.
  return 1 - (ratio - 0.5) / 1.5;
}

function clampStability(days: number): number {
  return Math.min(MAX_STABILITY, Math.max(MIN_STABILITY, days));
}

function clampDifficulty(d: number): number {
  return Math.min(10, Math.max(1, d));
}

/**
 * How much this wants practising, 0-1.
 *
 * Peaks where recall is shaky but not gone. Something at 95% is a waste of a
 * question; something at 5% has effectively lapsed and is better rebuilt by
 * working through its level than by having it appear once in a warm-up.
 */
export function urgency(memory: Memory | null | undefined, now = Date.now()): number {
  if (!memory) return 0.5;
  const r = retrievability(memory, now);
  // A curve peaking around r = 0.6.
  return Math.max(0, 1 - Math.abs(r - 0.6) / 0.6);
}

/** Plain words for a retrievability figure. Never a bare percentage. */
export function retentionLabel(r: number): string {
  if (r >= 0.9) return 'fresh';
  if (r >= 0.7) return 'holding';
  if (r >= 0.45) return 'fading';
  if (r > 0) return 'nearly gone';
  return 'not started';
}
