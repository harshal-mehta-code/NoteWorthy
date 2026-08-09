import { describe, expect, it } from 'vitest';
import { centsFromNearestOctave, detectPitch, hzToMidiFloat, medianOf } from './pitch';

const RATE = 44100;
const SIZE = 4096;

/** A voice-like tone: fundamental plus a few decaying harmonics. */
function tone(hz: number, opts: { harmonics?: number; amp?: number; noise?: number } = {}) {
  const { harmonics = 5, amp = 0.3, noise = 0 } = opts;
  const buf = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const t = i / RATE;
    let v = 0;
    for (let h = 1; h <= harmonics; h++) {
      v += Math.sin(2 * Math.PI * hz * h * t + h) / h;
    }
    buf[i] = v * amp + (noise ? (Math.random() * 2 - 1) * noise : 0);
  }
  return buf;
}

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe('detectPitch', () => {
  it('finds the fundamental across the singing range', () => {
    for (const hz of [98, 131, 165, 220, 262, 330, 440, 523, 659, 880]) {
      const result = detectPitch(tone(hz), RATE);
      expect(result, `no detection at ${hz}Hz`).not.toBeNull();
      expect(Math.abs(cents(result!.hz, hz)), `${hz}Hz off by too much`).toBeLessThan(15);
    }
  });

  it('does not drop an octave on harmonic-rich tones', () => {
    // The classic failure: a bright tone read as half its frequency.
    for (const hz of [110, 147, 196, 294]) {
      const result = detectPitch(tone(hz, { harmonics: 12 }), RATE);
      expect(result).not.toBeNull();
      const ratio = result!.hz / hz;
      expect(ratio, `${hz}Hz reported at ${result!.hz.toFixed(1)}Hz`).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    }
  });

  it('survives a noisy signal', () => {
    const result = detectPitch(tone(220, { noise: 0.05 }), RATE);
    expect(result).not.toBeNull();
    expect(Math.abs(cents(result!.hz, 220))).toBeLessThan(25);
  });

  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(SIZE), RATE)).toBeNull();
  });

  it('returns null for a very quiet signal', () => {
    expect(detectPitch(tone(220, { amp: 0.002 }), RATE)).toBeNull();
  });

  it('returns null for noise with no pitch', () => {
    const buf = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) buf[i] = (Math.random() * 2 - 1) * 0.3;
    expect(detectPitch(buf, RATE)).toBeNull();
  });

  it('reports high clarity for a clean tone', () => {
    const result = detectPitch(tone(261.63), RATE);
    expect(result!.clarity).toBeGreaterThan(0.9);
  });

  it('ignores anything outside the configured range', () => {
    expect(detectPitch(tone(40), RATE)).toBeNull();
  });
});

describe('centsFromNearestOctave', () => {
  const c4 = 60;

  it('is zero when you sing the target exactly', () => {
    expect(centsFromNearestOctave(60, c4)).toBeCloseTo(0);
  });

  it('is zero in any octave, because that is still the right note', () => {
    expect(centsFromNearestOctave(48, c4)).toBeCloseTo(0);
    expect(centsFromNearestOctave(72, c4)).toBeCloseTo(0);
    expect(centsFromNearestOctave(84, c4)).toBeCloseTo(0);
  });

  it('signs sharp positive and flat negative', () => {
    expect(centsFromNearestOctave(60.25, c4)).toBeCloseTo(25);
    expect(centsFromNearestOctave(59.75, c4)).toBeCloseTo(-25);
  });

  it('takes the nearer side of the octave', () => {
    // A semitone below the octave above is 100 cents flat, not 1100 sharp.
    expect(centsFromNearestOctave(71, c4)).toBeCloseTo(-100);
    expect(centsFromNearestOctave(61, c4)).toBeCloseTo(100);
  });

  it('never reports more than a tritone away', () => {
    for (let m = 40; m < 90; m += 0.37) {
      expect(Math.abs(centsFromNearestOctave(m, c4))).toBeLessThanOrEqual(600.001);
    }
  });
});

describe('helpers', () => {
  it('converts hz to midi', () => {
    expect(hzToMidiFloat(440)).toBeCloseTo(69);
    expect(hzToMidiFloat(261.626)).toBeCloseTo(60, 2);
  });

  it('takes a median of odd and even runs', () => {
    expect(medianOf([3, 1, 2])).toBe(2);
    expect(medianOf([4, 1, 3, 2])).toBe(2.5);
  });
});
