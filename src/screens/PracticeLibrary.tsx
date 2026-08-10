import { useNavigate } from 'react-router';
import { Label, Screen } from '@/components/ui';
import {
  PILLARS,
  PILLAR_BLURB,
  PILLAR_LABEL,
  coursesFor,
  type Course,
  type Pillar,
} from '@/core/courses';
import { LESSONS } from '@/content/lessons';
import { courseAnswers, levelFor, recentAccuracy, useStore } from '@/store/useStore';
import { statKey } from '@/core/courses';
import { unlockAudio } from '@/audio/engine';

const PILLAR_ACCENT: Record<Pillar, string> = {
  ear: 'text-[#c77dff]',
  reading: 'text-cool',
  theory: 'text-accent',
  voice: 'text-[#ff9e6b]',
};

/**
 * The map of the app.
 *
 * Everything lives here, including the courses that aren't built — a planned
 * card with an honest note is far better than a user concluding the app only
 * does one thing, which is exactly what happened when this screen didn't
 * exist.
 */
export default function PracticeLibrary() {
  const navigate = useNavigate();
  const progress = useStore((s) => s.progress);
  const stats = useStore((s) => s.stats);
  const lessonsDone = useStore((s) => s.lessonsDone);

  async function open(course: Course) {
    if (course.status !== 'ready') return;
    if (course.id === 'theory') {
      navigate('/learn');
      return;
    }
    await unlockAudio();
    navigate(`/practice/${course.id}`);
  }

  return (
    <Screen className="pad-top">
      <header className="py-2">
        <h1 className="text-[26px] font-bold tracking-[-0.035em]">Practice</h1>
        <p className="mt-1 text-[15px] text-muted">
          Four skills, trained separately, that turn into one.
        </p>
      </header>

      <div className="space-y-8 py-6">
        {PILLARS.map((pillar) => (
          <section key={pillar}>
            <Label className={PILLAR_ACCENT[pillar]}>{PILLAR_LABEL[pillar]}</Label>
            <p className="mt-1 mb-3 text-[13px] text-subtle">{PILLAR_BLURB[pillar]}</p>

            <div className="space-y-2">
              {coursesFor(pillar).map((course) => {
                const ready = course.status === 'ready';
                const level = levelFor(progress, course.id);
                const answers = courseAnswers(stats, course.id);
                const acc = recentAccuracy(stats[statKey(course.id, level)]);
                const doneLessons = LESSONS.filter((l) => lessonsDone.includes(l.id)).length;

                return (
                  <button
                    key={course.id}
                    onClick={() => open(course)}
                    disabled={!ready}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      ready
                        ? 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
                        : 'border-line/60 border-dashed bg-transparent'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className={`text-[16px] font-bold tracking-tight ${
                          ready ? 'text-ink' : 'text-subtle'
                        }`}
                      >
                        {course.name}
                      </span>
                      {ready ? (
                        <span className="tnum shrink-0 font-mono text-[11px] text-subtle">
                          {course.lessons
                            ? `${doneLessons}/${course.lessons} lessons`
                            : `Level ${level}/${course.levels.length}`}
                        </span>
                      ) : (
                        <span className="label shrink-0 text-subtle">Planned</span>
                      )}
                    </div>

                    <p
                      className={`mt-1.5 text-[13.5px] leading-snug ${
                        ready ? 'text-muted' : 'text-subtle'
                      }`}
                    >
                      {course.blurb}
                    </p>

                    {course.planNote && (
                      <p className="mt-2 text-[12.5px] leading-snug text-subtle italic">
                        {course.planNote}
                      </p>
                    )}

                    {ready && answers > 0 && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{
                              width: `${
                                course.lessons
                                  ? (doneLessons / course.lessons) * 100
                                  : (level / course.levels.length) * 100
                              }%`,
                            }}
                          />
                        </div>
                        {acc !== null && (
                          <span className="tnum font-mono text-[11px] text-subtle">
                            {Math.round(acc * 100)}%
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="pb-6 text-center text-[13px] leading-relaxed text-subtle">
        Planned courses aren't hidden on purpose — this is the whole shape of the app, so you can
        see where it's going.
      </p>
    </Screen>
  );
}
