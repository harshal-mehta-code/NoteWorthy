import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dots, IconButton, Screen, Sheet } from '@/components/ui';
import { INTRO_HELP, INTRO_LABEL, getLevel, isSingKind } from '@/core/levels';
import type { IntroMode } from '@/core/levels';
import { KEYS, degreeToMidi, keyLabel, pickRandom, type KeyChoice } from '@/core/music';
import {
  blamedDegrees,
  columnsFor,
  degreeForOption,
  generate,
  slotCount,
  type Question,
} from '@/core/question';
import { degreeWeights, useStore } from '@/store/useStore';
import { SingPanel, type SingOutcome } from '@/components/SingPanel';
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
const SEQUENCE_GAP = 0.78;

export default function Practice() {
  const navigate = useNavigate();
  const level = useStore((s) => s.level);
  const keyMode = useStore((s) => s.keyMode);
  const keyName = useStore((s) => s.keyName);
  const labelStyle = useStore((s) => s.labelStyle);
  const introOverride = useStore((s) => s.introOverride);
  const allDegreeStats = useStore((s) => s.degreeStats);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const finishSession = useStore((s) => s.finishSession);

  const config = getLevel(level);

  const rollKey = useCallback(
    (): KeyChoice =>
      keyMode === 'random' || config.keyPerQuestion
        ? pickRandom(KEYS)
        : (KEYS.find((k) => k.name === keyName) ?? KEYS[0]),
    [config.keyPerQuestion, keyMode, keyName],
  );

  /** Fixed for the round unless the level deliberately re-rolls it. */
  const [key, setKey] = useState<KeyChoice>(rollKey);
  const keyRef = useRef(key);
  keyRef.current = key;

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
  const [slots, setSlots] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  const score = useRef({ correct: 0, bestStreak: 0, misses: new Map<number, number>() });
  const timers = useRef<number[]>([]);
  const prevDegree = useRef<number | null>(null);
  const answered = useRef(false);

  /**
   * Weights are captured once per round. Recomputing mid-round would let the
   * distribution chase a single bad answer, which reads as the app picking on
   * you rather than adapting.
   */
  const weights = useMemo(
    () => degreeWeights(allDegreeStats[level], config.degrees),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // The drone runs for the whole round, and must not outlive the screen.
  useEffect(
    () => () => {
      clearTimers();
      stopDrone();
    },
    [],
  );

  const midisFor = useCallback(
    (q: Question, tonic: number) =>
      q.sequence.map((deg, i) => degreeToMidi(tonic, deg, q.octaveUp[i])),
    [],
  );

  /** Play the question's notes, marking which one is sounding. */
  const playQuestion = useCallback(
    (q: Question, tonic: number, onDone: () => void) => {
      const midis = midisFor(q, tonic);
      setPlayingIndex(0);

      if (midis.length === 0) {
        // sing-degree: you're told the note, nothing plays it for you.
        setPlayingIndex(-1);
        later(onDone, 120);
        return;
      }

      if (midis.length === 1) {
        playSequence(midis, SEQUENCE_GAP, 1.15, 0.26);
        later(() => {
          setPlayingIndex(-1);
          onDone();
        }, 260);
        return;
      }

      playSequence(midis, SEQUENCE_GAP, 0.66, 0.26);
      midis.forEach((_, i) => later(() => setPlayingIndex(i), i * SEQUENCE_GAP * 1000 + 60));
      later(
        () => {
          setPlayingIndex(-1);
          onDone();
        },
        (midis.length - 1) * SEQUENCE_GAP * 1000 + 400,
      );
    },
    [midisFor],
  );

  const askQuestion = useCallback(
    (questionIndex: number) => {
      clearTimers();
      answered.current = false;
      setSlots([]);

      const tonic = config.keyPerQuestion && questionIndex > 0 ? rollKey() : keyRef.current;
      if (tonic !== keyRef.current) {
        keyRef.current = tonic;
        setKey(tonic);
      }

      const q = generate(config, prevDegree.current, weights);
      prevDegree.current = q.target ?? q.sequence[q.sequence.length - 1] ?? null;
      setQuestion(q);

      const startPlaying = () => {
        setPhase('playing');
        playQuestion(q, tonic.tonic, () => setPhase('question'));
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
      const intro: IntroMode = questionIndex === 0 && introMode === 'none' ? 'short' : introMode;
      if (intro === 'none') {
        setPhase('playing');
        later(startPlaying, 320);
        return;
      }

      setPhase('intro');
      const introEnds = playKeyIntro(tonic.tonic, intro, config.mode);
      later(startPlaying, Math.max(120, (introEnds - now()) * 1000 + 240));
    },
    [config, introMode, playQuestion, rollKey, weights],
  );

  // Guarded so StrictMode's double-invoke can't start two rounds at once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void unlockAudio().then(() => {
      if (config.drone) startDrone(keyRef.current.tonic);
      askQuestion(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function grade(q: Question, answer: string[]) {
    answered.current = true;
    const tonic = keyRef.current.tonic;
    const correct = answer.every((id, i) => id === q.correctIds[i]);
    recordAnswer(level, correct, correct ? q.sequence : blamedDegrees(q, answer));

    const heard = midisFor(q, tonic);
    const homeMidi = degreeToMidi(tonic, 0);

    if (correct) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, nextStreak);
      setPhase('correct');

      if (q.kind === 'name-the-note') {
        playCorrect(tonic, heard[heard.length - 1], nextStreak, config.mode);
      } else {
        playCorrectSimple(tonic, q.kind === 'which-is-home' ? homeMidi : heard[0]);
      }
      later(advance, HOLD_CORRECT_MS);
      return;
    }

    setStreak(0);
    setPhase('wrong');
    for (const deg of blamedDegrees(q, answer)) {
      score.current.misses.set(deg, (score.current.misses.get(deg) ?? 0) + 1);
    }

    let holdMs = HOLD_WRONG_MS;

    if (q.kind === 'name-the-note' && q.sequence.length > 1) {
      // Your phrase, then the real one — the contrast is the correction.
      const mine = answer.map((id, i) => degreeToMidi(tonic, Number(id), q.octaveUp[i]));
      playSequence(mine, SEQUENCE_GAP, 0.6, 0.24);
      const secondAt = q.sequence.length * SEQUENCE_GAP * 1000 + 500;
      later(() => playSequence(heard, SEQUENCE_GAP, 0.6, 0.24), secondAt);
      holdMs = secondAt + q.sequence.length * SEQUENCE_GAP * 1000 + 900;
    } else if (q.kind === 'name-the-note') {
      playComparison(
        tonic,
        degreeToMidi(tonic, Number(answer[0]), q.octaveUp[0]),
        heard[0],
        config.mode,
      );
    } else if (q.kind === 'which-is-home') {
      const pickedDeg = degreeForOption(q, answer[0]);
      playComparison(tonic, degreeToMidi(tonic, pickedDeg ?? 0), homeMidi, config.mode);
    } else {
      playAgainstHome(tonic, heard[0]);
    }

    later(advance, holdMs);
  }

  /**
   * Sing levels are graded by the microphone, not by a button, so they get
   * their own path. A skip is not a wrong answer — it advances without
   * recording anything, so a missing microphone never poisons your stats.
   */
  function handleSing(outcome: SingOutcome) {
    if (!question || answered.current) return;
    answered.current = true;
    const tonic = keyRef.current.tonic;
    const targetMidi = degreeToMidi(tonic, question.target ?? 0);

    if (outcome === 'skipped') {
      setPhase('wrong');
      later(advance, 900);
      return;
    }

    const hit = outcome === 'hit';
    recordAnswer(level, hit, blamedDegrees(question, []));

    if (hit) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, nextStreak);
      setPhase('correct');
      playCorrect(tonic, targetMidi, nextStreak, config.mode);
      later(advance, HOLD_CORRECT_MS);
      return;
    }

    setStreak(0);
    setPhase('wrong');
    for (const deg of blamedDegrees(question, [])) {
      score.current.misses.set(deg, (score.current.misses.get(deg) ?? 0) + 1);
    }
    // Nothing to compare against, so just play the note they were reaching for.
    playSequence([targetMidi], SEQUENCE_GAP, 1.1, 0.26);
    later(advance, 2200);
  }

  function replayReference() {
    if (!question) return;
    const tonic = keyRef.current.tonic;
    if (question.sequence.length) {
      playSequence(midisFor(question, tonic), SEQUENCE_GAP, 1.0, 0.26);
    } else {
      playKeyIntro(tonic, 'home', config.mode);
    }
  }

  function pick(optionId: string) {
    if (phase !== 'question' || answered.current || !question) return;
    const next = [...slots, optionId];
    setSlots(next);
    if (next.length >= slotCount(question)) grade(question, next);
  }

  function undo() {
    if (phase !== 'question' || answered.current) return;
    setSlots((s) => s.slice(0, -1));
  }

  function advance() {
    const next = index + 1;
    if (next >= config.roundLength) {
      const weakDegrees = [...score.current.misses.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([deg]) => deg);
      stopDrone();
      finishSession({
        levelId: level,
        correct: score.current.correct,
        total: config.roundLength,
        bestStreak: score.current.bestStreak,
        weakDegrees,
      });
      playSessionEnd(keyRef.current.tonic, config.mode);
      navigate('/summary', { replace: true });
      return;
    }
    setIndex(next);
    askQuestion(next);
  }

  function replay() {
    if (phase !== 'question' || !question) return;
    setPhase('playing');
    playQuestion(question, keyRef.current.tonic, () => setPhase('question'));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question || isSingKind(question.kind)) return;
      if (e.key === ' ') {
        e.preventDefault();
        replay();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      const option = question.options[n - 1];
      if (option) pick(option.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const revealed = phase === 'correct' || phase === 'wrong';
  const singing = isSingKind(config.kind);
  const cols = question ? columnsFor(question) : 3;
  const totalSlots = question ? slotCount(question) : 1;
  const multiNote = (question?.sequence.length ?? 1) > 1;
  const multiSlot = totalSlots > 1;

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
          Key of {keyLabel(key, config.mode)}
        </span>
        {config.drone && (
          <span className="label rounded-full border border-cool/40 px-3 py-1.5 text-cool">
            Drone on
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 py-4 text-center">
        {singing && phase === 'question' ? null : multiNote ? (
          <SequenceOrbs
            count={question?.sequence.length ?? 3}
            playing={playingIndex}
            phase={phase}
            highlightAnswer={question?.kind === 'which-is-home' && revealed}
            answerIndex={question?.kind === 'which-is-home' ? Number(question.correctIds[0]) : -1}
            pickedIndex={
              question?.kind === 'which-is-home' && slots.length ? Number(slots[0]) : -1
            }
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

        {singing && question && phase === 'question' && (
          <div className="w-full">
            <SingPanel
              key={`${index}-${question.target}`}
              targetMidi={degreeToMidi(keyRef.current.tonic, question.target ?? 0)}
              targetLabel={question.answerLabel}
              tolerance={config.singTolerance}
              onOutcome={handleSing}
              onReplayReference={replayReference}
            />
          </div>
        )}

        {!(singing && phase === 'question') && (
          <p className="max-w-[30ch] text-[15px] text-muted">
            {phase === 'intro'
              ? 'Settling into the key…'
              : phase === 'playing'
                ? 'Listen…'
                : phase === 'question'
                  ? promptFor(question, slots.length, totalSlots)
                  : ''}
          </p>
        )}

        <div className="flex min-h-[66px] max-w-[32ch] flex-col items-center justify-center gap-1.5">
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

      {multiSlot && question && (
        <SlotRow
          total={totalSlots}
          picked={slots}
          correctIds={question.correctIds}
          options={question.options}
          revealed={revealed}
          onUndo={undo}
        />
      )}

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {question?.options.map((option) => {
          // With several slots a single button can be right in one and wrong
          // in another, so the per-slot row carries the verdict instead.
          const tone =
            revealed && !multiSlot
              ? option.id === question.correctIds[0]
                ? 'border-correct bg-correct-wash text-correct'
                : option.id === slots[0]
                  ? 'border-wrong bg-wrong-wash text-wrong'
                  : 'border-line bg-surface text-subtle'
              : revealed
                ? 'border-line bg-surface text-subtle'
                : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2';

          return (
            <button
              key={option.id}
              disabled={phase !== 'question'}
              onPointerDown={() => {
                const deg = degreeForOption(question, option.id);
                if (phase === 'question' && deg !== null && question.kind === 'name-the-note') {
                  playTapTick(degreeToMidi(keyRef.current.tonic, deg));
                }
              }}
              onClick={() => pick(option.id)}
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
          disabled={phase !== 'question' || singing}
          className={`py-2 text-subtle transition hover:text-ink disabled:opacity-40 ${
            singing ? 'invisible' : ''
          }`}
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
              Then the question plays, and now you have to hold home in your head rather than hear
              it.
            </p>
            <p>
              Don't count intervals. Ask instead: has this note arrived, or does it want to move?
              That instinct is the whole skill.
            </p>
          </>
        )}
        {singing && (
          <>
            <p>
              Nothing plays while you sing — the reference stops first, so you're producing the
              note from memory rather than matching one that's still ringing.
            </p>
            <p>
              <strong className="text-ink">Any octave counts.</strong> Sing it wherever it sits
              comfortably in your voice; the app only cares that it's the right note.
            </p>
            <p className="text-subtle">
              Headphones help. Hold the note steady for about a second to pass.
            </p>
          </>
        )}
        {config.mode === 'minor' && (
          <p>
            This key is <strong className="text-ink">minor</strong>. Home works the same way, but
            the third, sixth and seventh all sit a semitone lower — which is what makes it sound
            darker.
          </p>
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

function promptFor(q: Question | null, filled: number, total: number): string {
  switch (q?.kind) {
    case 'sing-home':
      return 'Now sing home.';
    case 'sing-back':
      return 'Sing that note back.';
    case 'sing-degree':
      return 'Find it and sing it.';
    case 'home-or-not':
      return 'Was that home?';
    case 'rest-or-move':
      return 'Settled, or restless?';
    case 'which-is-home':
      return 'Which one was home?';
    default:
      return total > 1 ? `Name note ${filled + 1} of ${total}` : 'Which note was that?';
  }
}

/** Answer slots for multi-note questions, with the verdict per slot. */
function SlotRow({
  total,
  picked,
  correctIds,
  options,
  revealed,
  onUndo,
}: {
  total: number;
  picked: string[];
  correctIds: string[];
  options: { id: string; primary: string }[];
  revealed: boolean;
  onUndo: () => void;
}) {
  const labelOf = (id: string) => options.find((o) => o.id === id)?.primary ?? id;

  return (
    <div className="mb-3 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const value = picked[i];
        const right = revealed && value === correctIds[i];
        const wrong = revealed && value !== undefined && value !== correctIds[i];
        return (
          <div
            key={i}
            className={`tnum grid h-11 min-w-[52px] place-items-center rounded-xl border px-2 text-[15px] font-bold ${
              right
                ? 'border-correct bg-correct-wash text-correct'
                : wrong
                  ? 'border-wrong bg-wrong-wash text-wrong'
                  : value
                    ? 'border-accent-dim bg-accent-wash text-accent'
                    : 'border-line border-dashed text-subtle'
            }`}
          >
            {value ? labelOf(value) : '·'}
          </div>
        );
      })}
      {!revealed && picked.length > 0 && (
        <button
          onClick={onUndo}
          aria-label="Undo last note"
          className="ml-1 grid size-11 place-items-center rounded-xl border border-line text-subtle transition hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path
              d="M6 3L2.5 6.5 6 10M2.5 6.5h6a4 4 0 010 8H6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Lozenges for a multi-note question, lighting as each note sounds. */
function SequenceOrbs({
  count,
  playing,
  phase,
  highlightAnswer,
  answerIndex,
  pickedIndex,
}: {
  count: number;
  playing: number;
  phase: Phase;
  highlightAnswer: boolean;
  answerIndex: number;
  pickedIndex: number;
}) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: count }, (_, i) => {
        const active = playing === i;
        const tone = highlightAnswer
          ? i === answerIndex
            ? 'border-correct text-correct'
            : i === pickedIndex
              ? 'border-wrong text-wrong'
              : 'border-line text-subtle'
          : active
            ? 'border-accent text-accent'
            : phase === 'wrong'
              ? 'border-line text-subtle'
              : 'border-line text-subtle';
        return (
          <div
            key={i}
            className={`grid size-[64px] place-items-center rounded-2xl border bg-surface transition ${tone} ${
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
