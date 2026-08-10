import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PROMOTE_ACCURACY, PROMOTE_MIN_ITEMS, parMsFor, type IntroMode } from '@/core/levels';
import { review, type Memory } from '@/core/retention';
import { getCourse, statKey } from '@/core/courses';
import type { Deg } from '@/core/music';
import type { VocalRange } from '@/core/range';
import type { BackupPayload } from '@/core/backup';
import { blendOffset } from '@/core/rhythm';

export type LabelStyle = 'numbers' | 'solfege';
export type ThemeChoice = 'system' | 'dark' | 'light';
export type KeyMode = 'fixed' | 'random';

export type LevelStats = {
  /** Most recent results at this level, newest last. Capped. */
  recent: boolean[];
  correct: number;
  total: number;
};

/** Per-item history within a level, which is what the adaptation runs on. */
export type DegreeStat = { right: number; wrong: number; recent: boolean[] };

export type SessionResult = {
  courseId: string;
  levelId: number;
  correct: number;
  total: number;
  bestStreak: number;
  /** Items involved in this round's mistakes, most-missed first. */
  weakDegrees: Deg[];
  /** Which courses a mixed round drew on. Absent for single-course rounds. */
  mix?: { courseId: string; count: number }[];
  /** Whether any of it was sung, so the summary can offer a cool-down. */
  sang?: boolean;
  promoted: boolean;
  finishedAt: number;
};

type State = {
  hasOnboarded: boolean;
  /** Current level per course. */
  progress: Record<string, number>;
  /** The course the user was last in, so Today can offer to continue it. */
  lastCourse: string;
  lessonsDone: string[];

  introOverride: IntroMode | 'auto';
  keyMode: KeyMode;
  keyName: string;
  labelStyle: LabelStyle;
  theme: ThemeChoice;

  /** Measured once, then every sung reference is moved into it. */
  vocalRange: VocalRange | null;
  /**
   * Constant lag between the beat and your tap, learned from rhythm rounds.
   * Device output latency and personal lean are indistinguishable here, so
   * this is simply subtracted before timing is judged — which is why there
   * is no calibration wizard.
   */
  tapOffsetMs: number | null;
  /**
   * When the last vocal warm-up finished, and how long has been spent singing
   * today. Both exist for the vocal-health rules in docs/01-PEDAGOGY.md §4.4,
   * which is the one part of the plan where being wrong can hurt someone.
   */
  lastWarmUpAt: number | null;
  sungMsToday: number;
  sungDay: string | null;

  /** Keyed `courseId:levelId`. */
  stats: Record<string, LevelStats>;
  /**
   * What is still retained, keyed `courseId:levelId`. Accuracy describes how
   * a round went; this describes what survived the week afterwards, which is
   * the thing people actually want to know.
   */
  memories: Record<string, Memory>;
  degreeStats: Record<string, Record<number, DegreeStat>>;
  streakDays: number;
  lastPracticeDay: string | null;
  totalSessions: number;
  totalAnswers: number;
  lastSession: SessionResult | null;

  completeOnboarding: () => void;
  recordAnswer: (courseId: string, levelId: number, correct: boolean, items: Deg[]) => void;
  finishSession: (result: Omit<SessionResult, 'promoted' | 'finishedAt'>) => SessionResult;
  setLevel: (courseId: string, id: number) => void;
  markLessonDone: (id: string) => void;
  setIntroOverride: (m: IntroMode | 'auto') => void;
  setKeyMode: (m: KeyMode) => void;
  setKeyName: (n: string) => void;
  setLabelStyle: (s: LabelStyle) => void;
  setTheme: (t: ThemeChoice) => void;
  setVocalRange: (r: VocalRange | null) => void;
  learnTapOffset: (measuredMs: number | null) => void;
  markWarmedUp: () => void;
  addSungTime: (ms: number) => void;
  recordRetention: (
    courseId: string,
    levelId: number,
    accuracy: number,
    responseMs: number | null,
  ) => void;
  restore: (payload: BackupPayload) => void;
  resetProgress: () => void;
};

const RECENT_CAP = 40;
const DEGREE_RECENT_CAP = 20;

function dayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyStats = (): LevelStats => ({ recent: [], correct: 0, total: 0 });
const emptyDegree = (): DegreeStat => ({ right: 0, wrong: 0, recent: [] });

const INITIAL = {
  hasOnboarded: false,
  progress: {} as Record<string, number>,
  lastCourse: 'find-the-note',
  lessonsDone: [] as string[],
  introOverride: 'auto' as const,
  keyMode: 'fixed' as const,
  keyName: 'C',
  labelStyle: 'numbers' as const,
  theme: 'system' as const,
  vocalRange: null as VocalRange | null,
  tapOffsetMs: null as number | null,
  lastWarmUpAt: null as number | null,
  sungMsToday: 0,
  sungDay: null as string | null,
  stats: {} as Record<string, LevelStats>,
  memories: {} as Record<string, Memory>,
  degreeStats: {} as Record<string, Record<number, DegreeStat>>,
  streakDays: 0,
  lastPracticeDay: null,
  totalSessions: 0,
  totalAnswers: 0,
  lastSession: null,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      completeOnboarding: () => set({ hasOnboarded: true }),

      recordAnswer: (courseId, levelId, correct, items) =>
        set((s) => {
          const key = statKey(courseId, levelId);
          const prev = s.stats[key] ?? emptyStats();
          const recent = [...prev.recent, correct].slice(-RECENT_CAP);

          const perItem = { ...(s.degreeStats[key] ?? {}) };
          for (const item of items) {
            const d = perItem[item] ?? emptyDegree();
            perItem[item] = {
              right: d.right + (correct ? 1 : 0),
              wrong: d.wrong + (correct ? 0 : 1),
              recent: [...d.recent, correct].slice(-DEGREE_RECENT_CAP),
            };
          }

          return {
            stats: {
              ...s.stats,
              [key]: {
                recent,
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1,
              },
            },
            degreeStats: { ...s.degreeStats, [key]: perItem },
            totalAnswers: s.totalAnswers + 1,
          };
        }),

      finishSession: (partial) => {
        const s = get();
        const course = getCourse(partial.courseId);
        const promoted = canPromote(
          s.stats[statKey(partial.courseId, partial.levelId)],
          partial.levelId,
          course?.levels.length ?? 0,
        );

        const today = dayKey();
        let streakDays = s.streakDays;
        if (s.lastPracticeDay !== today) {
          streakDays = s.lastPracticeDay === dayKey(-1) ? s.streakDays + 1 : 1;
        }

        const result: SessionResult = { ...partial, promoted, finishedAt: Date.now() };
        set({
          lastSession: result,
          lastCourse: partial.courseId,
          totalSessions: s.totalSessions + 1,
          streakDays,
          lastPracticeDay: today,
        });
        return result;
      },

      setLevel: (courseId, id) =>
        set((s) => {
          const max = getCourse(courseId)?.levels.length ?? 1;
          return {
            progress: { ...s.progress, [courseId]: Math.max(1, Math.min(max, id)) },
            lastCourse: courseId,
          };
        }),

      markLessonDone: (id) =>
        set((s) => ({
          lessonsDone: s.lessonsDone.includes(id) ? s.lessonsDone : [...s.lessonsDone, id],
          lastCourse: 'theory',
        })),

      setIntroOverride: (introOverride) => set({ introOverride }),
      setKeyMode: (keyMode) => set({ keyMode }),
      setKeyName: (keyName) => set({ keyName }),
      setLabelStyle: (labelStyle) => set({ labelStyle }),
      setTheme: (theme) => set({ theme }),
      setVocalRange: (vocalRange) => set({ vocalRange }),

      learnTapOffset: (measuredMs) =>
        set((s) => ({ tapOffsetMs: blendOffset(s.tapOffsetMs, measuredMs) })),

      markWarmedUp: () => set({ lastWarmUpAt: Date.now() }),

      /**
       * Singing time, reset each day. The nudges are about one session's
       * accumulated load, and yesterday's has no bearing on today's voice.
       */
      addSungTime: (ms) =>
        set((s) => {
          const today = dayKey();
          const base = s.sungDay === today ? s.sungMsToday : 0;
          return { sungMsToday: base + ms, sungDay: today };
        }),

      /**
       * Fold a round's result into what is retained. Called per course+level
       * rather than per answer: these drills ask several questions of the same
       * thing, and grading each separately would swing stability on noise.
       */
      recordRetention: (courseId, levelId, accuracy, responseMs) =>
        set((s) => {
          const key = statKey(courseId, levelId);
          const level = getCourse(courseId)?.levels.find((l) => l.id === levelId);
          return {
            memories: {
              ...s.memories,
              [key]: review(s.memories[key], accuracy, {
                correct: accuracy >= 0.75,
                responseMs,
                parMs: (level && parMsFor(level.kind)) ?? undefined,
              }),
            },
          };
        }),

      /**
       * Replace everything with a validated backup. A restore is a *replace*,
       * not a merge: merging two histories of the same drill would produce
       * accuracy figures that describe neither of them.
       */
      restore: (payload) =>
        set({
          ...payload,
          labelStyle: payload.labelStyle as LabelStyle,
          keyMode: payload.keyMode as KeyMode,
          introOverride: payload.introOverride as IntroMode | 'auto',
          theme: payload.theme as ThemeChoice,
          hasOnboarded: true,
        }),

      // The measured range and the tap offset survive a progress reset: they
      // describe the singer and their device, not their progress.
      resetProgress: () =>
        set({
          ...INITIAL,
          hasOnboarded: true,
          vocalRange: get().vocalRange,
          tapOffsetMs: get().tapOffsetMs,
          lastWarmUpAt: get().lastWarmUpAt,
        }),
    }),
    {
      name: 'noteworthy.v1',
      version: 3,
      migrate: (persisted, from) => {
        const state = persisted as Record<string, unknown>;

        // v1 kept mistakes as scale-step numbers; v2 uses semitone offsets.
        if (from < 2) {
          state.lastSession = null;
          state.degreeStats = {};
        }

        // v3 moved from a single global level to progress per course, and
        // re-keyed stats by `courseId:levelId`. Everything that existed was
        // Find the Note, so it all moves there and nothing is lost.
        if (from < 3) {
          const oldLevel = typeof state.level === 'number' ? state.level : 1;
          state.progress = { 'find-the-note': oldLevel };
          state.lastCourse = 'find-the-note';
          state.lessonsDone = [];
          delete state.level;

          const rekey = (bag: unknown) =>
            Object.fromEntries(
              Object.entries((bag ?? {}) as Record<string, unknown>).map(([k, v]) => [
                statKey('find-the-note', Number(k)),
                v,
              ]),
            );
          state.stats = rekey(state.stats);
          state.degreeStats = rekey(state.degreeStats);
          state.lastSession = null;
        }

        return state as unknown as State;
      },
    },
  ),
);

/** Current level for a course, defaulting to the first. */
export function levelFor(progress: Record<string, number>, courseId: string): number {
  return progress[courseId] ?? 1;
}

/**
 * Promotion needs a real sample of recent work, not one lucky round — and
 * the next level has to exist. Cross-session gating comes with the full
 * mastery model (docs/01-PEDAGOGY.md §6).
 */
export function canPromote(
  stats: LevelStats | undefined,
  levelId: number,
  levelCount: number,
): boolean {
  if (!stats || levelId >= levelCount) return false;
  if (stats.recent.length < PROMOTE_MIN_ITEMS) return false;
  return stats.recent.filter(Boolean).length / stats.recent.length >= PROMOTE_ACCURACY;
}

/** Recent accuracy at a level, or null when there isn't enough history yet. */
export function recentAccuracy(stats: LevelStats | undefined): number | null {
  if (!stats || stats.recent.length < 5) return null;
  return stats.recent.filter(Boolean).length / stats.recent.length;
}

/** Total answers given in a course, across every level. */
export function courseAnswers(stats: Record<string, LevelStats>, courseId: string): number {
  return Object.entries(stats)
    .filter(([k]) => k.startsWith(`${courseId}:`))
    .reduce((sum, [, v]) => sum + v.total, 0);
}

/**
 * Selection weights per item: the more you've been missing something lately,
 * the more often it comes up. Capped at 3.5× so a weak item doesn't crowd
 * out everything else, and floored at 1 so a strong one never disappears —
 * practising only your weak spots lets the strong ones quietly rot.
 */
export function degreeWeights(
  degreeStats: Record<number, DegreeStat> | undefined,
  items: Deg[],
): Map<Deg, number> {
  const weights = new Map<Deg, number>();
  for (const item of items) {
    const d = degreeStats?.[item];
    if (!d || d.recent.length < 3) {
      weights.set(item, 1.4);
      continue;
    }
    const missRate = d.recent.filter((r) => !r).length / d.recent.length;
    weights.set(item, Math.min(3.5, 1 + missRate * 3));
  }
  return weights;
}

export type DegreeReport = {
  deg: Deg;
  accuracy: number;
  attempts: number;
  trend: 'improving' | 'slipping' | 'steady';
};

export function weakestDegree(
  degreeStats: Record<number, DegreeStat> | undefined,
  minAttempts = 4,
): DegreeReport | null {
  if (!degreeStats) return null;
  let worst: DegreeReport | null = null;
  for (const [key, d] of Object.entries(degreeStats)) {
    const attempts = d.right + d.wrong;
    if (attempts < minAttempts) continue;
    const accuracy = d.right / attempts;
    if (!worst || accuracy < worst.accuracy) {
      worst = { deg: Number(key), accuracy, attempts, trend: trendOf(d) };
    }
  }
  return worst;
}

export function degreeReport(
  degreeStats: Record<number, DegreeStat> | undefined,
  deg: Deg,
): DegreeReport | null {
  const d = degreeStats?.[deg];
  if (!d) return null;
  const attempts = d.right + d.wrong;
  if (attempts === 0) return null;
  return { deg, accuracy: d.right / attempts, attempts, trend: trendOf(d) };
}

function trendOf(d: DegreeStat): DegreeReport['trend'] {
  if (d.recent.length < 8) return 'steady';
  const mid = Math.floor(d.recent.length / 2);
  const rate = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;
  const delta = rate(d.recent.slice(mid)) - rate(d.recent.slice(0, mid));
  if (delta >= 0.2) return 'improving';
  if (delta <= -0.2) return 'slipping';
  return 'steady';
}
