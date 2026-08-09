/**
 * Pitch detection — McLeod Pitch Method (normalised square difference).
 *
 * Chosen over plain autocorrelation because it is far more resistant to
 * octave errors, which is the failure mode that matters here: reporting a
 * sung note an octave low turns a correct answer into a wrong one.
 *
 * Runs on the main thread from an AnalyserNode. That is a deliberate first
 * step, not the end state: an AudioWorklet (docs/04-ARCHITECTURE.md §3.3) is
 * the right home for it, and this function moves there unchanged because it
 * is pure. The cost is kept small by decimating 2:1 before the search — the
 * voice lives well below 11 kHz, so nothing useful is lost.
 */

export type PitchResult = {
  hz: number;
  /** 0-1. How periodic the window was; low means noise or a bad read. */
  clarity: number;
  /** RMS of the window, for the noise gate and the level meter. */
  rms: number;
};

export type DetectOptions = {
  /** Below this RMS the window is treated as silence. */
  minRms?: number;
  /** Below this NSDF peak the reading is discarded. */
  minClarity?: number;
  minHz?: number;
  maxHz?: number;
};

const DEFAULTS = {
  minRms: 0.012,
  minClarity: 0.85,
  // A generous singing range: low bass to high soprano, with headroom.
  minHz: 70,
  maxHz: 1100,
};

/**
 * Detect the fundamental of one window. Returns null for silence, noise, or
 * anything too aperiodic to trust.
 */
export function detectPitch(
  input: Float32Array,
  sampleRate: number,
  options: DetectOptions = {},
): PitchResult | null {
  const opts = { ...DEFAULTS, ...options };

  // Decimate 2:1. Averaging pairs is a crude low-pass, but it is enough to
  // keep aliasing out of the range we search.
  const n = input.length >> 1;
  if (n < 128) return null;
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = (input[2 * i] + input[2 * i + 1]) * 0.5;
  const rate = sampleRate / 2;

  // Remove DC, which otherwise inflates the autocorrelation at every lag.
  let mean = 0;
  for (let i = 0; i < n; i++) mean += buf[i];
  mean /= n;

  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    buf[i] -= mean;
    sumSq += buf[i] * buf[i];
  }
  const rms = Math.sqrt(sumSq / n);
  if (rms < opts.minRms) return null;

  const minLag = Math.max(2, Math.floor(rate / opts.maxHz));
  const maxLag = Math.min(n - 2, Math.ceil(rate / opts.minHz));
  if (maxLag <= minLag) return null;

  // NSDF: 2·r(τ) / m(τ), which sits in [-1, 1] and is amplitude-independent.
  //
  // Computed from lag 1, not from minLag: the peak-picking below has to see
  // the initial hump in order to skip past it, and for a high note the true
  // first peak sits only just above minLag. Starting the scan at minLag threw
  // that peak away and reported the note an octave low.
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let acf = 0;
    let m = 0;
    const limit = n - lag;
    for (let i = 0; i < limit; i++) {
      const a = buf[i];
      const b = buf[i + lag];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[lag] = m > 0 ? (2 * acf) / m : 0;
  }

  // Collect the maximum of each positively-sloped region — these are the
  // candidate periods.
  const peaks: number[] = [];
  let lag = 1;
  while (lag < maxLag && nsdf[lag] > 0) lag++; // skip the initial hump
  while (lag < maxLag) {
    if (nsdf[lag] > 0 && nsdf[lag - 1] <= 0) {
      let best = lag;
      while (lag < maxLag && nsdf[lag] > 0) {
        if (nsdf[lag] > nsdf[best]) best = lag;
        lag++;
      }
      // Peaks below minLag would be pitches above maxHz — out of range.
      if (best >= minLag) peaks.push(best);
    }
    lag++;
  }
  if (peaks.length === 0) return null;

  // McLeod's rule: take the *first* peak that clears a fraction of the
  // highest one. Taking the highest instead is what produces octave errors.
  let highest = 0;
  for (const p of peaks) highest = Math.max(highest, nsdf[p]);
  if (highest < opts.minClarity) return null;

  const threshold = highest * 0.9;
  let chosen = peaks[peaks.length - 1];
  for (const p of peaks) {
    if (nsdf[p] >= threshold) {
      chosen = p;
      break;
    }
  }

  // Parabolic interpolation, so resolution is not limited to whole samples.
  const y0 = nsdf[chosen - 1] ?? 0;
  const y1 = nsdf[chosen];
  const y2 = nsdf[chosen + 1] ?? 0;
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y2 - y0) / denom : 0;
  const period = chosen + (Math.abs(shift) < 1 ? shift : 0);
  if (period <= 0) return null;

  const hz = rate / period;
  if (hz < opts.minHz || hz > opts.maxHz) return null;

  return { hz, clarity: y1, rms };
}

export function hzToMidiFloat(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/**
 * How far a sung pitch is from the nearest octave of the target, in cents.
 *
 * Octave-agnostic on purpose: a bass and a soprano asked to sing home will
 * correctly produce notes an octave or two apart, and marking either wrong
 * would be nonsense. Range mapping (docs/02-FEATURES.md §4.1) would let us
 * be stricter later; until then, pitch class is the honest thing to grade.
 */
export function centsFromNearestOctave(midiFloat: number, targetMidi: number): number {
  const semis = midiFloat - targetMidi;
  const wrapped = ((semis % 12) + 12) % 12;
  return (wrapped > 6 ? wrapped - 12 : wrapped) * 100;
}

/**
 * Median of the last few readings. A single frame is noisy at the onset of a
 * note and around consonants; three frames smooths that without adding
 * latency anyone can feel.
 */
export function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
