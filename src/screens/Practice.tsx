import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dots, IconButton, Screen, Sheet } from '@/components/ui';
import { INTRO_HELP, INTRO_LABEL, getLevel } from '@/core/levels';
import type { IntroMode } from '@/core/levels';
import { KEYS, pickRandom, stepToMidi } from '@/core/music';
import { columnsFor, generate, stepForOption, type Question } from '@/core/question';
import { useStore } from '@/store/useStore';
import {
  now,
  playAgainstHome,
  playComparison,
  playCorrect,
  playCorrectSimple,
  playKeyIntro,
  playSequence,
  playSessionEnd,
  playTapTick,
  startDrone,
  stopDrone,
  unlockAudio,
} from '@/audio/engine';

type Phase = 'intro' | 'playing' | 'question' | 'correct' | 'wrong';

const HOLD_CORRECT_MS = 1250;
const HOLD_WRONG_MS = 3200;
/** Gap between notes when a question plays more than one. */
const SEQUENCE_GAP = 0.95;

export default function Practice() {
  const navigate = useNavigate();
  const level = useStore((s) => s.level);
  const keyMode = useStore((s) => s.keyMode);
  const keyName = useStore((s) => s.keyName);
  const labelStyle = useStore((s) => s.labelStyle);
  const introOverride = useStore((s) => s.introOverride);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const finishSession = useStore((s) => s.finishSession);

  const config = getLevel(level);

  /** Key is fixed for the whole round — changing it mid-round would be cruel. */
  const tonic = useMemo(
    () =>
      keyMode === 'random' ? pickRandom(KEYS) : (KEYS.find((k) => k.name === keyName) ?? KEYS[0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // The intro override is a naming-stage idea; drone levels have no intro.
  const introMode: IntroMode = config.drone
    ? 'none'
    : introOverride === 'auto'
      ? config.intro
      : introOverride;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [question, setQuestion] = useState<Question | null>(null);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  const score = useRef({ correct: 0, bestStreak: 0, misses: new Map<number, number>() });
  const timers = useRef<number[]>([]);
  const prevStep = useRef<number | null>(null);
  const answered = useRef(false);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // The drone runs for the whole round, and must not outlive the screen.
  useEffect(() => {
    return () => {
      clearTimers();
      stopDrone();
    };
  }, []);

  const midisFor = useCallback(
    (q: Question) => q.sequence.map((step, i) => stepToMidi(tonic.tonic, step, q.octaveUp[i])),
    [tonic.tonic],
  );

  /** Play the question's notes, marking which one is sounding. */
  const playQuestion = useCallback(
    (q: Question, onLastNote: () => void) => {
      const midis = midisFor(q);
      setPlayingIndex(0);

      if (midis.length === 1) {
        playSequence(midis, SEQUENCE_GAP, 1.15, 0.26);
        later(() => {
          setPlayingIndex(-1);
          onLastNote();
        }, 260);
        return;
      }

      playSequence(midis, SEQUENCE_GAP, 0.72, 0.26);
      midis.forEach((_, i) => {
        later(() => setPlayingIndex(i), i * SEQUENCE_GAP * 1000 + 80);
      });
      later(
        () => {
          setPlayingIndex(-1);
          onLastNote();
        },
        (midis.length - 1) * SEQUENCE_GAP * 1000 + 420,
      );
    },
    [midisFor],
  );

  const askQuestion = useCallback(
    (questionIndex: number) => {
      clearTimers();
      answered.current = false;
      setPicked(null);

      const q = generate(config, prevStep.current);
      prevStep.current = q.sequence[q.sequence.length - 1];
      setQuestion(q);

      const startPlaying = () => {
        setPhase('playing');
        playQuestion(q, () => setPhase('question'));
      };

      if (config.drone) {
        // The drone is the reference, so there's nothing to introduce. Give
        // the first question a beat longer so the drone has faded up first.
        setPhase('playing');
        later(startPlaying, questionIndex === 0 ? 950 : 320);
        return;
      }

      // Without a drone you need the key planted first. Even a level that
      // normally runs without an intro gets one on question one, or you
      // start with no bearings at all.
      const mode: IntroMode = questionIndex === 0 && introMode === 'none' ? 'short' : introMode;
      if (mode === 'none') {
        setPhase('playing');
        later(startPlaying, 320);
        return;
      }

      setPhase('intro');
      const introEnds = playKeyIntro(tonic.tonic, mode);
      later(startPlaying, Math.max(120, (introEnds - now()) * 1000 + 240));
    },
    [config, introMode, playQuestion, tonic.tonic],
  );

  // Guarded so StrictMode's double-invoke can't start two rounds at once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void unlockAudio().then(() => {
      if (config.drone) startDrone(tonic.tonic);
      askQuestion(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function answer(optionId: string) {
    if (phase !== 'question' || answered.current || !question) return;
    answered.current = true;
    setPicked(optionId);

    const correct = optionId === question.correctId;
    recordAnswer(level, correct);

    const heardMidi = midisFor(question)[0];
    const homeMidi = stepToMidi(tonic.tonic, 1);

    if (correct) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, nextStreak);
      setPhase('correct');

      if (question.kind === 'name-the-note') {
        playCorrect(tonic.tonic, heardMidi, nextStreak);
      } else {
        const soundMidi =
          question.kind === 'which-is-home' ? homeMidi : heardMidi;
        playCorrectSimple(tonic.tonic, soundMidi);
      }
      later(advance, HOLD_CORRECT_MS);
      return;
    }

    setStreak(0);
    setPhase('wrong');
    score.current.misses.set(missKey(question, optionId), (score.current.misses.get(missKey(question, optionId)) ?? 0) + 1);

    if (question.kind === 'name-the-note') {
      const pickedMidi = stepToMidi(tonic.tonic, Number(optionId), question.octaveUp[0]);
      playComparison(tonic.tonic, pickedMidi, heardMidi);
    } else if (question.kind === 'which-is-home') {
      const pickedStep = stepForOption(question, optionId);
      playComparison(
        tonic.tonic,
        stepToMidi(tonic.tonic, pickedStep ?? 1),
        homeMidi,
      );
    } else {
      playAgainstHome(tonic.tonic, heardMidi);
    }
    later(advance, HOLD_WRONG_MS);
  }

  function advance() {
    const next = index + 1;
    if (next >= config.roundLength) {
      const weakSteps = [...score.current.misses.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([step]) => step);
      stopDrone();
      finishSession({
        levelId: level,
        correct: score.current.correct,
        total: config.roundLength,
        bestStreak: score.current.bestStreak,
        weakSteps,
      });
      playSessionEnd(tonic.tonic);
      navigate('/summary', { replace: true });
      return;
    }
    setIndex(next);
    askQuestion(next);
  }

  function replay() {
    if (phase !== 'question' || !question) return;
    setPhase('playing');
    playQuestion(question, () => setPhase('question'));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question) return;
      if (e.key === ' ') {
        e.preventDefault();
        replay();
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      const option =
        question.kind === 'name-the-note'
          ? question.options.find((o) => o.id === String(n))
          : question.options[n - 1];
      if (option) answer(option.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const revealed = phase === 'correct' || phase === 'wrong';
  const cols = question ? columnsFor(question) : 3;
  const multi = (question?.sequence.length ?? 1) > 1;

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-4 py-2">
        <IconButton label="End round" onClick={() => navigate('/')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
        <div className="ml-auto">
          <Dots total={config.roundLength} index={index} />
        </div>
      </header>

      <div className="flex justify-center gap-2 pt-4">
        <span className="label rounded-full border border-accent-dim bg-accent-wash px-3 py-1.5 text-accent">
          Key of {tonic.name}
        </span>
        {config.drone && (
          <span className="label rounded-full border border-cool/40 px-3 py-1.5 text-cool">
            Drone on
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-4 text-center">
        {multi ? (
          <SequenceOrbs
            count={question?.sequence.length ?? 3}
            playing={playingIndex}
            phase={phase}
            answerIndex={revealed ? Number(question?.correctId) : -1}
            pickedIndex={revealed && picked !== null ? Number(picked) : -1}
          />
        ) : (
          <button
            onClick={replay}
            aria-label="Play the note again"
            className={`grid size-32 place-items-center rounded-full border bg-surface transition ${
              phase === 'correct'
                ? 'anim-pulse border-correct'
                : phase === 'wrong'
                  ? 'anim-shake border-wrong'
                  : phase === 'playing'
                    ? 'anim-ring border-accent-dim'
                    : phase === 'intro'
                      ? 'anim-ring border-line'
                      : 'border-line-strong'
            }`}
          >
            <span
              className={`text-[34px] leading-none ${
                phase === 'intro' ? 'text-subtle' : 'text-accent'
              }`}
              aria-hidden="true"
            >
              {phase === 'intro' ? '♩' : '♪'}
            </span>
          </button>
        )}

        <p className="max-w-[28ch] text-[15px] text-muted">
          {phase === 'intro'
            ? 'Settling into the key…'
            : phase === 'playing'
              ? 'Listen…'
              : phase === 'question'
                ? promptFor(question)
                : ''}
        </p>

        <div className="flex min-h-[68px] max-w-[30ch] flex-col items-center justify-center gap-1.5">
          {revealed && question && (
            <>
              <p
                className={`text-xl font-bold tracking-tight ${
                  phase === 'correct' ? 'text-correct' : 'text-wrong'
                }`}
              >
                {question.answerLabel}
              </p>
              <p className="text-[13px] leading-snug text-subtle">{question.explain}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {question?.options.map((option) => {
          const isAnswer = option.id === question.correctId;
          const isPicked = option.id === picked;
          const tone = revealed
            ? isAnswer
              ? 'border-correct bg-correct-wash text-correct'
              : isPicked
                ? 'border-wrong bg-wrong-wash text-wrong'
                : 'border-line bg-surface text-subtle'
            : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2';

          return (
            <button
              key={option.id}
              disabled={phase !== 'question'}
              onPointerDown={() => {
                const step = stepForOption(question, option.id);
                if (phase === 'question' && step !== null) playTapTick(stepToMidi(tonic.tonic, step));
              }}
              onClick={() => answer(option.id)}
              className={`grid gap-0.5 rounded-xl border px-1 py-3.5 transition active:scale-[0.97] disabled:active:scale-100 ${tone} ${
                phase === 'intro' || phase === 'playing' ? 'opacity-45' : ''
              }`}
            >
              <span className="tnum text-[17px] leading-tight font-bold tracking-tight">
                {question.kind === 'name-the-note' && labelStyle === 'solfege'
                  ? (option.secondary ?? option.primary)
                  : option.primary}
              </span>
              {option.secondary && (
                <span className="text-[10px] leading-tight opacity-65">
                  {question.kind === 'name-the-note' && labelStyle === 'solfege'
                    ? option.primary
                    : option.secondary}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 pb-1 text-[13px]">
        <button
          onClick={replay}
          disabled={phase !== 'question'}
          className="py-2 text-subtle transition hover:text-ink disabled:opacity-40"
        >
          Play again
        </button>
        <span className="tnum text-accent">{streak >= 2 ? `${streak} in a row` : ''}</span>
        <button onClick={() => setHelpOpen(true)} className="py-2 text-subtle transition hover:text-ink">
          What's this?
        </button>
      </div>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="What's this?">
        {config.drone ? (
          <>
            <p>
              That steady tone underneath is <strong className="text-ink">home</strong>. It never
              changes, so you don't have to remember anything — you just compare.
            </p>
            <p>
              A note that <em>is</em> home blends into the drone and almost disappears. Every other
              note sits against it and creates a little friction. That friction is the thing to
              listen for.
            </p>
          </>
        ) : (
          <>
            <p>
              The chords at the start plant <strong className="text-ink">home</strong> in your ear.
              Then the question plays, and now you have to hold home in your head rather than hear it.
            </p>
            <p>
              Don't count intervals. Ask instead: has this note arrived, or does it want to move?
              That instinct is the whole skill.
            </p>
          </>
        )}
        <p className="text-subtle">
          Level {config.id} · {config.name}
          {!config.drone && (
            <>
              {' '}
              — <span className="text-ink">{INTRO_LABEL[introMode]}</span>, {INTRO_HELP[introMode]}
            </>
          )}
        </p>
      </Sheet>
    </Screen>
  );
}

function promptFor(q: Question | null): string {
  switch (q?.kind) {
    case 'home-or-not':
      return 'Was that home?';
    case 'rest-or-move':
      return 'Settled, or restless?';
    case 'which-is-home':
      return 'Which one was home?';
    default:
      return 'Which note was that?';
  }
}

/** Which step to blame for an error, so the summary can be specific. */
function missKey(q: Question, pickedId: string): number {
  if (q.kind === 'which-is-home') return stepForOption(q, pickedId) ?? q.sequence[0];
  return q.sequence[0];
}

/** Three lozenges for the multi-note question, lighting as each note sounds. */
function SequenceOrbs({
  count,
  playing,
  phase,
  answerIndex,
  pickedIndex,
}: {
  count: number;
  playing: number;
  phase: Phase;
  answerIndex: number;
  pickedIndex: number;
}) {
  const revealed = phase === 'correct' || phase === 'wrong';
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: count }, (_, i) => {
        const active = playing === i;
        const tone = revealed
          ? i === answerIndex
            ? 'border-correct text-correct'
            : i === pickedIndex
              ? 'border-wrong text-wrong'
              : 'border-line text-subtle'
          : active
            ? 'border-accent text-accent'
            : 'border-line text-subtle';
        return (
          <div
            key={i}
            className={`grid size-[68px] place-items-center rounded-2xl border bg-surface transition ${tone} ${
              active ? 'scale-105' : ''
            }`}
          >
            <span className="tnum text-lg font-bold">{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}
