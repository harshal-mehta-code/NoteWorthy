import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, backupFilename, buildBackup, parseBackup, type BackupPayload } from './backup';

const FULL: BackupPayload = {
  progress: { 'find-the-note': 6, intervals: 3 },
  lastCourse: 'intervals',
  lessonsDone: ['keyboard', 'steps'],
  labelStyle: 'solfege',
  keyMode: 'random',
  keyName: 'G',
  introOverride: 'short',
  theme: 'dark',
  vocalRange: { low: 45, high: 69 },
  tapOffsetMs: 85,
  stats: { 'find-the-note:6': { recent: [true, false, true], correct: 12, total: 15 } },
  degreeStats: { 'find-the-note:6': { 7: { right: 8, wrong: 2, recent: [true, true] } } },
  streakDays: 5,
  lastPracticeDay: '2026-08-09',
  totalSessions: 22,
  totalAnswers: 260,
  lastSession: null,
};

const round = (payload: BackupPayload) => parseBackup(JSON.stringify(buildBackup(payload)));

describe('a backup round trip', () => {
  it('comes back with everything intact', () => {
    const result = round(FULL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual(FULL);
  });

  it('records the app, format and time it was made', () => {
    const file = buildBackup(FULL);
    expect(file.app).toBe('noteworthy');
    expect(file.format).toBe(BACKUP_FORMAT);
    expect(Number.isNaN(Date.parse(file.exportedAt))).toBe(false);
  });

  it('summarises what is in it, so you know before you overwrite anything', () => {
    const result = round(FULL);
    expect(result.ok && result.summary).toContain('260 questions');
    expect(result.ok && result.summary).toContain('2 courses');
    expect(result.ok && result.summary).toContain('22 rounds');
  });

  it('says so plainly when there is no progress in it', () => {
    const empty = { ...FULL, progress: {}, totalAnswers: 0, totalSessions: 0 };
    const result = round(empty);
    expect(result.ok && result.summary).toBe('That backup has no progress in it yet.');
  });

  it('names the file by date so a folder of them sorts chronologically', () => {
    expect(backupFilename(new Date(2026, 7, 9))).toBe('noteworthy-backup-2026-08-09.json');
    expect(backupFilename(new Date(2026, 11, 25))).toBe('noteworthy-backup-2026-12-25.json');
  });
});

describe('rejecting files that are not backups', () => {
  it('rejects text that is not JSON', () => {
    const r = parseBackup('this is not json {');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/valid JSON/);
  });

  it('rejects JSON that is not an object', () => {
    expect(parseBackup('[1,2,3]').ok).toBe(false);
    expect(parseBackup('"hello"').ok).toBe(false);
    expect(parseBackup('null').ok).toBe(false);
  });

  it('rejects another app’s JSON, and says which problem it is', () => {
    const r = parseBackup(JSON.stringify({ app: 'something-else', format: 1, payload: {} }));
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/not a NoteWorthy backup/);
  });

  it('rejects a backup from a newer version rather than mangling it', () => {
    const r = parseBackup(
      JSON.stringify({ app: 'noteworthy', format: BACKUP_FORMAT + 1, payload: {} }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/newer version/);
  });

  it('rejects a file with no contents', () => {
    const r = parseBackup(JSON.stringify({ app: 'noteworthy', format: 1 }));
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/missing its contents/);
  });
});

describe('cleaning a damaged or hostile payload', () => {
  const parse = (payload: unknown) =>
    parseBackup(JSON.stringify({ app: 'noteworthy', format: 1, payload }));

  it('accepts a payload with nothing in it, falling back to defaults', () => {
    const r = parse({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.progress).toEqual({});
    expect(r.payload.labelStyle).toBe('numbers');
    expect(r.payload.theme).toBe('system');
    expect(r.payload.lastCourse).toBe('find-the-note');
    expect(r.payload.vocalRange).toBeNull();
    expect(r.payload.tapOffsetMs).toBeNull();
  });

  it('clamps a stored tap lag to something a device could plausibly have', () => {
    const offset = (value: unknown) => {
      const r = parse({ tapOffsetMs: value });
      return r.ok ? r.payload.tapOffsetMs : 'rejected';
    };
    expect(offset(9000)).toBe(400);
    expect(offset(-9000)).toBe(-400);
    expect(offset(85)).toBe(85);
    expect(offset('slow')).toBeNull();
  });

  it('drops settings values it does not recognise', () => {
    const r = parse({ labelStyle: 'hieroglyphs', theme: 'neon', keyMode: 'sideways' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.labelStyle).toBe('numbers');
    expect(r.payload.theme).toBe('system');
    expect(r.payload.keyMode).toBe('fixed');
  });

  it('never restores a level below 1', () => {
    const r = parse({ progress: { intervals: 0, 'find-the-note': -5, chords: 2.7 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.progress).toEqual({ intervals: 1, 'find-the-note': 1, chords: 2 });
  });

  it('drops progress entries that are not numbers', () => {
    const r = parse({ progress: { a: 'three', b: null, c: 4 } });
    expect(r.ok && r.payload.progress).toEqual({ c: 4 });
  });

  it('never lets correct exceed total, which would put accuracy over 100%', () => {
    const r = parse({ stats: { 'x:1': { recent: [true], correct: 99, total: 10 } } });
    expect(r.ok && r.payload.stats['x:1']).toEqual({ recent: [true], correct: 10, total: 10 });
  });

  it('strips non-booleans out of a recent-results list', () => {
    const r = parse({ stats: { 'x:1': { recent: [true, 'yes', null, false], correct: 1, total: 2 } } });
    expect(r.ok && r.payload.stats['x:1'].recent).toEqual([true, false]);
  });

  it('turns negative, infinite and missing counters into zero', () => {
    const r = parse({ totalAnswers: -40, totalSessions: 'lots', streakDays: null });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.totalAnswers).toBe(0);
    expect(r.payload.totalSessions).toBe(0);
    expect(r.payload.streakDays).toBe(0);
  });

  it('drops per-item stats that are not keyed by a number', () => {
    const r = parse({
      degreeStats: { 'x:1': { 7: { right: 3, wrong: 1, recent: [] }, oops: { right: 1 } } },
    });
    expect(r.ok && Object.keys(r.payload.degreeStats['x:1'])).toEqual(['7']);
  });

  it('orders a vocal range correctly however it was stored', () => {
    const r = parse({ vocalRange: { low: 70, high: 45 } });
    expect(r.ok && r.payload.vocalRange).toEqual({ low: 45, high: 70 });
  });

  it('drops a vocal range that is not two numbers', () => {
    expect(parse({ vocalRange: { low: 'E2', high: 69 } }).ok).toBe(true);
    const r = parse({ vocalRange: { low: 'E2', high: 69 } });
    expect(r.ok && r.payload.vocalRange).toBeNull();
  });

  it('never restores the last session, which would reopen a stale summary', () => {
    const r = parse({
      lastSession: { courseId: 'intervals', levelId: 2, correct: 4, total: 5, weakDegrees: [] },
    });
    expect(r.ok && r.payload.lastSession).toBeNull();
  });

  it('drops non-string lesson ids', () => {
    const r = parse({ lessonsDone: ['keyboard', 7, null, 'steps'] });
    expect(r.ok && r.payload.lessonsDone).toEqual(['keyboard', 'steps']);
  });

  it('survives every field being the wrong type', () => {
    const r = parse({
      progress: 'nope',
      lessonsDone: 42,
      stats: [],
      degreeStats: 'x',
      vocalRange: [],
      lastPracticeDay: 99,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.progress).toEqual({});
    expect(r.payload.lessonsDone).toEqual([]);
    expect(r.payload.stats).toEqual({});
    expect(r.payload.degreeStats).toEqual({});
    expect(r.payload.vocalRange).toBeNull();
    expect(r.payload.lastPracticeDay).toBeNull();
  });
});
