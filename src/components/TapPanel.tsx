import { useCallback, useEffect, useRef, useState } from 'react';
import { RhythmStaff } from '@/components/RhythmStaff';
import { audioNow, scheduleClick } from '@/audio/engine';
import { patternDurationMs, soundingNotes, type RhythmPattern } from '@/core/rhythm';

export type TapOutcome = { taps: number[] };

type Stage = 'ready' | 'counting' | 'playing' | 'done';

/**
 * Tap the rhythm you can see.
 *
 * Timing is taken from the **audio clock**, not `performance.now()`. The two
 * drift apart, and the metronome the person is playing against is scheduled
 * on the audio clock — measuring taps on a different clock would introduce a
 * wandering error that looks exactly like bad timing.
 *
 * A count-in bar always precedes the pattern. Starting cold means the first
 * note is a guess at the tempo rather than a reading of the rhythm, which
 * would fail people on the one note they had no way to place.
 */
export function TapPanel({
  pattern,
  bpm,
  countIn,
  clickThrough,
  onOutcome,
}: {
  pattern: RhythmPattern;
  bpm: number;
  /** Beats of count-in before the bar starts. */
  countIn: number;
  /** Keep clicking under the pattern, or drop out after the count-in. */
  clickThrough: boolean;
  onOutcome: (outcome: TapOutcome) => void;
}) {
  const msPerBeat = 60000 / bpm;
  const [stage, setStage] = useState<Stage>('ready');
  const [beat, setBeat] = useState(-1);
  const [tapCount, setTapCount] = useState(0);

  const taps = useRef<number[]>([]);
  /** Audio-clock time at which beat 0 of the pattern lands. */
  const zero = useRef(0);
  const timers = useRef<number[]>([]);
  const outcomeRef = useRef(onOutcome);
  outcomeRef.current = onOutcome;

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const start = useCallback(() => {
    clear();
    taps.current = [];
    setTapCount(0);
    setStage('counting');

    const startAt = audioNow() + 0.35;
    zero.current = startAt + (countIn * msPerBeat) / 1000;

    const totalBeats = pattern.beatsPerBar * pattern.bars;
    const clicks = clickThrough ? countIn + totalBeats : countIn;

    for (let b = 0; b < clicks; b++) {
      const at = startAt + (b * msPerBeat) / 1000;
      const inPattern = b >= countIn;
      scheduleClick(at, (b - countIn) % pattern.beatsPerBar === 0);

      // The visual beat is driven off the same schedule, converted to wall
      // time once — close enough for a pulse, and it cannot drift apart from
      // the clicks the way an independent interval would.
      const delayMs = (at - audioNow()) * 1000;
      timers.current.push(
        window.setTimeout(() => {
          setBeat(inPattern ? b - countIn : -(countIn - b));
          if (inPattern && b === countIn) setStage('playing');
        }, Math.max(0, delayMs)),
      );
    }

    // A tail past the end, so a late final tap still counts.
    const endMs =
      (countIn * msPerBeat) + patternDurationMs(pattern, msPerBeat) + msPerBeat * 0.75;
    timers.current.push(
      window.setTimeout(
        () => {
          setStage('done');
          setBeat(-1);
          outcomeRef.current({ taps: taps.current });
        },
        endMs + (startAt - audioNow()) * 1000,
      ),
    );
  }, [pattern, msPerBeat, countIn, clickThrough]);

  const tap = useCallback(() => {
    if (stage !== 'counting' && stage !== 'playing') return;
    // Milliseconds from beat 0 of the pattern. Taps during the count-in come
    // out negative and simply match nothing, which is the right outcome.
    taps.current.push((audioNow() - zero.current) * 1000);
    setTapCount(taps.current.length);
  }, [stage]);

  // Space is the natural key for this, and holding it must not auto-repeat.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      if (stage === 'ready' || stage === 'done') start();
      else tap();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [stage, start, tap]);

  const total = soundingNotes(pattern).length;
  const running = stage === 'counting' || stage === 'playing';

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl border border-line bg-surface px-2 py-4">
        <RhythmStaff pattern={pattern} playing={-1} />
      </div>

      {/* Beat pulse: the count-in shown as a countdown, then the bar. */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: pattern.beatsPerBar }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              stage === 'playing' && beat % pattern.beatsPerBar === i
                ? 'w-6 bg-accent'
                : 'w-3 bg-surface-3'
            }`}
          />
        ))}
      </div>

      <button
        onPointerDown={(e) => {
          e.preventDefault();
          if (stage === 'ready' || stage === 'done') start();
          else tap();
        }}
        className={`grid h-32 w-full place-items-center rounded-2xl border text-center transition active:scale-[0.99] ${
          running
            ? 'border-accent bg-accent-wash'
            : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
        }`}
      >
        {stage === 'ready' || stage === 'done' ? (
          <span className="px-6">
            <span className="block text-[17px] font-bold tracking-tight">Tap to start</span>
            <span className="mt-1 block text-[13.5px] leading-snug text-muted">
              One bar of clicks first, then tap the rhythm — {total}{' '}
              {total === 1 ? 'note' : 'notes'}.
            </span>
          </span>
        ) : stage === 'counting' ? (
          <span className="tnum text-[40px] leading-none font-bold text-accent">
            {countIn + beat}
          </span>
        ) : (
          <span>
            <span className="tnum block text-[34px] leading-none font-bold text-accent">
              {tapCount}
            </span>
            <span className="label mt-2 block text-accent">keep tapping</span>
          </span>
        )}
      </button>

      <p className="text-center text-[12.5px] text-subtle">
        {bpm} bpm{clickThrough ? ' · click stays on' : ' · the click drops out after the count-in'}
      </p>
    </div>
  );
}
