import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, IconButton, Label, Screen } from '@/components/ui';
import { midiToName } from '@/core/music';
import {
  MIN_USABLE_SEMITONES,
  PLAUSIBLE_HIGH,
  PLAUSIBLE_LOW,
  describeSpan,
  isUsable,
  spanInOctaves,
  type VocalRange,
} from '@/core/range';
import { useMic } from '@/mic/useMic';
import { medianOf } from '@/mic/pitch';
import { playSequence, unlockAudio } from '@/audio/engine';
import { useStore } from '@/store/useStore';

/** How long a note must hold steady before it counts as sung. */
const HOLD_MS = 1100;
/** Spread allowed inside the hold window, in semitones. Singing wobbles. */
const STABILITY = 1.6;
/** Frames older than this are dropped, so an abandoned attempt decays away. */
const WINDOW_MS = 1400;

type Step = 'intro' | 'low' | 'high' | 'done';

/**
 * Find your range, once.
 *
 * The sung drills grade on pitch class, so nobody was ever marked wrong for
 * singing in their own octave. The problem was the other direction: the
 * reference the app played sat around middle C regardless, so a low voice had
 * to transpose the prompt before answering it — an extra step, harder than
 * the skill being trained. Measured once, every sung reference moves to fit.
 */
export default function VocalRange() {
  const navigate = useNavigate();
  const saved = useStore((s) => s.vocalRange);
  const setVocalRange = useStore((s) => s.setVocalRange);

  const [step, setStep] = useState<Step>('intro');
  const [low, setLow] = useState<number | null>(null);
  const [high, setHigh] = useState<number | null>(null);
  const [tooClose, setTooClose] = useState(false);

  const range: VocalRange | null = low !== null && high !== null ? { low, high } : null;

  function capture(midi: number) {
    if (step === 'low') {
      setLow(midi);
      setStep('high');
      return;
    }
    if (step === 'high') {
      // Someone who sings both prompts at the same pitch hasn't given us a
      // range — say so rather than storing something useless.
      if (low !== null && Math.abs(midi - low) < MIN_USABLE_SEMITONES) {
        setTooClose(true);
        return;
      }
      setHigh(midi);
      setStep('done');
    }
  }

  function save() {
    if (!range) return;
    // Whichever came out lower is the low note, however they were sung.
    setVocalRange({ low: Math.min(range.low, range.high), high: Math.max(range.low, range.high) });
    navigate(-1);
  }

  function restart() {
    setLow(null);
    setHigh(null);
    setTooClose(false);
    setStep('low');
  }

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-4 py-2">
        <IconButton label="Back" onClick={() => navigate(-1)}>
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
        <span className="label text-subtle">Your range</span>
      </header>

      {step === 'intro' && (
        <Intro
          saved={saved}
          onStart={async () => {
            await unlockAudio();
            setStep('low');
          }}
          onClear={() => setVocalRange(null)}
        />
      )}

      {(step === 'low' || step === 'high') && (
        <Capture
          step={step}
          alreadyGot={step === 'high' ? low : null}
          tooClose={tooClose}
          onCapture={capture}
          onRetry={() => setTooClose(false)}
        />
      )}

      {step === 'done' && range && <Result range={range} onSave={save} onRestart={restart} />}
    </Screen>
  );
}

function Intro({
  saved,
  onStart,
  onClear,
}: {
  saved: VocalRange | null;
  onStart: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <Label className="text-accent">Takes about a minute</Label>
      <h1 className="mt-3 text-[32px] leading-[1.08] font-bold tracking-[-0.04em] text-balance">
        Where does your voice live?
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        Sing your lowest comfortable note, then your highest. After that every exercise that asks
        you to sing will play its notes in your octave instead of somewhere you'd have to reach.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-subtle">
        Comfortable, not extreme — the point is where you can hold a note, not how far you can push.
        Nothing is recorded; the notes stay on this device.
      </p>

      {isUsable(saved) && (
        <Card className="mt-6">
          <Label>Currently saved</Label>
          <p className="tnum mt-2 text-[17px] font-bold tracking-tight">
            {midiToName(saved.low)} – {midiToName(saved.high)}
          </p>
          <p className="mt-1 text-[13.5px] text-subtle">
            {describeSpan(saved)} · {spanInOctaves(saved)} octaves
          </p>
        </Card>
      )}

      <div className="mt-8 space-y-3">
        <Button onClick={onStart}>{isUsable(saved) ? 'Measure again' : 'Start'}</Button>
        {isUsable(saved) && (
          <Button variant="ghost" onClick={onClear}>
            Forget my range
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * One captured note. A pitch has to hold steady for a beat before it counts —
 * a slide through a note on the way somewhere else is not a note you can sing.
 */
function Capture({
  step,
  alreadyGot,
  tooClose,
  onCapture,
  onRetry,
}: {
  step: 'low' | 'high';
  alreadyGot: number | null;
  tooClose: boolean;
  onCapture: (midi: number) => void;
  onRetry: () => void;
}) {
  const { state, frameRef, start } = useMic();
  const [held, setHeld] = useState(0);
  const [live, setLive] = useState<number | null>(null);

  const history = useRef<{ midi: number; at: number }[]>([]);
  const done = useRef(false);
  const captureRef = useRef(onCapture);
  captureRef.current = onCapture;

  useEffect(() => {
    void start();
  }, [start]);

  /**
   * One microphone session for both notes.
   *
   * This deliberately does not remount per step. Unmounting tears the stream
   * down and the next step has to re-acquire it, which costs a beat and, on
   * some browsers, asks for permission again — in the middle of a flow the
   * user already agreed to.
   *
   * `step` is in the deps so a new note restarts the loop with a clean window:
   * the previous note's frames are still sitting in it and would otherwise
   * satisfy the hold instantly.
   */
  useEffect(() => {
    if (state !== 'listening' || tooClose) return;
    let raf = 0;
    history.current = [];
    done.current = false;
    setHeld(0);
    setLive(null);

    const tick = () => {
      const nowMs = performance.now();
      const frame = frameRef.current;

      if (frame.midi !== null && frame.midi >= PLAUSIBLE_LOW && frame.midi <= PLAUSIBLE_HIGH) {
        history.current.push({ midi: frame.midi, at: nowMs });
      }
      history.current = history.current.filter((h) => nowMs - h.at < WINDOW_MS);

      const midis = history.current.map((h) => h.midi);
      setLive(midis.length ? medianOf(midis) : null);

      // Steady means the whole window sits inside a narrow band — not just
      // that the median is stable, which a slow slide would also satisfy.
      const steady =
        midis.length > 6 && Math.max(...midis) - Math.min(...midis) <= STABILITY
          ? nowMs - history.current[0].at
          : 0;
      setHeld(Math.min(1, steady / HOLD_MS));

      if (!done.current && steady >= HOLD_MS) {
        done.current = true;
        const captured = Math.round(medianOf(midis));
        playSequence([captured], 0, 0.8, 0.24);
        captureRef.current(captured);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, frameRef, tooClose, step]);

  const retry = useCallback(() => {
    onRetry();
    void start();
  }, [onRetry, start]);

  if (state !== 'listening') {
    return (
      <div className="flex flex-1 flex-col justify-center py-6">
        <Card>
          <h2 className="text-[17px] font-bold tracking-tight">
            {state === 'denied' ? 'Microphone blocked' : 'This needs your microphone'}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {state === 'denied'
              ? 'Your browser is refusing access. You can change that in the site settings.'
              : state === 'unsupported'
                ? "This browser doesn't offer microphone access."
                : 'It stays on your device — nothing is recorded, stored, or sent anywhere.'}
          </p>
          <div className="mt-4 space-y-2">
            {state !== 'unsupported' && <Button onClick={() => void start()}>Allow microphone</Button>}
          </div>
        </Card>
      </div>
    );
  }

  if (tooClose) {
    return (
      <div className="flex flex-1 flex-col justify-center py-6">
        <Card tone="cool">
          <Label className="text-cool">That was the same note</Label>
          <p className="mt-2.5 text-[15px] leading-relaxed">
            Your two notes came out within a few semitones of each other, which doesn't give a range
            to work with. Try again, and this time reach for a note that's clearly higher — still
            comfortable, just further up.
          </p>
          <Button className="mt-4" onClick={retry}>
            Try the high note again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-6 text-center">
      <div>
        <Label className="text-accent">{step === 'low' ? 'Note 1 of 2' : 'Note 2 of 2'}</Label>
        <h1 className="mt-3 text-[30px] leading-[1.1] font-bold tracking-[-0.04em] text-balance">
          {step === 'low' ? 'Sing your lowest comfortable note' : 'Now your highest'}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Any vowel. Hold it steady for about a second.
        </p>
        {alreadyGot !== null && (
          <p className="tnum mt-3 font-mono text-xs text-subtle">low: {midiToName(alreadyGot)}</p>
        )}
      </div>

      <div>
        <span className="tnum block font-mono text-[52px] leading-none font-bold tracking-tight">
          {live === null ? '—' : midiToName(live)}
        </span>
        <span className="label mt-2 block text-subtle">what we're hearing</span>
      </div>

      <div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-correct transition-[width] duration-100"
            style={{ width: `${held * 100}%` }}
          />
        </div>
        <p className="mt-2.5 text-[13px] text-subtle">
          {held > 0 ? 'Hold it…' : 'Waiting for a steady note'}
        </p>
      </div>
    </div>
  );
}

function Result({
  range,
  onSave,
  onRestart,
}: {
  range: VocalRange;
  onSave: () => void;
  onRestart: () => void;
}) {
  const low = Math.min(range.low, range.high);
  const high = Math.max(range.low, range.high);

  return (
    <div className="anim-rise flex flex-1 flex-col justify-center py-6">
      <Label className="text-accent">That's your range</Label>
      <p className="tnum mt-4 text-[44px] leading-none font-bold tracking-[-0.04em]">
        {midiToName(low)} <span className="text-subtle">–</span> {midiToName(high)}
      </p>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        {describeSpan({ low, high })} — {spanInOctaves({ low, high })} octaves. Every exercise that
        asks you to sing will now play its notes here, so you never have to transpose a prompt
        before answering it.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-subtle">
        Answers are still graded on the note, not the octave, so singing somewhere else is never
        wrong.
      </p>

      <div className="mt-8 space-y-3">
        <Button onClick={onSave}>Save it</Button>
        <Button variant="ghost" onClick={onRestart}>
          Measure again
        </Button>
      </div>
    </div>
  );
}
