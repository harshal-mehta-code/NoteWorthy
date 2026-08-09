import { useCallback, useEffect, useRef, useState } from 'react';
import { centsFromNearestOctave, detectPitch, hzToMidiFloat, medianOf } from './pitch';

export type MicState = 'idle' | 'requesting' | 'listening' | 'denied' | 'unsupported' | 'error';

export type MicFrame = {
  /** Null when the window was silence or too aperiodic to trust. */
  midi: number | null;
  hz: number | null;
  /** 0-1, for the level meter — always present, even during silence. */
  level: number;
  at: number;
};

const FFT_SIZE = 4096;
/** Frames to smooth over. Three kills onset noise without adding lag you feel. */
const SMOOTHING = 3;

/**
 * Microphone capture with pitch tracking.
 *
 * Permission is never requested on load — only when a drill that needs it is
 * actually started, and declining leaves the rest of the app working. See
 * docs/04-ARCHITECTURE.md §3.3.
 *
 * The latest reading lands in a ref rather than state: at 60fps, state would
 * re-render the whole screen for every frame. Consumers animate from the ref
 * and take the low-frequency `state` for anything that needs to re-render.
 */
export function useMic() {
  const [state, setState] = useState<MicState>('idle');
  const frameRef = useRef<MicFrame>({ midi: null, hz: null, level: 0, at: 0 });

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  /** Guards against a second start() while the first is still awaiting. */
  const startingRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    historyRef.current = [];
    startingRef.current = false;
    frameRef.current = { midi: null, hz: null, level: 0, at: 0 };
    // Only a live session resets to idle. Clearing 'denied', 'error' or
    // 'unsupported' here would replace the explanation the user needs with a
    // blank prompt — which is exactly what it did before this guard.
    setState((s) => (s === 'listening' || s === 'requesting' ? 'idle' : s));
  }, []);

  const start = useCallback(async () => {
    // StrictMode mounts effects twice; without this the second call opens a
    // second stream that the first cleanup never sees.
    if (streamRef.current || startingRef.current) return;
    startingRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      startingRef.current = false;
      setState('unsupported');
      return;
    }

    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Echo cancellation matters: without it the app's own playback
          // leaks into the mic and can be detected as if it were sung.
          echoCancellation: true,
          noiseSuppression: true,
          // Left off deliberately — AGC pumps the level and makes the
          // silence gate unreliable.
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      // Rolls off rumble and handling noise below the singing range.
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 65;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      source.connect(highpass);
      highpass.connect(analyser);

      const buf = new Float32Array(analyser.fftSize);
      startingRef.current = false;
      setState('listening');

      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        const result = detectPitch(buf, ctx.sampleRate);

        if (result) {
          const midi = hzToMidiFloat(result.hz);
          const history = historyRef.current;
          history.push(midi);
          if (history.length > SMOOTHING) history.shift();

          // Median over the window, but only once there is a window — a
          // single frame is reported as-is so the meter responds instantly.
          const smoothed = history.length >= SMOOTHING ? medianOf(history) : midi;
          frameRef.current = {
            midi: smoothed,
            hz: 440 * Math.pow(2, (smoothed - 69) / 12),
            level: Math.min(1, result.rms * 8),
            at: performance.now(),
          };
        } else {
          historyRef.current = [];
          frameRef.current = {
            midi: null,
            hz: null,
            level: frameRef.current.level * 0.8,
            at: performance.now(),
          };
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = (err as { name?: string }).name;
      startingRef.current = false;
      stop();
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { state, frameRef, start, stop };
}

/** Deviation from the nearest octave of the target, or null if nothing sung. */
export function frameCents(frame: MicFrame, targetMidi: number): number | null {
  if (frame.midi === null) return null;
  return centsFromNearestOctave(frame.midi, targetMidi);
}
