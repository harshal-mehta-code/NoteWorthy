import { useNavigate } from 'react-router';
import { Button, Card, Label, Screen } from '@/components/ui';
import { COURSES, getCourse, statKey, PILLAR_LABEL } from '@/core/courses';
import { suggestedNext } from '@/core/mapLayout';
import { findLevel } from '@/core/levels';
import { LESSONS } from '@/content/lessons';
import { courseAnswers, levelFor, recentAccuracy, useStore } from '@/store/useStore';
import { WARMUP_LENGTH, warmupCourses } from '@/core/warmup';
import { unlockAudio } from '@/audio/engine';

/**
 * Today.
 *
 * One obvious action, and a short row of everything else you could do. The
 * previous version offered exactly one course with no hint that others
 * existed, which made a four-pillar app read as a single drill.
 */
export default function Home() {
  const navigate = useNavigate();
  const progress = useStore((s) => s.progress);
  const stats = useStore((s) => s.stats);
  const lastCourse = useStore((s) => s.lastCourse);
  const lessonsDone = useStore((s) => s.lessonsDone);
  const streakDays = useStore((s) => s.streakDays);
  const totalSessions = useStore((s) => s.totalSessions);

  const course = getCourse(lastCourse) ?? COURSES[0];
  const level = levelFor(progress, course.id);
  const config = course.levels.length ? findLevel(course.levels, level) : null;
  const accuracy = recentAccuracy(stats[statKey(course.id, level)]);

  const nextLesson = LESSONS.find((l) => !lessonsDone.includes(l.id));

  async function start() {
    if (course.id === 'theory') {
      navigate('/learn');
      return;
    }
    await unlockAudio();
    navigate(`/practice/${course.id}`);
  }

  // The warm-up only means anything once there are at least two courses to
  // mix. Before that it would be a normal round wearing a different hat.
  const touched = warmupCourses().filter((c) => courseAnswers(stats, c.id) > 0);
  const warmupReady = touched.length >= 2;

  // A short list, not the whole library — that's what the Practice tab is
  // for, and eight names under one big button is the wall of options this
  // screen was redesigned to get rid of.
  const others = suggestedNext(progress, lessonsDone.length, course.id);

  return (
    <Screen className="pad-top">
      <header className="flex items-center justify-between py-2">
        <span className="text-[15px] font-bold tracking-tight">NoteWorthy</span>
        {streakDays > 0 && (
          <span className="label text-subtle">
            {streakDays} {streakDays === 1 ? 'day' : 'days'} in a row
          </span>
        )}
      </header>

      {warmupReady && (
        <button
          onClick={async () => {
            await unlockAudio();
            navigate('/warmup');
          }}
          className="mt-3 w-full rounded-2xl border border-accent-dim bg-accent-wash p-4 text-left transition hover:border-accent"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[17px] font-bold tracking-tight text-accent">Daily Warm-Up</span>
            <span className="label shrink-0 text-accent">{WARMUP_LENGTH} questions</span>
          </div>
          <p className="mt-1.5 text-[13.5px] leading-snug text-muted">
            A mix from every course you've started, including a few from levels you've already
            passed. Different every day.
          </p>
        </button>
      )}

      <div className="flex flex-1 flex-col justify-center py-6">
        <Label className="text-accent">
          {totalSessions === 0 ? 'Start here' : warmupReady ? 'Or continue' : 'Continue'} ·{' '}
          {PILLAR_LABEL[course.pillar]}
        </Label>
        <h1 className="mt-3 text-[34px] leading-[1.05] font-bold tracking-[-0.04em] text-balance">
          {course.id === 'theory' ? (nextLesson?.title ?? 'Foundations') : config?.name}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          {course.id === 'theory' ? (nextLesson?.blurb ?? course.blurb) : config?.blurb}
        </p>

        {accuracy !== null && (
          <p className="mt-5 font-mono text-xs text-subtle">
            {course.name} · level {level} · {Math.round(accuracy * 100)}% lately
          </p>
        )}

        {totalSessions === 0 && (
          <Card tone="accent" className="mt-6">
            <p className="text-[15px] leading-relaxed">
              A round is under a minute. There's no timer and no way to fail — and there's a lot
              more than this one drill, all of it under Practice.
            </p>
          </Card>
        )}

        <div className="mt-6">
          <Button onClick={start}>
            {totalSessions === 0 ? 'Start your first round' : 'Continue'}
          </Button>
        </div>
      </div>

      <div className="pb-6">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <Label>Or something else</Label>
          <button
            onClick={() => navigate('/practice')}
            className="label shrink-0 text-subtle transition hover:text-ink"
          >
            See all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {others.map((c) => (
            <button
              key={c.id}
              onClick={async () => {
                if (c.id === 'theory') {
                  navigate('/learn');
                  return;
                }
                await unlockAudio();
                navigate(`/practice/${c.id}`);
              }}
              className="rounded-xl border border-line bg-surface p-3 text-left transition hover:border-line-strong hover:bg-surface-2"
            >
              <span className="block text-[14px] font-semibold">{c.name}</span>
              <span className="label mt-0.5 block text-subtle">{PILLAR_LABEL[c.pillar]}</span>
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}
