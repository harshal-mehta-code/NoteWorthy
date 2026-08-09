# NoteWorthy — Architecture

## 1. Stack

| Concern | Choice | Version at planning time | Why |
|---|---|---|---|
| Build / dev | **Vite** | 8.x | Instant HMR; static output; no server needed |
| UI | **React + TypeScript** | React 19.x | Ecosystem, concurrent rendering for smooth drill transitions |
| Routing | **React Router** (data mode) | 7.x | Simple SPA routing, nested drill layouts |
| Styling | **Tailwind CSS v4** + CSS custom properties | 4.x | v4's CSS-first config maps cleanly to our design tokens |
| Motion | **Motion** (framer-motion) | 13.x | Layout animations for the Map; spring feedback |
| State | **Zustand** | 5.x | Minimal, no boilerplate, easy to slice per pillar |
| Persistence | **Dexie** (IndexedDB) | 4.x | Local-first; handles the review-log volume Fine |
| Audio scheduling | **Tone.js** | 15.x | Transport, precise scheduling, effects |
| Instrument samples | **smplr** + generated fallback synth | 1.x | Realistic piano; graceful degradation when samples aren't cached |
| Notation | **VexFlow** | 5.x | Programmatic engraving, SVG, full control |
| MusicXML (later) | **OpenSheetMusicDisplay** | 2.x | Only if we import external scores; VexFlow-based, so consistent |
| Pitch detection | **pitchy** (McLeod Pitch Method) in an AudioWorklet | 4.x | Accurate + fast enough for real-time; worklet keeps the main thread free |
| Spaced repetition | **ts-fsrs** | 5.x | Maintained TS implementation of FSRS |
| PWA | **vite-plugin-pwa** (Workbox) | latest | Manifest, service worker, precache, offline |
| Testing | **Vitest** + **Playwright** | latest | Unit for music theory core (pure functions — very testable), E2E for flows |

**Deliberately excluded from v1**: any backend, any auth, Next.js/SSR, a component library (we're building a bespoke design system), Redux, GraphQL.

### 1.1 Deployment
Static build → **Cloudflare Pages** (or GitHub Pages). Free, global CDN, instant. Custom domain later. No server, no database, no running costs — which is what makes "free forever" credible.

### 1.2 Why no backend in v1
Everything works local-first. Adding sync later means adding a sync layer over an existing local store — much easier than removing a backend. When we do add it (Phase 5), the shape is: Cloudflare D1/Workers or Supabase, storing the same schemas, last-write-wins per record with a `updatedAt` clock.

---

## 2. Directory layout

```
noteworthy/
├── public/                     # static assets, manifest, icons
│   └── samples/                # compressed instrument samples
├── src/
│   ├── app/                    # shell: routing, layout, providers, error boundaries
│   ├── design/                 # design system: tokens, primitives, icons
│   │   ├── tokens.css
│   │   └── components/         # Button, Card, Sheet, Progress, Chip, ...
│   ├── core/                   # PURE, dependency-free domain logic (heavily unit-tested)
│   │   ├── music/              # pitch, interval, scale, chord, key, roman numeral
│   │   ├── rhythm/             # durations, meters, tuplets, quantization
│   │   ├── generate/           # procedural melody / progression / rhythm generators
│   │   └── corpus/             # curated PD material + loaders + difficulty rating
│   ├── audio/                  # engine, sampler, synth, transport, metronome, feedback sounds
│   ├── notation/               # VexFlow wrapper: render, highlight, playhead, staff input
│   ├── mic/                    # AudioWorklet pitch detection, calibration, noise gate
│   ├── learning/               # scheduler (FSRS), ability model (Elo), mastery, item selection
│   ├── drills/                 # one folder per drill, all implementing the Drill contract
│   │   ├── _contract.ts
│   │   ├── degree-id/
│   │   ├── interval-id/
│   │   ├── melodic-dictation/
│   │   └── ...
│   ├── features/               # composed screens: warmup, map, profile, journal, onboarding
│   ├── store/                  # Zustand slices
│   ├── db/                     # Dexie schema, migrations, repositories
│   └── lib/                    # rng, timing, analytics, feature flags, utils
├── docs/                       # this planning set
├── prototype/                  # standalone HTML prototypes (not part of the build)
└── tests/
```

**The dependency rule**: `core/` imports nothing from the app. `drills/` may import `core`, `audio`, `notation`, `mic`. `features/` composes `drills`. Nothing imports upward. Enforced by an ESLint boundary rule so parallel sessions can't accidentally couple modules.

---

## 3. Key subsystems

### 3.1 Audio engine (`src/audio/`)
- Single `AudioContext`, created on first user gesture (browser requirement — plan the "tap to start" moment into onboarding rather than bolting it on).
- **Sampler**: piano samples via `smplr`, lazily loaded and cached in the service worker. A `SynthFallback` (Tone.js) covers first-load and offline-before-cache, so the app *always* makes sound.
- **Transport**: Tone.js `Transport` for anything scheduled; a lighter direct-scheduling path for one-shot drill stimuli (lower latency, less machinery).
- **`FeedbackSounds`**: generates the musical reward layer described in `03-GAMIFICATION.md` §2, parameterized by current key/tempo. Must not depend on samples being loaded.
- **Latency**: `outputLatency` + `baseLatency` from AudioContext, plus the measured calibration offset. Exposed as `audio.timing.offsetMs`.

### 3.2 Notation (`src/notation/`)
A thin, stable wrapper over VexFlow so no other module touches VexFlow's API directly (it changes between majors; VexFlow 5 already moved things).

```ts
renderScore(el, score: Score, opts): ScoreHandle
handle.highlight(noteIds, style)      // correct / wrong / current
handle.setPlayhead(tick)
handle.overlayPitchTrace(trace)       // the sight-singing ribbon
handle.getNoteAt(x, y)                // hit testing for staff input
```

`Score` is **our** data model (see §4), not VexFlow's — so we can swap renderers, render to canvas for sharing, or run headless in tests.

### 3.3 Mic & pitch detection (`src/mic/`)
- `getUserMedia` → `AudioWorkletNode` running MPM. Worklet, not ScriptProcessor, and not on the main thread.
  - **Shipped state**: detection runs on the main thread from an `AnalyserNode` at rAF rate (`src/mic/pitch.ts`, `src/mic/useMic.ts`). Cost is kept low by decimating 2:1 before the search — the voice sits well below 11 kHz, so nothing useful is lost. The detector is a pure function and moves into a worklet unchanged when that becomes worth doing.
  - We wrote MPM rather than pulling in `pitchy`: it is ~120 lines, removes a dependency, and being ours it is directly unit-testable against synthesized tones.
- Pipeline: high-pass filter (rumble) → noise gate (clarity/RMS threshold) → MPM → median smoothing over 3 frames → hysteresis on note transitions.
- Emits `{ hz, cents, midiFloat, clarity, t }` at ~60Hz.
- Handles the hard cases explicitly: octave errors (MPM's known failure mode — reject jumps >7 semitones between adjacent frames unless sustained), silence, and background noise.
- **Permission UX**: never request mic on app load. Ask at the first vocal drill, with a clear explanation and a working non-mic alternative if declined.

### 3.4 Learning engine (`src/learning/`)
Two models, kept separate (see `01-PEDAGOGY.md` §6):

```ts
// Retention — when to bring it back
scheduleReview(conceptId, rating: FsrsRating, now): MemoryState

// Ability — how hard the next item should be
updateAbility(conceptId, correct: boolean, itemDifficulty: number): number

// Selection — what to serve next
selectNextItem(session: SessionPlan, state: LearnerState): ItemRequest
```

`selectNextItem` balances: due reviews (FSRS) · targeted weak concepts · new-concept introduction · interleaving constraints (no more than 2 consecutive items of the same concept) · the ~82% difficulty target.

### 3.5 Drill contract (`src/drills/_contract.ts`)
The interface every drill implements. **This is the most important file for parallel work** — once it's frozen, drill teams can work fully independently.

```ts
export interface Drill<P, I, R> {
  id: DrillId;
  concepts: ConceptId[];
  generate(params: P, rng: Rng): I;
  Present: React.FC<{ item: I; onResponse: (r: R) => void; ctx: DrillContext }>;
  grade(item: I, response: R): DrillResult;
  Explain: React.FC<{ item: I; result: DrillResult; ctx: DrillContext }>;
}

export interface DrillResult {
  correct: boolean;
  score: number;                 // 0..1, allows partial credit
  latencyMs: number;
  conceptRatings: Record<ConceptId, FsrsRating>;
  detail?: unknown;              // drill-specific, for the journal
}
```

---

## 4. Data model

### 4.1 Core music types (`src/core/music/`)
Pure, immutable, exhaustively unit-tested. Everything else depends on these being right.

```ts
type Pitch     = { step: 'C'|'D'|'E'|'F'|'G'|'A'|'B'; alter: -2..2; octave: number };
type Interval  = { number: 1..15; quality: 'P'|'M'|'m'|'A'|'d' };
type Key       = { tonic: Pitch; mode: 'major'|'minor'|Mode };
type Chord     = { root: Pitch; quality: ChordQuality; inversion: 0|1|2|3; extensions: [] };
type Duration  = { base: 1|2|4|8|16|32; dots: 0|1|2; tuplet?: { n: number; d: number } };
type Note      = { pitch: Pitch | null; duration: Duration; tie?: 'start'|'stop' };
type Measure   = { notes: Note[]; timeSig: TimeSig };
type Score     = { key: Key; measures: Measure[]; clef: Clef; tempo: number };
```

Note **`Pitch` is spelled, not a MIDI number** — C♯ and D♭ are different notes and the app must never conflate them. MIDI conversion is a lossy projection at the audio boundary only.

### 4.2 Persistence (Dexie, `src/db/`)

```ts
db.version(1).stores({
  profile:     'id',                                  // singleton: range, prefs, calibration
  concepts:    'id, dueAt, mastery',                  // FSRS state + ability per concept
  reviews:     '++id, conceptId, ts',                 // full review log (analytics + FSRS optimization)
  sessions:    '++id, ts, type',                      // session summaries
  achievements:'id, unlockedAt',
  settings:    'key',
});
```

The `reviews` log is append-only and never pruned below a year — it powers the Journal, and later, personalized FSRS parameter optimization.

### 4.3 Concept IDs
A stable, hierarchical, greppable namespace. Once published these are effectively permanent, since they key user memory state.

```
degree.5.major.full-cadence
interval.M3.ascending
chord.quality.dom7
progression.I-V-vi-IV
rhythm.syncopation.eighth
reading.note.treble.ledger-above
theory.harmony.secondary-dominant
vocal.leap.P5.ascending
```

A `CONCEPTS.ts` registry is the single source of truth: id, display name, pillar, prerequisites, Map position. **Adding a concept = adding a registry entry**, which keeps the Map, scheduler, and drills in sync automatically.

---

## 5. PWA & offline

- `vite-plugin-pwa` with Workbox; precache the app shell; runtime-cache samples with a cache-first strategy.
- **Full offline capability** for every drill except those needing uncached samples (synth fallback covers it).
- Installable with proper icons, maskable icons, splash screens, `display: standalone`.
- iOS caveats to design around: no install prompt (needs an explicit "Add to Home Screen" hint), audio requires a user gesture, and PWA storage can be evicted — so we warn before any destructive-feeling state and offer JSON export/import of progress from day one.

---

## 6. Performance targets

| Metric | Target |
|---|---|
| First contentful paint | < 1.2s on 4G / mid-range Android |
| Time to first sound | < 3s cold, < 500ms warm |
| Drill item transition | < 100ms |
| Audio scheduling jitter | < 10ms |
| Pitch detection latency | < 50ms |
| Notation re-render | < 16ms (one frame) |
| Main bundle (gzip) | < 250KB, with VexFlow + Tone lazy-loaded per route |

Everything heavy (VexFlow, Tone, samples, the mic worklet) is **lazily loaded per route**, so a user who only does ear training never downloads the notation engine.

---

## 7. Accessibility

- Full keyboard operation for every drill (number keys for degrees, arrow keys for staff input).
- Screen-reader labels on all interactive elements; drill state changes announced via live regions.
- Respect `prefers-reduced-motion` (the Map and feedback animations both need reduced variants).
- **Color-blind safe**: correct/incorrect never signalled by hue alone — always paired with an icon and a shape.
- Adjustable text size; minimum 44px touch targets.
- **Deaf/HoH consideration**: ear-training pillars are inherently audio, but reading and theory must be fully usable without sound, and are.

---

## 8. Testing strategy

- **`core/` — near-100% unit coverage.** These are pure functions with known-correct answers; music theory has a right answer and we should assert it. Property-based tests for interval/transposition round-trips.
- **Generators** — property tests: every generated melody must be in-key, in-range, and singable.
- **Drills** — deterministic tests using seeded RNG; assert generate→grade correctness across many seeds.
- **E2E (Playwright)** — onboarding, a full Warm-Up, offline mode, install.
- **Audio/mic** — mockable interfaces at the boundary; a fixture harness that feeds recorded WAVs through the pitch pipeline and asserts detected notes.

---

*Next: [05-DESIGN-SYSTEM.md](./05-DESIGN-SYSTEM.md).*
