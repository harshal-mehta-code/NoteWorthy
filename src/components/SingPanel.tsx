import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { midiToName } from '@/core/music';
import { frameCents, useMic, type MicState } from '@/mic/useMic';

/** How long you must stay in tune for it to count. */
const HOLD_MS = 800;
/** Brief wobbles shouldn't reset the hold — a breath is not a failure. */
const GRACE_MS = 250;
/** Give up and reveal after this long. */
const TIMEOUT_MS = 14000;
/** Cents shown at the edges of the meter. */
const RANGE = 120;

export type SingOutcome = 'hit' | 'timeout' | 'skipped';

/**
 * Sing a target pitch and hold it.
 *
 * Graded on pitch class, not absolute pitch: a bass and a soprano asked for
 * the same note will correctly sing octaves apart, and marking either wrong
 * would be nonsense. Nothing sounds while you're singing — the reference is
 * played first and then stopped, so you're producing from memory rather than
 * matching a tone that's still ringing (and so the app can't hear its own
 * playback and score it as your voice).
 */
export function SingPanel({
  targetMidi,
  targetLabel,
  tolerance,
  onOutcome,
  onReplayReference,
}: {
  targetMidi: number;
  targetLabel: string;
  tolerance: number;
  onOutcome: (outcome: SingOutcome) => void;
  onReplayReference: () => void;
}) {
  const { state, frameRef, start } = useMic();
  const [held, setHeld] = useState(0);

  const needleRef = useRef<HTMLDivElement>(null);
  const centsRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);

  const holdRef = useRef(0);
  const lastInRef = useRef(0);
  const startedAt = useRef(performance.now());
  const done = useRef(false);
  const outcomeRef = useRef(onOutcome);
  outcomeRef.current = onOutcome;

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (state !== 'listening') return;
    let raf = 0;
    let lastTick = performance.now();

    const tick = () => {
      const nowMs = performance.now();
      const dt = nowMs - lastTick;
      lastTick = nowMs;

      const frame = frameRef.current;
      const cents = frameCents(frame, targetMidi);

      if (needleRef.current) {
        const clamped = Math.max(-RANGE, Math.min(RANGE, cents ?? 0));
        needleRef.current.style.left = `${50 + (clamped / RANGE) * 50}%`;
        needleRef.current.style.opacity = cents === null ? '0.25' : '1';
        needleRef.current.style.backgroundColor =
          cents !== null && Math.abs(cents) <= tolerance
            ? 'var(--nw-correct)'
            : 'var(--nw-accent)';
      }
      if (centsRef.current) {
        centsRef.current.textContent =
          cents === null ? '—' : `${cents > 0 ? '+' : ''}${Math.round(cents)}`;
      }
      if (noteRef.current) {
        noteRef.current.textContent = frame.midi === null ? 'listening' : midiToName(frame.midi);
      }
      if (levelRef.current) {
        levelRef.current.style.transform = `scaleX(${Math.min(1, frame.level)})`;
      }

      if (!done.current) {
        const inTune = cents !== null && Math.abs(cents) <= tolerance;
        if (inTune) {
          holdRef.current += dt;
          lastInRef.current = nowMs;
        } else if (nowMs - lastInRef.current > GRACE_MS) {
          holdRef.current = 0;
        }

        setHeld(Math.min(1, holdRef.current / HOLD_MS));

        if (holdRef.current >= HOLD_MS) {
          done.current = true;
          outcomeRef.current('hit');
        } else if (nowMs - startedAt.current > TIMEOUT_MS) {
          done.current = true;
          outcomeRef.current('timeout');
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, frameRef, targetMidi, tolerance]);

  if (state !== 'listening') {
    return <MicGate state={state} onRetry={start} onSkip={() => onOutcome('skipped')} />;
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="label text-subtle">Sing</span>
        <p className="mt-1 text-[28px] leading-none font-bold tracking-tight text-accent">
          {targetLabel}
        </p>
      </div>

      {/* Tuning meter. The shaded middle is the accepted band. */}
      <div className="relative h-16 overflow-hidden rounded-xl border border-line bg-surface">
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-correct-wash"
          style={{ width: `${(tolerance / RANGE) * 100}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-strong" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <div
          ref={needleRef}
          className="absolute inset-y-2 w-1 -translate-x-1/2 rounded-full bg-accent transition-colors"
          style={{ left: '50%' }}
        />
        <span className="label absolute bottom-1 left-2 text-subtle">flat</span>
        <span className="label absolute right-2 bottom-1 text-subtle">sharp</span>
      </div>

      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <span
            ref={centsRef}
            className="tnum block font-mono text-[26px] leading-none font-bold tracking-tight"
          >
            —
          </span>
          <span className="label mt-1 block text-subtle">cents</span>
        </div>
        <div className="text-center">
          <span ref={noteRef} className="tnum block font-mono text-[26px] leading-none font-bold">
            listening
          </span>
          <span className="label mt-1 block text-subtle">you</span>
        </div>
      </div>

      {/* Hold progress, and a quiet input-level bar so a dead mic is obvious. */}
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-correct transition-[width] duration-100"
            style={{ width: `${held * 100}%` }}
          />
        </div>
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-surface-2">
          <div ref={levelRef} className="h-full origin-left bg-cool/50" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-[13px]">
        <button onClick={onReplayReference} className="py-2 text-subtle transition hover:text-ink">
          Hear it again
        </button>
        <button
          onClick={() => onOutcome('skipped')}
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
      body: "This browser doesn't offer microphone access. The other levels don't need it.",
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
