import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { midiToName } from '@/core/music';
import { PhraseGrader, type PhraseSlot } from '@/core/phrase';
import { useMic, type MicState } from '@/mic/useMic';

/** Give up and reveal after this long. Runs are short; hunting is not. */
const TIMEOUT_MS = 18000;

export type PhraseOutcome =
  | { kind: 'graded'; slots: PhraseSlot[] }
  | { kind: 'skipped' };

/**
 * Sing a phrase back, note by note.
 *
 * The slots fill left to right as you sing. They fill on what you *actually*
 * sang rather than waiting for the right answer — being stuck on note two of
 * five with no way forward is the worst thing this screen could do, and it
 * also hides the useful information, which is which notes you missed.
 *
 * Nothing sounds while you sing. The phrase plays first and then stops, so
 * you are producing a line from memory rather than tracking one, and so the
 * app cannot hear its own playback and grade it as your voice.
 */
export function PhrasePanel({
  targets,
  labels,
  toleranceCents,
  holdMs,
  onOutcome,
  onReplay,
}: {
  targets: number[];
  labels: string[];
  toleranceCents: number;
  holdMs: number;
  onOutcome: (outcome: PhraseOutcome) => void;
  onReplay: () => void;
}) {
  const { state, frameRef, start } = useMic();
  const [slots, setSlots] = useState<PhraseSlot[]>(() =>
    targets.map((target) => ({ target, state: 'pending' as const, sung: null, cents: null })),
  );
  const [progress, setProgress] = useState(0);
  const [heard, setHeard] = useState<number | null>(null);

  const graderRef = useRef<PhraseGrader | null>(null);
  const outcomeRef = useRef(onOutcome);
  outcomeRef.current = onOutcome;
  const doneRef = useRef(false);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (state !== 'listening') return;

    const grader = new PhraseGrader(targets, { toleranceCents, holdMs });
    graderRef.current = grader;
    doneRef.current = false;

    let raf = 0;
    let last = performance.now();
    const startedAt = last;

    const tick = () => {
      const nowMs = performance.now();
      const dt = nowMs - last;
      last = nowMs;

      grader.feed(frameRef.current.midi, dt);
      setSlots([...grader.slots]);
      setProgress(grader.progress);
      setHeard(grader.holding);

      if (!doneRef.current && (grader.done || nowMs - startedAt > TIMEOUT_MS)) {
        doneRef.current = true;
        // A phrase that ran out of time still reports — the notes that were
        // sung are real results, and the ones that weren't are misses.
        if (!grader.done) grader.timeOut();
        setSlots([...grader.slots]);
        outcomeRef.current({ kind: 'graded', slots: grader.slots });
        return;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, frameRef, targets, toleranceCents, holdMs]);

  if (state !== 'listening') {
    return <MicGate state={state} onRetry={start} onSkip={() => onOutcome({ kind: 'skipped' })} />;
  }

  const cursor = slots.findIndex((s) => s.state === 'pending');

  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="label text-subtle">Sing it back</span>
      </div>

      <div className="flex flex-wrap items-end justify-center gap-2">
        {slots.map((slot, i) => {
          const active = i === cursor;
          const tone =
            slot.state === 'hit'
              ? 'border-correct bg-correct-wash text-correct'
              : slot.state === 'miss'
                ? 'border-wrong bg-wrong-wash text-wrong'
                : active
                  ? 'border-accent text-accent'
                  : 'border-line border-dashed text-subtle';
          return (
            <div
              key={i}
              className={`relative grid h-[58px] min-w-[54px] place-items-center overflow-hidden rounded-2xl border px-2 transition ${tone} ${
                active ? 'scale-105' : ''
              }`}
            >
              {/* The hold meter fills the active slot from the bottom. */}
              {active && (
                <div
                  className="absolute inset-x-0 bottom-0 bg-accent/20 transition-[height] duration-75"
                  style={{ height: `${progress * 100}%` }}
                />
              )}
              <span className="tnum relative text-lg font-bold">{labels[i]}</span>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <span className="tnum block font-mono text-[26px] leading-none font-bold tracking-tight">
          {heard === null ? '—' : midiToName(heard)}
        </span>
        <span className="label mt-1.5 block text-subtle">what we're hearing</span>
      </div>

      <div className="flex items-center justify-between text-[13px]">
        <button onClick={onReplay} className="py-2 text-subtle transition hover:text-ink">
          Hear it again
        </button>
        <button
          onClick={() => onOutcome({ kind: 'skipped' })}
          className="py-2 text-subtle transition hover:text-ink"
        >
          Skip this one
        </button>
      </div>
    </div>
  );
}

/** Permission and failure states. Declining is never a dead end. */
function MicGate({
  state,
  onRetry,
  onSkip,
}: {
  state: MicState;
  onRetry: () => void;
  onSkip: () => void;
}) {
  const copy: Record<string, { title: string; body: string; retry: boolean }> = {
    idle: {
      title: 'This one needs your microphone',
      body: 'It stays on your device — nothing is recorded, stored, or sent anywhere.',
      retry: true,
    },
    requesting: {
      title: 'Waiting for permission',
      body: 'Allow microphone access in the prompt your browser just showed.',
      retry: false,
    },
    denied: {
      title: 'Microphone blocked',
      body: 'Your browser is refusing access. You can change that in the site settings — or skip this level, and everything else still works.',
      retry: true,
    },
    unsupported: {
      title: 'No microphone available',
      body: "This browser doesn't offer microphone access. The other courses don't need it.",
      retry: false,
    },
    error: {
      title: "Couldn't start the microphone",
      body: 'Something went wrong opening the input. Another app may be using it.',
      retry: true,
    },
  };
  const c = copy[state] ?? copy.error;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 text-center">
      <div>
        <h2 className="text-[17px] font-bold tracking-tight">{c.title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{c.body}</p>
      </div>
      <div className="space-y-2">
        {c.retry && <Button onClick={onRetry}>Allow microphone</Button>}
        <Button variant="ghost" onClick={onSkip}>
          Skip this one
        </Button>
      </div>
    </div>
  );
}
