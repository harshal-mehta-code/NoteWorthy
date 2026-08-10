import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, Card, IconButton, Label, Screen } from '@/components/ui';
import {
  COOL_DOWN,
  SAFETY_NOTE,
  WARM_UP,
  routineSeconds,
  stepNotes,
  stepPitch,
  type VoiceStep,
} from '@/core/voiceHealth';
import { playNote, playSequence, unlockAudio } from '@/audio/engine';
import { useStore } from '@/store/useStore';

/**
 * A guided vocal warm-up or cool-down.
 *
 * docs/01-PEDAGOGY.md §4.4: never sing cold, and finish descending. Each step
 * is timed and sounds its own reference, so this can be followed with the
 * phone face down — which is how anyone actually warms up.
 *
 * There is no microphone here on purpose. Grading a warm-up would turn the
 * one part of the app that is supposed to be unhurried and pressure-free into
 * another thing to fail at, and a voice that is being tested is not relaxing.
 */
export default function VoiceRoutine() {
  const navigate = useNavigate();
  const { kind } = useParams<{ kind: string }>();
  const [params] = useSearchParams();
  const vocalRange = useStore((s) => s.vocalRange);
  const markWarmedUp = useStore((s) => s.markWarmedUp);

  const cooling = kind === 'cooldown';
  const steps = cooling ? COOL_DOWN : WARM_UP;
  /** Where to go when it finishes — the round they were heading for. */
  const then = params.get('then');

  const [index, setIndex] = useState(-1);
  const [left, setLeft] = useState(0);
  const timer = useRef<number | null>(null);
  const done = index >= steps.length;

  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  /** Sound a step's reference: the pattern, or a single note for a glide. */
  const sound = useCallback(
    (step: VoiceStep) => {
      const notes = stepNotes(step, vocalRange);
      if (notes.length > 1) playSequence(notes, 0.62, 0.55, 0.22);
      else playNote(notes[0] ?? stepPitch(step, vocalRange), 0.05, 1.6, 0.22);
    },
    [vocalRange],
  );

  const runFrom = useCallback(
    (i: number) => {
      stop();
      if (i >= steps.length) {
        setIndex(steps.length);
        if (!cooling) markWarmedUp();
        return;
      }

      setIndex(i);
      setLeft(steps[i].seconds);
      sound(steps[i]);

      // Re-sound the reference every few seconds so there is always something
      // to match, without it becoming a metronome.
      let elapsed = 0;
      timer.current = window.setInterval(() => {
        elapsed += 1;
        const remaining = steps[i].seconds - elapsed;
        setLeft(remaining);
        if (remaining <= 0) {
          runFrom(i + 1);
          return;
        }
        if (elapsed % 8 === 0) sound(steps[i]);
      }, 1000);
    },
    [cooling, markWarmedUp, sound, steps],
  );

  async function begin() {
    await unlockAudio();
    runFrom(0);
  }

  function finish() {
    stop();
    navigate(then ?? '/', { replace: true });
  }

  const total = routineSeconds(steps);
  const step = index >= 0 && index < steps.length ? steps[index] : null;

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-4 py-2">
        <IconButton
          label="Back"
          onClick={() => {
            stop();
            navigate(-1);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path
              d="M9 3L4.5 7.5 9 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        <span className="label text-subtle">{cooling ? 'Cool-down' : 'Warm-up'}</span>
      </header>

      {index < 0 && (
        <div className="flex flex-1 flex-col justify-center py-6">
          <Label className="text-accent">
            {Math.round(total / 60) || 1} minute{total >= 90 ? 's' : ''}
          </Label>
          <h1 className="mt-3 text-[32px] leading-[1.08] font-bold tracking-[-0.04em] text-balance">
            {cooling ? 'Wind your voice down' : 'Warm your voice up first'}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            {cooling
              ? 'Quiet and descending. Finishing softer than you started is what stops a good session leaving you hoarse tomorrow.'
              : 'Four short exercises in your own range. Singing cold is how voices get hurt, and this takes about as long as one round.'}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-subtle">
            Nothing is listening — there is no score here. Follow along at a volume that feels easy.
          </p>

          <Card className="mt-6">
            <p className="text-[13.5px] leading-relaxed text-muted">{SAFETY_NOTE}</p>
          </Card>

          <div className="mt-8 space-y-3">
            <Button onClick={begin}>Start</Button>
            {then && (
              <Button variant="ghost" onClick={finish}>
                Skip — I'm already warm
              </Button>
            )}
          </div>
        </div>
      )}

      {step && (
        <div className="flex flex-1 flex-col justify-center py-6 text-center">
          <Label className="text-accent">
            Step {index + 1} of {steps.length}
          </Label>
          <h1 className="mt-3 text-[34px] leading-[1.05] font-bold tracking-[-0.04em]">
            {step.name}
          </h1>
          <p className="mx-auto mt-4 max-w-[30ch] text-[16px] leading-relaxed text-muted">
            {step.how}
          </p>

          <div className="mt-10">
            <span className="tnum block font-mono text-[56px] leading-none font-bold tracking-tight text-accent">
              {left}
            </span>
            <span className="label mt-2 block text-subtle">seconds</span>
          </div>

          <div className="mx-auto mt-8 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
              style={{ width: `${((step.seconds - left) / step.seconds) * 100}%` }}
            />
          </div>

          <button
            onClick={() => runFrom(index + 1)}
            className="mx-auto mt-8 py-2 text-[13px] text-subtle transition hover:text-ink"
          >
            Next exercise
          </button>
        </div>
      )}

      {done && (
        <div className="anim-rise flex flex-1 flex-col justify-center py-6">
          <Label className="text-accent">Done</Label>
          <h1 className="mt-3 text-[32px] leading-[1.08] font-bold tracking-[-0.04em] text-balance">
            {cooling ? 'That’s a good place to stop' : 'Your voice is ready'}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            {cooling
              ? 'Rest it now. Voices recover with time rather than with more practice.'
              : 'Warm for the next half hour — you won’t be asked to do this again before every round.'}
          </p>
          <div className="mt-8">
            <Button onClick={finish}>{then ? 'Start singing' : 'Done'}</Button>
          </div>
        </div>
      )}
    </Screen>
  );
}
