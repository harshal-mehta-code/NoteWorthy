import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LEVELS, PROMOTE_ACCURACY, PROMOTE_MIN_ITEMS, type IntroMode } from '@/core/levels';
import type { Deg } from '@/core/music';

export type LabelStyle = 'numbers' | 'solfege';
export type ThemeChoice = 'system' | 'dark' | 'light';
export type KeyMode = 'fixed' | 'random';

export type LevelStats = {
  /** Most recent results at this level, newest last. Capped. */
  recent: boolean[];
  correct: number;
  total: number;
};

/** Per-note history within a level, which is what the adaptation runs on. */
export type DegreeStat = { right: number; wrong: number; recent: boolean[] };

export type SessionResult = {
  levelId: number;
  correct: number;
  total: number;
  bestStreak: number;
  /** Degrees involved in this round's mistakes, most-missed first. */
  weakDegrees: Deg[];
  promoted: boolean;
  finishedAt: number;
};

type State = {
  hasOnboarded: boolean;
  level: number;
  /** 'auto' follows the level's own setting. */
  introOverride: IntroMode | 'auto';
  keyMode: KeyMode;
  keyName: string;
  labelStyle: LabelStyle;
  theme: ThemeChoice;

  stats: Record<number, LevelStats>;
  degreeStats: Record<number, Record<number, DegreeStat>>;
  streakDays: number;
  lastPracticeDay: string | null;
  totalSessions: number;
  totalAnswers: number;
  lastSession: SessionResult | null;

  completeOnboarding: () => void;
  recordAnswer: (levelId: number, correct: boolean, degrees: Deg[]) => void;
  finishSession: (result: Omit<SessionResult, 'promoted' | 'finishedAt'>) => SessionResult;
  setLevel: (id: number) => void;
  setIntroOverride: (m: IntroMode | 'auto') => void;
  setKeyMode: (m: KeyMode) => void;
  setKeyName: (n: string) => void;
  setLabelStyle: (s: LabelStyle) => void;
  setTheme: (t: ThemeChoice) => void;
  resetProgress: () => void;
};

const RECENT_CAP = 40;
const DEGREE_RECENT_CAP = 20;

function dayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyStats(): LevelStats {
  return { recent: [], correct: 0, total: 0 };
}

function emptyDegree(): DegreeStat {
  return { right: 0, wrong: 0, recent: [] };
}

const INITIAL = {
  hasOnboarded: false,
  level: 1,
  introOverride: 'auto' as const,
  keyMode: 'fixed' as const,
  keyName: 'C',
  labelStyle: 'numbers' as const,
  theme: 'system' as const,
  stats: {} as Record<number, LevelStats>,
  degreeStats: {} as Record<number, Record<number, DegreeStat>>,
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

      recordAnswer: (levelId, correct, degrees) =>
        set((s) => {
          const prev = s.stats[levelId] ?? emptyStats();
          const recent = [...prev.recent, correct].slice(-RECENT_CAP);

          const levelDegrees = { ...(s.degreeStats[levelId] ?? {}) };
          for (const deg of degrees) {
            const d = levelDegrees[deg] ?? emptyDegree();
            levelDegrees[deg] = {
              right: d.right + (correct ? 1 : 0),
              wrong: d.wrong + (correct ? 0 : 1),
              recent: [...d.recent, correct].slice(-DEGREE_RECENT_CAP),
            };
          }

          return {
            stats: {
              ...s.stats,
              [levelId]: {
                recent,
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1,
              },
            },
            degreeStats: { ...s.degreeStats, [levelId]: levelDegrees },
            totalAnswers: s.totalAnswers + 1,
          };
        }),

      finishSession: (partial) => {
        const s = get();
        const promoted = canPromote(s.stats[partial.levelId], partial.levelId);

        const today = dayKey();
        let streakDays = s.streakDays;
        if (s.lastPracticeDay !== today) {
          streakDays = s.lastPracticeDay === dayKey(-1) ? s.streakDays + 1 : 1;
        }

        const result: SessionResult = { ...partial, promoted, finishedAt: Date.now() };

        set({
          lastSession: result,
          totalSessions: s.totalSessions + 1,
          streakDays,
          lastPracticeDay: today,
        });

        return result;
      },

      setLevel: (id) => set({ level: Math.max(1, Math.min(LEVELS.length, id)) }),
      setIntroOverride: (introOverride) => set({ introOverride }),
      setKeyMode: (keyMode) => set({ keyMode }),
      setKeyName: (keyName) => set({ keyName }),
      setLabelStyle: (labelStyle) => set({ labelStyle }),
      setTheme: (theme) => set({ theme }),
      resetProgress: () => set({ ...INITIAL, hasOnboarded: true }),
    }),
    {
      name: 'noteworthy.v1',
      version: 2,
      migrate: (persisted, from) => {
        const state = persisted as Partial<State>;
        // v1 kept mistakes as scale-step numbers; v2 uses semitone offsets,
        // so the old summary would render nonsense labels. Progress at each
        // level is unaffected and stays.
        if (from < 2) {
          return { ...state, lastSession: null, degreeStats: {} };
        }
        return state;
      },
    },
  ),
);

/**
 * Promotion needs a real sample of recent work, not one lucky round — and
 * the next level has to exist. Cross-session gating comes with the full
 * mastery model (docs/01-PEDAGOGY.md §6).
 */
export function canPromote(stats: LevelStats | undefined, levelId: number): boolean {
  if (!stats || levelId >= LEVELS.length) return false;
  if (stats.recent.length < PROMOTE_MIN_ITEMS) return false;
  const hits = stats.recent.filter(Boolean).length;
  return hits / stats.recent.length >= PROMOTE_ACCURACY;
}

/** Recent accuracy at a level, or null when there isn't enough history yet. */
export function recentAccuracy(stats: LevelStats | undefined): number | null {
  if (!stats || stats.recent.length < 5) return null;
  return stats.recent.filter(Boolean).length / stats.recent.length;
}

/**
 * Selection weights per degree: the more you've been missing a note lately,
 * the more often it comes up. Capped at 3.5× so a weak note doesn't crowd
 * out everything else, and floored at 1 so a strong note never disappears —
 * practising only your weak spots lets the strong ones quietly rot.
 */
export function degreeWeights(
  degreeStats: Record<number, DegreeStat> | undefined,
  degrees: Deg[],
): Map<Deg, number> {
  const weights = new Map<Deg, number>();
  for (const deg of degrees) {
    const d = degreeStats?.[deg];
    if (!d || d.recent.length < 3) {
      // Unseen notes get a small nudge so new material surfaces early.
      weights.set(deg, 1.4);
      continue;
    }
    const missRate = d.recent.filter((r) => !r).length / d.recent.length;
    weights.set(deg, Math.min(3.5, 1 + missRate * 3));
  }
  return weights;
}

export type DegreeReport = {
  deg: Deg;
  accuracy: number;
  attempts: number;
  /** Recent half compared with the earlier half of the stored window. */
  trend: 'improving' | 'slipping' | 'steady';
};

/** The note you're worst at across every round at a level. */
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
  const before = d.recent.slice(0, mid);
  const after = d.recent.slice(mid);
  const rate = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;
  const delta = rate(after) - rate(before);
  if (delta >= 0.2) return 'improving';
  if (delta <= -0.2) return 'slipping';
  return 'steady';
}
