import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dots, IconButton, Screen, Sheet } from '@/components/ui';
import { INTRO_HELP, INTRO_LABEL, ROUND_LENGTH, getLevel } from '@/core/levels';
import type { IntroMode } from '@/core/levels';
import { KEYS, SOLFEGE, STEP_NICKNAME, pickRandom, pickStep, stepToMidi } from '@/core/music';
import { useStore } from '@/store/useStore';
import {
  now,
  playComparison,
  playCorrect,
  playKeyIntro,
  playNote,
  playSessionEnd,
  playTapTick,
  unlockAudio,
} from '@/audio/engine';

type Phase = 'intro' | 'question' | 'correct' | 'wrong';

type Item = { step: number; octaveUp: boolean };

/** Pause after feedback before the next question starts. */
const HOLD_CORRECT_MS = 1250;
const HOLD_WRONG_MS = 3300;

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
  const tonic = useMemo(() => {
    const chosen =
      keyMode === 'random' ? pickRandom(KEYS) : (KEYS.find((k) => k.name === keyName) ?? KEYS[0]);
    return chosen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const introMode: IntroMode = introOverride === 'auto' ? config.intro : introOverride;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [item, setItem] = useState<Item | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
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

  useEffect(() => clearTimers, []);

  /** Start a question: establish the key, then play the note. */
  const askQuestion = useCallback(
    (questionIndex: number) => {
      clearTimers();
      answered.current = false;
      setPicked(null);
      setPhase('intro');

      const step = pickStep(config.steps, prevStep.current);
      prevStep.current = step;
      const octaveUp = config.twoOctaves && Math.random() < 0.35;
      const next = { step, octaveUp };
      setItem(next);

      // The first question always gets a proper introduction, even at levels
      // that normally run without one — otherwise you start with no bearings.
      const mode: IntroMode = questionIndex === 0 && introMode === 'none' ? 'short' : introMode;

      const introEnds = playKeyIntro(tonic.tonic, mode);
      const gapMs = Math.max(120, (introEnds - now()) * 1000 + 220);

      later(() => {
        setPhase('question');
        playNote(stepToMidi(tonic.tonic, next.step, next.octaveUp), 0.02, 1.15);
      }, gapMs);
    },
    [config.steps, config.twoOctaves, introMode, tonic.tonic],
  );

  // Guarded so StrictMode's double-invoke can't start two rounds at once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void unlockAudio().then(() => askQuestion(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function answer(step: number) {
    if (phase !== 'question' || answered.current || !item) return;
    answered.current = true;
    setPicked(step);

    const correct = step === item.step;
    recordAnswer(level, correct);

    if (correct) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, nextStreak);
      setPhase('correct');
      playCorrect(tonic.tonic, stepToMidi(tonic.tonic, item.step, item.octaveUp), nextStreak);
      later(advance, HOLD_CORRECT_MS);
    } else {
      setStreak(0);
      score.current.misses.set(item.step, (score.current.misses.get(item.step) ?? 0) + 1);
      setPhase('wrong');
      playComparison(
        tonic.tonic,
        stepToMidi(tonic.tonic, step, item.octaveUp),
        stepToMidi(tonic.tonic, item.step, item.octaveUp),
      );
      later(advance, HOLD_WRONG_MS);
    }
  }

  function advance() {
    const next = index + 1;
    if (next >= ROUND_LENGTH) {
      const weakSteps = [...score.current.misses.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([step]) => step);
      finishSession({
        levelId: level,
        correct: score.current.correct,
        total: ROUND_LENGTH,
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

  function replayNote() {
    if (phase !== 'question' || !item) return;
    playNote(stepToMidi(tonic.tonic, item.step, item.octaveUp), 0.02, 1.05);
  }

  function replayKey() {
    if (phase === 'intro') return;
    playKeyIntro(tonic.tonic, 'home');
  }

  // Number keys answer, space replays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        replayNote();
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && config.steps.includes(n)) answer(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cols = config.steps.length <= 3 ? 3 : config.steps.length <= 6 ? 3 : 4;

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-4 py-2">
        <IconButton label="End round" onClick={() => navigate('/')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path
              d="M3 3l9 9M12 3l-9 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </IconButton>
        <div className="ml-auto">
          <Dots total={ROUND_LENGTH} index={index} />
        </div>
      </header>

      <div className="flex justify-center pt-4">
        <span className="label rounded-full border border-accent-dim bg-accent-wash px-3 py-1.5 text-accent">
          Key of {tonic.name}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-4 text-center">
        <button
          onClick={replayNote}
          aria-label="Play the note again"
          className={`grid size-32 place-items-center rounded-full border bg-surface transition ${
            phase === 'correct'
              ? 'anim-pulse border-correct'
              : phase === 'wrong'
                ? 'anim-shake border-wrong'
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

        <p className="max-w-[26ch] text-[15px] text-muted">
          {phase === 'intro'
            ? 'Settling into the key…'
            : phase === 'question'
              ? 'Which note was that?'
              : ''}
        </p>

        <div className="flex min-h-[64px] flex-col items-center justify-center gap-1">
          {phase === 'correct' && item && (
            <>
              <p className="text-xl font-bold tracking-tight text-correct">
                {stepLabel(item.step, labelStyle)}
              </p>
              <p className="label text-subtle">
                {streak >= 3 ? `${streak} in a row` : STEP_NICKNAME[item.step]}
              </p>
            </>
          )}
          {phase === 'wrong' && item && (
            <>
              <p className="text-xl font-bold tracking-tight text-wrong">
                It was {stepLabel(item.step, labelStyle)}
              </p>
              <p className="label text-subtle">Yours → the real one → in the key</p>
            </>
          )}
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {config.steps.map((step) => {
          const isAnswer = item?.step === step;
          const isPicked = picked === step;
          const revealed = phase === 'correct' || phase === 'wrong';
          const tone = revealed
            ? isAnswer
              ? 'border-correct bg-correct-wash text-correct'
              : isPicked
                ? 'border-wrong bg-wrong-wash text-wrong'
                : 'border-line bg-surface text-subtle'
            : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2';

          return (
            <button
              key={step}
              disabled={phase !== 'question'}
              onPointerDown={() => {
                if (phase === 'question') playTapTick(stepToMidi(tonic.tonic, step));
              }}
              onClick={() => answer(step)}
              className={`grid gap-0.5 rounded-xl border py-3.5 transition active:scale-[0.97] disabled:active:scale-100 ${tone} ${
                phase === 'intro' ? 'opacity-45' : ''
              }`}
            >
              <span className="tnum text-[20px] leading-none font-bold tracking-tight">
                {labelStyle === 'numbers' ? step : SOLFEGE[step - 1]}
              </span>
              <span className="label text-[9px] opacity-70">
                {labelStyle === 'numbers' ? SOLFEGE[step - 1] : step}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 pb-1 text-[13px]">
        <button
          onClick={replayKey}
          className="py-2 text-subtle transition hover:text-ink disabled:opacity-40"
          disabled={phase === 'intro'}
        >
          Hear home
        </button>
        <span className="tnum text-accent">{streak >= 2 ? `${streak} in a row` : ''}</span>
        <button onClick={() => setHelpOpen(true)} className="py-2 text-subtle transition hover:text-ink">
          What's this?
        </button>
      </div>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="What am I doing?">
        <p>
          The chords at the start of each question plant <strong className="text-ink">home</strong>{' '}
          in your ear. Then one note plays, and you say which of the key's notes it was.
        </p>
        <p>
          <strong className="text-ink">1</strong> is home itself.{' '}
          <strong className="text-ink">5</strong> is the strong one that sounds settled but not
          finished. <strong className="text-ink">3</strong> is the bright one that tells you the key
          is major.
        </p>
        <p>
          Don't count intervals. Just ask: does this note sound like it's arrived, or like it wants
          to move? That instinct is the whole skill.
        </p>
        <p className="text-subtle">
          Currently using: <span className="text-ink">{INTRO_LABEL[introMode]}</span> —{' '}
          {INTRO_HELP[introMode]}
        </p>
      </Sheet>
    </Screen>
  );
}

function stepLabel(step: number, style: 'numbers' | 'solfege'): string {
  return style === 'numbers' ? `${step} · ${SOLFEGE[step - 1]}` : `${SOLFEGE[step - 1]} · ${step}`;
}
