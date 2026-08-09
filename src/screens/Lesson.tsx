import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button, Card, IconButton, Label, Screen } from '@/components/ui';
import { Keyboard } from '@/components/Keyboard';
import { CircleOfFifths } from '@/components/CircleOfFifths';
import { tonicTriad } from '@/core/music';
import { LESSONS, getLesson, type Card as LessonCard } from '@/content/lessons';
import { useStore } from '@/store/useStore';
import { playNote, playSequence, unlockAudio } from '@/audio/engine';

/**
 * A theory lesson.
 *
 * One card per screen, never more than a few before a question, and every
 * concept attached to a keyboard you can actually play — a diagram of a half
 * step teaches far less than hearing one (docs/02-FEATURES.md §3.1).
 */
export default function Lesson() {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const lesson = getLesson(lessonId ?? '');
  const markLessonDone = useStore((s) => s.markLessonDone);
  const lessonsDone = useStore((s) => s.lessonsDone);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  // Play a card's example as it arrives, so the sound leads the reading.
  useEffect(() => {
    const card = lesson?.cards[step];
    if (!card || card.kind !== 'keys' || !card.play) return;
    const t = window.setTimeout(() => {
      void unlockAudio().then(() =>
        playSequence(card.play!, card.together ? 0 : 0.42, card.together ? 1.4 : 0.7, 0.24),
      );
    }, 380);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [lesson, step]);

  if (!lesson) return <Navigate to="/practice" replace />;

  const card = lesson.cards[step];
  const last = step === lesson.cards.length - 1;
  const answered = card.kind === 'question' && picked !== null;
  const canAdvance = card.kind !== 'question' || answered;

  function next() {
    if (last) {
      markLessonDone(lesson!.id);
      const remaining = LESSONS.filter(
        (l) => l.id !== lesson!.id && !lessonsDone.includes(l.id),
      );
      navigate(remaining.length ? '/practice' : '/practice', { replace: true });
      return;
    }
    setPicked(null);
    setStep((s) => s + 1);
  }

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-3 py-2">
        <IconButton label="Close lesson" onClick={() => navigate('/practice')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
        <div className="flex flex-1 gap-1">
          {lesson.cards.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>
      </header>

      <div className="py-3">
        <Label className="text-accent">{lesson.title}</Label>
      </div>

      <div key={step} className="anim-rise flex min-h-0 flex-1 flex-col justify-center gap-5 py-2">
        <CardBody card={card} picked={picked} onPick={setPicked} />
      </div>

      <div className="space-y-3 pb-2">
        <Button onClick={next} disabled={!canAdvance}>
          {last ? 'Finish' : canAdvance ? 'Next' : 'Pick an answer'}
        </Button>
        {last && (
          <p className="text-center text-[13px] leading-relaxed text-subtle">
            Next up: {lesson.nextUp}
          </p>
        )}
      </div>
    </Screen>
  );
}

function CardBody({
  card,
  picked,
  onPick,
}: {
  card: LessonCard;
  picked: number | null;
  onPick: (i: number) => void;
}) {
  if (card.kind === 'text') {
    return <p className="text-[17px] leading-relaxed text-muted">{rich(card.body)}</p>;
  }

  if (card.kind === 'keys') {
    return (
      <div className="space-y-4">
        <p className="text-[16px] leading-relaxed text-muted">{rich(card.body)}</p>
        <div className="rounded-2xl border border-line bg-surface p-3">
          <Keyboard
            low={57}
            high={84}
            highlight={card.highlight}
            labels={card.labels ?? 'none'}
            onPress={(m) => void unlockAudio().then(() => playNote(m, 0.01, 1.0, 0.28))}
          />
          {card.caption && (
            <p className="mt-2.5 text-center text-[12.5px] text-subtle">{card.caption}</p>
          )}
        </div>
        {card.play && (
          <button
            onClick={() =>
              void unlockAudio().then(() =>
                playSequence(card.play!, card.together ? 0 : 0.42, card.together ? 1.4 : 0.7, 0.24),
              )
            }
            className="mx-auto block text-[13px] text-subtle transition hover:text-ink"
          >
            Play it again
          </button>
        )}
      </div>
    );
  }

  if (card.kind === 'circle') {
    return (
      <div className="space-y-4">
        <p className="text-[16px] leading-relaxed text-muted">{rich(card.body)}</p>
        <div className="rounded-2xl border border-line bg-surface p-3">
          <CircleOfFifths
            onPick={(tonic) =>
              void unlockAudio().then(() => playSequence(tonicTriad(tonic), 0, 1.5, 0.22))
            }
          />
          {card.caption && (
            <p className="mt-2.5 text-center text-[12.5px] text-subtle">{card.caption}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[17px] leading-relaxed font-medium">{card.prompt}</p>
      <div className="space-y-2">
        {card.options.map((option, i) => {
          const isAnswer = i === card.answer;
          const isPicked = i === picked;
          const tone =
            picked === null
              ? 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
              : isAnswer
                ? 'border-correct bg-correct-wash text-correct'
                : isPicked
                  ? 'border-wrong bg-wrong-wash text-wrong'
                  : 'border-line bg-surface text-subtle';
          return (
            <button
              key={option}
              disabled={picked !== null}
              onClick={() => onPick(i)}
              className={`w-full rounded-xl border p-3.5 text-left text-[15px] font-medium transition ${tone}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <Card tone="cool">
          <p className="text-[14.5px] leading-relaxed">{card.because}</p>
        </Card>
      )}
    </div>
  );
}

/** Minimal **bold** support, so lesson copy can emphasise without markdown. */
function rich(body: string) {
  return body.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
