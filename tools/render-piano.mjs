/**
 * Renders the piano sample set used by src/audio/sampler.ts.
 *
 *   node tools/render-piano.mjs
 *
 * Output is committed, so the app has no build-time audio step. Run this
 * again only if the model changes.
 *
 * These are *rendered*, not recordings of a real instrument — no offline
 * source of licence-clean piano recordings was available. The synthesis is a
 * physically-informed string model rather than a plain oscillator stack, and
 * because it renders offline it can afford far more partials than realtime
 * synthesis could. Swapping in real recordings later is a file drop: keep the
 * names and the sampler needs no changes.
 *
 * Model, briefly:
 *  - three slightly detuned strings per note, as a real piano has
 *  - partials stretched by inharmonicity, f_n = n·f0·√(1 + B·n²)
 *  - the hammer strikes near 1/8 of the string, which nulls the 8th partial
 *  - higher partials decay faster, over a fast + slow two-stage envelope
 *  - a short filtered noise burst for the hammer/key transient
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples', 'piano');
const RATE = 22050;

/** Sampled every 4 semitones, so nothing is shifted more than a tone. */
const NOTES = [48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88];

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** Deterministic RNG so re-rendering produces identical files. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function renderNote(midi) {
  const f0 = hz(midi);
  // Longer for the bass, shorter up top — matches how a piano actually rings,
  // and keeps the files small. Runtime applies its own release fade.
  const seconds = Math.min(2.6, Math.max(1.15, 2.6 * Math.pow(2, -(midi - 48) / 36)));
  const n = Math.round(seconds * RATE);
  const out = new Float64Array(n);
  const rand = rng(midi * 7919 + 13);

  // Inharmonicity rises with pitch (shorter, stiffer strings).
  const B = 0.00007 * Math.pow(2, (midi - 48) / 18);
  // Bass is richer in upper partials; treble is nearly pure.
  const alpha = 1.05 + (midi - 48) / 90;
  const tauSlow = 6.0 * Math.pow(2, -(midi - 48) / 22);
  const tauFast = tauSlow * 0.16;
  const nyquist = RATE / 2;
  const strikePoint = 1 / 8;

  const strings = [
    { detune: -2.4, gain: 0.9 },
    { detune: 0.0, gain: 1.0 },
    { detune: 2.9, gain: 0.85 },
  ];

  for (const string of strings) {
    const fStr = f0 * Math.pow(2, string.detune / 1200);

    for (let p = 1; p <= 48; p++) {
      const fp = p * fStr * Math.sqrt(1 + B * p * p);
      if (fp > nyquist * 0.94) break;

      // Hammer position nulls partials at multiples of 1/strikePoint.
      const hammer = Math.abs(Math.sin(Math.PI * p * strikePoint));
      const amp = (string.gain * hammer) / Math.pow(p, alpha);
      if (amp < 0.00035) continue;

      const tf = tauFast / Math.pow(p, 0.5);
      const ts = tauSlow / Math.pow(p, 0.62);
      const phase = rand() * Math.PI * 2;
      const w = 2 * Math.PI * fp;

      for (let i = 0; i < n; i++) {
        const t = i / RATE;
        const env = 0.42 * Math.exp(-t / tf) + 0.58 * Math.exp(-t / ts);
        if (env < 0.00012) break;
        out[i] += amp * env * Math.sin(w * t + phase);
      }
    }
  }

  // Hammer/key transient: a brief noise burst, brightest at the very start.
  const noiseLen = Math.round(0.02 * RATE);
  let lp = 0;
  for (let i = 0; i < noiseLen; i++) {
    const t = i / RATE;
    const raw = rand() * 2 - 1;
    lp += (raw - lp) * 0.45;
    out[i] += lp * 0.1 * Math.exp(-t / 0.006);
  }

  // Soft attack so the onset never clicks.
  const attack = Math.round(0.004 * RATE);
  for (let i = 0; i < attack; i++) out[i] *= i / attack;

  // Fade the tail out, again to avoid a click at the loop point.
  const fade = Math.round(0.06 * RATE);
  for (let i = 0; i < fade; i++) {
    const idx = n - fade + i;
    out[idx] *= 1 - i / fade;
  }

  // Normalise, leaving headroom.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const scale = peak > 0 ? 0.89 / peak : 0;

  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, out[i] * scale));
    pcm.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return pcm;
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const midi of NOTES) {
  const file = wav(renderNote(midi));
  writeFileSync(join(OUT, `${midi}.wav`), file);
  total += file.length;
  process.stdout.write(`  ${midi}.wav  ${(file.length / 1024).toFixed(0)} KB\n`);
}
console.log(`${NOTES.length} samples, ${(total / 1024 / 1024).toFixed(2)} MB total`);
