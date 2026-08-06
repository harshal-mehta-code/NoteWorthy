/**
 * Sample playback for the piano.
 *
 * One recording every four semitones, pitch-shifted by at most a tone to
 * cover everything between — close enough that the shift is inaudible.
 * Samples are rendered by tools/render-piano.mjs; see that file for what the
 * model is and why they aren't recordings.
 *
 * Loading is lazy and never blocks: the synth in engine.ts covers the first
 * moments and any failure, so the app always makes sound.
 */

const SAMPLE_MIDIS = [48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88];
const BASE_URL = `${import.meta.env.BASE_URL}samples/piano/`;

const buffers = new Map<number, AudioBuffer>();
let loading: Promise<void> | null = null;
let failed = false;

export function samplesReady(): boolean {
  return buffers.size > 0;
}

/**
 * Fetch and decode the set. Resolves once every sample that could be
 * fetched is decoded; individual failures are tolerated, since a partial set
 * still sounds better than the synth.
 */
export function loadSamples(ctx: AudioContext): Promise<void> {
  if (loading) return loading;

  loading = Promise.all(
    SAMPLE_MIDIS.map(async (midi) => {
      try {
        const res = await fetch(`${BASE_URL}${midi}.wav`);
        if (!res.ok) throw new Error(String(res.status));
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        buffers.set(midi, buf);
      } catch {
        // Left to the synth fallback.
      }
    }),
  ).then(() => {
    failed = buffers.size === 0;
  });

  return loading;
}

export function samplesFailed(): boolean {
  return failed;
}

function nearestSample(midi: number): number {
  let best = SAMPLE_MIDIS[0];
  for (const m of SAMPLE_MIDIS) {
    if (!buffers.has(m)) continue;
    if (Math.abs(m - midi) < Math.abs(best - midi)) best = m;
  }
  return best;
}

/**
 * Every sample is normalised to the same peak, which makes the top of the
 * range sound louder than the bottom. This tilts it back — mild, because
 * over-correcting makes the bass sound thin.
 */
function registerTrim(midi: number): number {
  return Math.pow(2, -(midi - 60) / 48);
}

/**
 * Play one note. `dur` is how long the key is held; a short release fade
 * follows, so notes can be cut off without clicking.
 */
export function playSampled(
  ctx: AudioContext,
  destination: AudioNode,
  midi: number,
  at: number,
  dur: number,
  level: number,
): boolean {
  const source = nearestSample(midi);
  const buffer = buffers.get(source);
  if (!buffer) return false;

  const node = ctx.createBufferSource();
  node.buffer = buffer;
  node.playbackRate.value = Math.pow(2, (midi - source) / 12);

  const gain = ctx.createGain();
  const peak = level * registerTrim(midi) * 3.1;
  const release = 0.14;

  gain.gain.setValueAtTime(peak, at);
  gain.gain.setValueAtTime(peak, at + dur);
  gain.gain.linearRampToValueAtTime(0.0001, at + dur + release);

  node.connect(gain);
  gain.connect(destination);
  node.start(at);
  node.stop(at + dur + release + 0.02);
  return true;
}
