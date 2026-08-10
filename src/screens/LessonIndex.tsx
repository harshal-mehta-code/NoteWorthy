import { useNavigate } from 'react-router';
import { IconButton, Screen } from '@/components/ui';
import { LESSONS } from '@/content/lessons';
import { useStore } from '@/store/useStore';

/**
 * Every lesson, browsable.
 *
 * Until now the theory course only ever opened the next unread lesson, which
 * makes it a queue rather than a reference — you could not go back and check
 * what a half note was without reading everything after it. That also blocked
 * the linkage rule (docs/02-FEATURES.md §3.3), which needs drills to be able
 * to point *at* a specific concept.
 *
 * This is the reference wiki in its honest first form: a list, in order, with
 * what you've read marked, and every entry openable directly. Search arrives
 * when there are enough lessons to need it — fourteen fit on two screens.
 */
export default function LessonIndex() {
  const navigate = useNavigate();
  const lessonsDone = useStore((s) => s.lessonsDone);

  const nextUnread = LESSONS.find((l) => !lessonsDone.includes(l.id));
  const done = LESSONS.filter((l) => lessonsDone.includes(l.id)).length;

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-4 py-2">
        <IconButton label="Back" onClick={() => navigate('/practice')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path
              d="M9.5 2.5L4 7.5l5.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        <h1 className="text-[15px] font-bold tracking-tight">Foundations</h1>
      </header>

      <div className="py-5">
        <p className="text-[15px] leading-relaxed text-muted">
          Short lessons, each with something you can play. Read them in order or dip in — every one
          stands on its own, and they stay here as a reference.
        </p>
        <p className="tnum mt-2.5 font-mono text-xs text-subtle">
          {done} of {LESSONS.length} read
        </p>
      </div>

      <div className="space-y-2 pb-6">
        {LESSONS.map((lesson) => {
          const read = lessonsDone.includes(lesson.id);
          const isNext = lesson.id === nextUnread?.id;
          return (
            <button
              key={lesson.id}
              onClick={() => navigate(`/learn/${lesson.id}`)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                isNext
                  ? 'border-accent-dim bg-accent-wash hover:border-accent'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`text-[15px] font-semibold ${isNext ? 'text-accent' : read ? 'text-muted' : ''}`}
                >
                  {lesson.title}
                </span>
                <span className="label shrink-0 text-subtle">
                  {isNext ? 'next' : read ? 'read' : `${lesson.minutes} min`}
                </span>
              </div>
              <p className="mt-1 text-[13.5px] leading-snug text-subtle">{lesson.blurb}</p>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
