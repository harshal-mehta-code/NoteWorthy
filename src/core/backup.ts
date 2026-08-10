/**
 * Backup and restore.
 *
 * Everything lives in this browser and there is no account, which is a
 * deliberate choice — but it means clearing site data, switching browsers, or
 * a PWA eviction takes months of practice with it. A file you can keep is the
 * whole mitigation, and it has to exist before anyone has enough progress to
 * mourn (docs/04-ARCHITECTURE.md, WP-07).
 *
 * Restore treats the file as untrusted. It is a file the user picked from
 * their disk, it may be the wrong file, a truncated download, or from a
 * future version — so every field is checked and anything unrecognised is
 * dropped rather than written into the store.
 */

import type { DegreeStat, LevelStats, SessionResult } from '@/store/useStore';
import type { VocalRange } from './range';

export const BACKUP_FORMAT = 1;

/** The parts of the store worth keeping. Derived values are left out. */
export type BackupPayload = {
  progress: Record<string, number>;
  lastCourse: string;
  lessonsDone: string[];
  labelStyle: string;
  keyMode: string;
  keyName: string;
  introOverride: string;
  theme: string;
  vocalRange: VocalRange | null;
  tapOffsetMs: number | null;
  stats: Record<string, LevelStats>;
  degreeStats: Record<string, Record<number, DegreeStat>>;
  streakDays: number;
  lastPracticeDay: string | null;
  totalSessions: number;
  totalAnswers: number;
  lastSession: SessionResult | null;
};

export type BackupFile = {
  app: 'noteworthy';
  format: number;
  exportedAt: string;
  payload: BackupPayload;
};

export function buildBackup(payload: BackupPayload): BackupFile {
  return {
    app: 'noteworthy',
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    payload,
  };
}

/** `noteworthy-backup-2026-08-09.json` — sorts chronologically in a folder. */
export function backupFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `noteworthy-backup-${day}.json`;
}

export type RestoreResult =
  | { ok: true; payload: BackupPayload; summary: string }
  | { ok: false; error: string };

const LABEL_STYLES = ['numbers', 'solfege'];
const KEY_MODES = ['fixed', 'random'];
const INTROS = ['auto', 'full', 'short', 'home', 'none'];
const THEMES = ['system', 'dark', 'light'];

/**
 * Parse and validate a backup file.
 *
 * Every message here has to be usable by someone who just picked the wrong
 * file in a file dialog, so they say what was wrong rather than "invalid".
 */
export function parseBackup(text: string): RestoreResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON — it may be damaged or incomplete." };
  }

  if (!isRecord(raw)) return { ok: false, error: "That file doesn't contain a backup." };
  if (raw.app !== 'noteworthy') {
    return { ok: false, error: "That's a JSON file, but not a NoteWorthy backup." };
  }
  if (typeof raw.format !== 'number' || raw.format > BACKUP_FORMAT) {
    return {
      ok: false,
      error: 'That backup was made by a newer version of NoteWorthy than this one.',
    };
  }
  if (!isRecord(raw.payload)) return { ok: false, error: 'That backup is missing its contents.' };

  const p = raw.payload;
  const stats = cleanStats(p.stats);
  const progress = cleanProgress(p.progress);

  const payload: BackupPayload = {
    progress,
    lastCourse: typeof p.lastCourse === 'string' ? p.lastCourse : 'find-the-note',
    lessonsDone: Array.isArray(p.lessonsDone) ? p.lessonsDone.filter((x) => typeof x === 'string') : [],
    labelStyle: pick(p.labelStyle, LABEL_STYLES, 'numbers'),
    keyMode: pick(p.keyMode, KEY_MODES, 'fixed'),
    keyName: typeof p.keyName === 'string' ? p.keyName : 'C',
    introOverride: pick(p.introOverride, INTROS, 'auto'),
    theme: pick(p.theme, THEMES, 'system'),
    vocalRange: cleanRange(p.vocalRange),
    tapOffsetMs: cleanOffset(p.tapOffsetMs),
    stats,
    degreeStats: cleanDegreeStats(p.degreeStats),
    streakDays: count(p.streakDays),
    lastPracticeDay: typeof p.lastPracticeDay === 'string' ? p.lastPracticeDay : null,
    totalSessions: count(p.totalSessions),
    totalAnswers: count(p.totalAnswers),
    // Deliberately dropped: it drives the summary screen, and restoring a
    // stale round would send someone straight to a summary of a session they
    // finished weeks ago.
    lastSession: null,
  };

  const courses = Object.keys(progress).length;
  const answers = payload.totalAnswers;
  return {
    ok: true,
    payload,
    summary:
      courses === 0 && answers === 0
        ? 'That backup has no progress in it yet.'
        : `${answers} ${answers === 1 ? 'question' : 'questions'} across ${courses} ${
            courses === 1 ? 'course' : 'courses'
          }, ${payload.totalSessions} ${payload.totalSessions === 1 ? 'round' : 'rounds'}.`,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pick(value: unknown, allowed: string[], fallback: string): string {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

/** A non-negative integer, however mangled the input. */
function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function cleanProgress(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [courseId, level] of Object.entries(value)) {
    if (typeof level !== 'number' || !Number.isFinite(level)) continue;
    // Clamped low; the high end is clamped by setLevel against the real
    // course, which knows how many levels it has.
    out[courseId] = Math.max(1, Math.floor(level));
  }
  return out;
}

function cleanBools(value: unknown): boolean[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === 'boolean') : [];
}

function cleanStats(value: unknown): Record<string, LevelStats> {
  if (!isRecord(value)) return {};
  const out: Record<string, LevelStats> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const recent = cleanBools(entry.recent);
    const total = count(entry.total);
    // A correct count above the total would make accuracy exceed 100%.
    out[key] = { recent, correct: Math.min(count(entry.correct), total), total };
  }
  return out;
}

function cleanDegreeStats(value: unknown): Record<string, Record<number, DegreeStat>> {
  if (!isRecord(value)) return {};
  const out: Record<string, Record<number, DegreeStat>> = {};
  for (const [key, perItem] of Object.entries(value)) {
    if (!isRecord(perItem)) continue;
    const cleaned: Record<number, DegreeStat> = {};
    for (const [item, stat] of Object.entries(perItem)) {
      const n = Number(item);
      if (!Number.isInteger(n) || !isRecord(stat)) continue;
      cleaned[n] = {
        right: count(stat.right),
        wrong: count(stat.wrong),
        recent: cleanBools(stat.recent),
      };
    }
    out[key] = cleaned;
  }
  return out;
}

/** A lag beyond this is a wild attempt, not a device. */
function cleanOffset(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(-400, Math.min(400, Math.round(value)));
}

function cleanRange(value: unknown): VocalRange | null {
  if (!isRecord(value)) return null;
  const { low, high } = value;
  if (typeof low !== 'number' || typeof high !== 'number') return null;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return { low: Math.min(low, high), high: Math.max(low, high) };
}
