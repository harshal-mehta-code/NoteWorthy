import { useNavigate } from 'react-router';
import { Card, Label, Screen } from '@/components/ui';
import {
  PILLARS,
  PILLAR_LABEL,
  coursesFor,
  statKey,
  type Pillar,
} from '@/core/courses';
import { LESSONS } from '@/content/lessons';
import {
  courseAnswers,
  levelFor,
  recentAccuracy,
  useStore,
  type LevelStats,
} from '@/store/useStore';

/**
 * Where you stand, in one screen.
 *
 * Not the Musicianship Map from the vision doc — that needs a lot more
 * material to be worth drawing. This is the honest version: how much of each
 * pillar you've touched, and how it's going.
 */
export default function You() {
  const navigate = useNavigate();
  const progress = useStore((s) => s.progress);
  const stats = useStore((s) => s.stats);
  const lessonsDone = useStore((s) => s.lessonsDone);
  const streakDays = useStore((s) => s.streakDays);
  const totalSessions = useStore((s) => s.totalSessions);
  const totalAnswers = useStore((s) => s.totalAnswers);

  return (
    <Screen className="pad-top">
      <header className="flex items-center justify-between py-2">
        <h1 className="text-[26px] font-bold tracking-[-0.035em]">You</h1>
        <button
          onClick={() => navigate('/settings')}
          className="label text-subtle transition hover:text-ink"
        >
          Settings
        </button>
      </header>

      <div className="space-y-6 py-6">
        <Card>
          <div className="flex">
            <Stat value={String(streakDays)} label="day streak" />
            <Stat value={String(totalSessions)} label="rounds" bordered />
            <Stat value={String(totalAnswers)} label="answers" />
          </div>
        </Card>

        <div>
          <Label className="mb-3">Across the four pillars</Label>
          <div className="space-y-3">
            {PILLARS.map((pillar) => (
              <PillarRow
                key={pillar}
                pillar={pillar}
                progress={progress}
                stats={stats}
                lessonsDone={lessonsDone}
              />
            ))}
          </div>
        </div>

        {totalAnswers === 0 && (
          <Card tone="accent">
            <p className="text-[15px] leading-relaxed">
              Nothing here yet. Everything on this screen fills in as you practise — there's no
              setup and nothing to configure first.
            </p>
          </Card>
        )}

        <p className="pb-4 text-[13px] leading-relaxed text-subtle">
          All of this lives on this device only. No account, and nothing leaves your browser.
        </p>
      </div>
    </Screen>
  );
}

function Stat({ value, label, bordered }: { value: string; label: string; bordered?: boolean }) {
  return (
    <div
      className={`flex-1 text-center ${bordered ? 'border-x border-line' : ''}`}
    >
      <div className="tnum font-mono text-[24px] leading-none font-bold">{value}</div>
      <div className="label mt-1.5 text-subtle">{label}</div>
    </div>
  );
}

function PillarRow({
  pillar,
  progress,
  stats,
  lessonsDone,
}: {
  pillar: Pillar;
  progress: Record<string, number>;
  stats: Record<string, LevelStats>;
  lessonsDone: string[];
}) {
  const courses = coursesFor(pillar).filter((c) => c.status === 'ready');
  const planned = coursesFor(pillar).length - courses.length;

  const answers = courses.reduce((sum, c) => sum + courseAnswers(stats, c.id), 0);
  const done = LESSONS.filter((l) => lessonsDone.includes(l.id)).length;

  // Progress through a pillar is how far up its ladders you are — a level
  // reached is worth more than an answer given, since answers say nothing
  // about difficulty.
  const reached = courses.reduce((sum, c) => {
    if (c.lessons) return sum + done / c.lessons;
    return sum + (levelFor(progress, c.id) - 1) / Math.max(1, c.levels.length - 1);
  }, 0);
  const share = courses.length ? Math.min(1, reached / courses.length) : 0;

  const best = courses
    .map((c) => recentAccuracy(stats[statKey(c.id, levelFor(progress, c.id))]))
    .filter((a): a is number => a !== null);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">{PILLAR_LABEL[pillar]}</span>
        <span className="tnum shrink-0 font-mono text-[11px] text-subtle">
          {answers === 0 && done === 0 ? 'not started' : `${answers} answered`}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${Math.max(share * 100, share > 0 ? 4 : 0)}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-subtle">
        <span>
          {courses.length === 0
            ? // Voice has no course of its own yet, but it is not unreachable —
              // saying "0 courses" would be true and useless.
              'Reached through Find the Note, stage 4'
            : `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}${
                planned > 0 ? `, ${planned} planned` : ''
              }`}
        </span>
        {best.length > 0 && (
          <span className="tnum font-mono">
            {Math.round(Math.max(...best) * 100)}% at your current level
          </span>
        )}
      </div>
    </div>
  );
}
