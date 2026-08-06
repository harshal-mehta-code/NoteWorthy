import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LEVELS, PROMOTE_ACCURACY, PROMOTE_MIN_ITEMS, type IntroMode } from '@/core/levels';

export type LabelStyle = 'numbers' | 'solfege';
export type ThemeChoice = 'system' | 'dark' | 'light';
export type KeyMode = 'fixed' | 'random';

export type LevelStats = {
  /** Most recent results at this level, newest last. Capped. */
  recent: boolean[];
  correct: number;
  total: number;
};

export type SessionResult = {
  levelId: number;
  correct: number;
  total: number;
  bestStreak: number;
  /** Steps missed in this session, most-missed first. */
  weakSteps: number[];
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
  streakDays: number;
  lastPracticeDay: string | null;
  totalSessions: number;
  totalAnswers: number;
  lastSession: SessionResult | null;

  completeOnboarding: () => void;
  recordAnswer: (levelId: number, correct: boolean) => void;
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

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyStats(): LevelStats {
  return { recent: [], correct: 0, total: 0 };
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

      recordAnswer: (levelId, correct) =>
        set((s) => {
          const prev = s.stats[levelId] ?? emptyStats();
          const recent = [...prev.recent, correct].slice(-RECENT_CAP);
          return {
            stats: {
              ...s.stats,
              [levelId]: {
                recent,
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1,
              },
            },
            totalAnswers: s.totalAnswers + 1,
          };
        }),

      finishSession: (partial) => {
        const s = get();
        const promoted = canPromote(s.stats[partial.levelId], partial.levelId);

        const day = today();
        let streakDays = s.streakDays;
        if (s.lastPracticeDay !== day) {
          streakDays = s.lastPracticeDay === yesterday() ? s.streakDays + 1 : 1;
        }

        const result: SessionResult = { ...partial, promoted, finishedAt: Date.now() };

        set({
          lastSession: result,
          totalSessions: s.totalSessions + 1,
          streakDays,
          lastPracticeDay: day,
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
      version: 1,
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
