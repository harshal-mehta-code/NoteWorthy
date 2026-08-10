# NoteWorthy — Roadmap & Parallel Work Packages

This doc is **operational**. Each work package (WP) is written to be handed to a separate Claude Code session with minimal extra context. Every WP declares the paths it owns so parallel sessions don't collide.

---

## How to dispatch parallel sessions

**The rules that make parallelism safe:**

1. **One WP owns a path.** No two concurrently-running WPs write the same file. Ownership is listed per WP below.
2. **Contracts land before implementations.** A WP that depends on an interface can't start until the WP that defines it has merged. The dependency graph below encodes this.
3. **Branch per WP**: `claude/wp-<id>-<slug>`, PR into `claude/noteworthy-music-app-uf4tep`.
4. **Shared files are append-only or single-owner.** `CONCEPTS.ts` and `tokens.css` are the two risky shared files — either assign one owner per phase, or have each WP append to a separate section and accept trivial merge conflicts.
5. **Every WP ships tests + a Storybook-less demo route** (`/dev/<wp-id>`) so its work is verifiable in isolation before integration.

**Prompt template for dispatching a WP:**

> Read `docs/00-VISION.md` through `docs/06-ROADMAP.md`. Implement **WP-XX** exactly as specified in `06-ROADMAP.md`. Own only the paths listed for that WP. Follow the contracts in `04-ARCHITECTURE.md`. Write tests. Add a demo route at `/dev/<wp-id>`. Branch `claude/wp-XX-<slug>`, PR into `claude/noteworthy-music-app-uf4tep`.

---

## Dependency graph

```
Phase 0 (sequential, one session)
  WP-00 Scaffold + design tokens + app shell
        │
        ├── WP-01 Music core ────────┬──────────────┬─────────────┐
        ├── WP-02 Audio engine ──────┤              │             │
        ├── WP-03 Design components ─┤              │             │
        │                            │              │             │
Phase 1 (parallel ×5)                │              │             │
        ├── WP-04 Notation ──────────┤              │             │
        ├── WP-05 Mic/pitch ─────────┤              │             │
        ├── WP-06 Learning engine ───┤              │             │
        ├── WP-07 Storage/DB ────────┤              │             │
        └── WP-08 Drill contract ────┘              │             │
                     │                              │             │
Phase 2 (parallel ×4 — the pillars)                 │             │
        ├── WP-10 Ear training drills ──────────────┤             │
        ├── WP-11 Sight reading drills ─────────────┤             │
        ├── WP-12 Theory lessons ───────────────────┤             │
        └── WP-13 Vocal drills ─────────────────────┘             │
                     │                                            │
Phase 3 (parallel ×3 — the meta layer)                            │
        ├── WP-20 Map + progression ──────────────────────────────┤
        ├── WP-21 Warm-Up + session flow ─────────────────────────┤
        └── WP-22 Profile + journal + achievements ───────────────┘
                     │
Phase 4 (parallel ×3 — polish)
        ├── WP-30 Onboarding + calibration + placement
        ├── WP-31 PWA + offline + performance
        └── WP-32 Accessibility + i18n scaffold
                     │
Phase 5 (opportunistic)
        ├── WP-40 Full Circle drill  ← the flagship; needs 10/11/13
        ├── WP-41 MIDI input
        ├── WP-42 Song Decoder
        └── WP-43 Sync + social
```

---

# Phase 0 — Foundation

> **Sequential. One session. Everything else waits on this.** Don't parallelize here; the whole point is establishing shared ground.

### WP-00 — Scaffold, tokens, app shell
**Owns**: `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `index.html`, `src/app/**`, `src/design/tokens.css`, `src/lib/**`, `.github/workflows/**`

- Vite + React 19 + TS strict; path aliases (`@/core`, `@/audio`, …)
- Tailwind v4 wired to the tokens in `05-DESIGN-SYSTEM.md` §2–4
- React Router with the shell layout: bottom tabs (mobile) / left rail (desktop), plus a bare `<DrillLayout>` with zero chrome
- Zustand store skeleton with empty slices per pillar
- ESLint import-boundary rule enforcing the dependency rule (`04-ARCHITECTURE.md` §2)
- `src/lib/rng.ts` — seeded PRNG (deterministic items are a hard requirement)
- Vitest + Playwright configured; CI running typecheck, lint, test, build
- `/dev` route index that auto-lists demo routes
- Both themes switching correctly via a `data-theme` attribute

**Done when**: `npm run dev` shows a themed shell with working nav on mobile and desktop, CI is green, and a `/dev` page lists zero demos without erroring.

---

# Phase 1 — Engines (5 parallel sessions)

### WP-01 — Music core 🎼
**Owns**: `src/core/music/**`, `src/core/rhythm/**`, `src/core/generate/**`, `tests/core/**`
**Depends on**: WP-00

Pure functions, no dependencies, near-100% coverage. Everything else in the app is wrong if this is wrong.

- Types from `04-ARCHITECTURE.md` §4.1 — **spelled pitches**, not MIDI ints
- Interval arithmetic: `add`, `subtract`, `between`, `invert`, `simplify`; correct for doubly-augmented/diminished edge cases
- Scales & modes; key signatures both directions; enharmonic spelling that picks the *musically correct* accidental for the key
- Chords: build from root+quality, invert, voice (close/open/drop-2), figured bass, roman numeral ↔ chord in a key
- Rhythm: durations, dots, tuplets, meter, tick math, quantization
- Transposition preserving correct spelling
- **Generators**: melody (constrained by key, range, interval set, contour rules from `01-PEDAGOGY.md` §5), rhythm (by metric vocabulary), progression (by roman-numeral set + voice leading)
- MIDI conversion at the boundary only, clearly marked lossy

**Done when**: property tests pass (transpose round-trips, every generated melody in-key/in-range/singable), and a `/dev/music-core` page can generate and display 20 melodies as text.

---

### WP-02 — Audio engine 🔊
**Owns**: `src/audio/**`, `public/samples/**`, `tests/audio/**`
**Depends on**: WP-00, WP-01 (types only)

- Single AudioContext with gesture unlock; a reusable `<AudioGate>` for the "tap to start" moment
- `Sampler` (smplr piano) with lazy load + cache; `SynthFallback` (Tone.js) that always works
- `play(notes, timing)` for one-shots; Tone Transport path for scheduled sequences
- Metronome with accents and count-in
- **`FeedbackSounds`** — the musical reward layer (`03-GAMIFICATION.md` §2): correct/combo/wrong/levelup/session-end, all key- and tempo-aware, all synth-only so they work before samples load
- `cadence(key, style)` for context establishment — the most-used function in the app
- Latency reporting: `baseLatency + outputLatency + calibrationOffset`

**Done when**: `/dev/audio` can play scales, cadences, chords in any key with either engine, and demonstrate every feedback sound in a chosen key.

---

### WP-03 — Design components 🎨
**Owns**: `src/design/components/**`, `src/design/icons/**`, `tests/design/**`
**Depends on**: WP-00

All primitives from `05-DESIGN-SYSTEM.md` §7, both themes, keyboard accessible, reduced-motion aware. Plus the non-music-dependent feedback components (`CorrectPulse`, `WrongShake`, `ComboMeter`, `SessionSummary` shell).

**Done when**: `/dev/components` shows every primitive in every state and theme, and axe reports no violations.

---

### WP-04 — Notation 👁
**Owns**: `src/notation/**`, `tests/notation/**`
**Depends on**: WP-00, WP-01

- VexFlow 5 wrapper exposing only our `Score` model (`04-ARCHITECTURE.md` §3.2) — **no VexFlow types leak out**
- Render: staff, clefs, key sigs, time sigs, notes, rests, beams, ties, accidentals, ledger lines
- `highlight(noteIds, style)` for correct/wrong/current
- `setPlayhead(tick)` + smooth scrolling for Scroll Reading
- `overlayPitchTrace(trace)` — the sight-singing ribbon
- `getNoteAt(x,y)` hit testing + a `<StaffInput>` component for placing notes by click/drag
- Responsive re-layout; lazy-loaded chunk

**Done when**: `/dev/notation` renders a generated melody, animates a playhead, accepts staff input, and overlays a fake pitch trace.

---

### WP-05 — Mic & pitch detection 🎤
**Owns**: `src/mic/**`, `public/worklets/**`, `tests/mic/**`
**Depends on**: WP-00

- AudioWorklet running pitchy (MPM); permission flow with a graceful decline path
- Pipeline: high-pass → noise gate → MPM → median smoothing → note hysteresis
- **Octave-error rejection** (MPM's known failure mode) — reject >7-semitone frame jumps unless sustained
- Emits `{ hz, cents, midiFloat, clarity, t }` at ~60Hz
- Input latency calibration (separate from output)
- `RangeDetector` for the guided glissando range map
- Test harness feeding recorded WAV fixtures through the pipeline with expected-note assertions

**Done when**: `/dev/mic` shows a live pitch readout with cents and clarity, stable on sung notes, and the WAV fixture tests pass.

---

### WP-06 — Learning engine 🧠
**Owns**: `src/learning/**`, `src/core/concepts/CONCEPTS.ts`, `tests/learning/**`
**Depends on**: WP-00

- ts-fsrs integration: `scheduleReview(conceptId, rating, now)`
- Elo-style ability model: `updateAbility(conceptId, correct, itemDifficulty)`
- `selectNextItem()` — balances due reviews, weak concepts, new introductions, interleaving limits (max 2 consecutive same-concept), ~82% difficulty target
- Mastery state machine: Introduced → Practicing → Proficient → Mastered → Maintained, with **cross-day promotion gates**
- Session planner: builds the Warm-Up mix (`02-FEATURES.md` §5.4)
- **`CONCEPTS.ts` registry** — the single source of truth for id, name, pillar, prerequisites, Map coordinates. Seed the full concept tree from `02-FEATURES.md`.

**Done when**: `/dev/learning` simulates 60 days of a synthetic learner and charts mastery progression and review load; the interleaving and cross-day rules are asserted in tests.

---

### WP-07 — Storage 💾
**Owns**: `src/db/**`, `tests/db/**`
**Depends on**: WP-00

Dexie schema (`04-ARCHITECTURE.md` §4.2), repository layer, migration framework, JSON export/import of all progress (needed from day one because PWA storage can be evicted), quota handling, and a "reset progress" flow with real confirmation.

**Done when**: `/dev/storage` writes/reads every table, exports and re-imports a full profile losslessly, and migration tests pass across two schema versions.

---

### WP-08 — Drill contract & runner 🎯
**Owns**: `src/drills/_contract.ts`, `src/drills/_runner/**`, `tests/drills/**`
**Depends on**: WP-00, WP-06
**⚠ Blocks all of Phase 2 — prioritize it.**

- The `Drill<P,I,R>` interface (`04-ARCHITECTURE.md` §3.5)
- `DrillRunner` — the generic loop: request item → present → collect → grade → explain → report to the learning engine → next
- Shared behaviors so no drill reimplements them: replay (×0.9), progressive hints, comparative A/B playback, combo tracking, latency-aware timing, pause/exit
- `DrillContext` — audio, notation, mic, key, tempo, theme handles injected into every drill
- A reference `EchoDrill` implementation that other WPs copy

**Done when**: `/dev/drill-runner` runs `EchoDrill` end to end with feedback, hints, replay, and correct reporting to the learning engine.

---

# Phase 2 — The four pillars (4 parallel sessions)

> Each owns one drill family, disjoint directories. This is the biggest parallel win in the project.

### WP-10 — Ear training drills 🎧
**Owns**: `src/drills/degree-id/**`, `interval-id/**`, `melodic-dictation/**`, `chord-quality/**`, `progression-dictation/**`, `rhythm-dictation/**`, `cadence-id/**`
**Depends on**: WP-01, WP-02, WP-06, WP-08 (+ WP-04 for staff-input answers, WP-05 for sing-back)

All of `02-FEATURES.md` §1. Ship **Degree ID first and get it genuinely great** — it's the backbone drill and the thing most likely to win or lose a first-time user. Include `<DegreeButtons>` and `<IntervalDial>`.

**Done when**: every drill runs at `/dev/drill/<id>`, progression ladders are implemented, confusion pairs are tracked, and A/B comparative playback works.

---

### WP-11 — Sight reading drills 👁
**Owns**: `src/drills/note-recognition/**`, `contour-reading/**`, `rhythm-reading/**`, `scroll-reading/**`, `eye-span/**`, `key-signature/**`, `repertoire-reading/**`, `src/core/corpus/**`
**Depends on**: WP-01, WP-02, WP-04, WP-08

All of `02-FEATURES.md` §2. The two that must be excellent: **Scroll Reading** (with the lookahead veil) and **Eye Span** (the differentiator). Also owns the PD corpus loader and the difficulty-vector rating function — **verify licensing on every corpus item and record a source field.**

**Done when**: scroll reading runs smoothly at 60fps with a moving playhead and never stops on errors; eye-span works across all exposure/length settings.

---

### WP-12 — Theory lessons 🧠
**Owns**: `src/features/theory/**`, `src/content/theory/**`, `src/drills/theory-quiz/**`
**Depends on**: WP-01, WP-02, WP-03, WP-04, WP-08

The full curriculum (`02-FEATURES.md` §3.2) as MDX-ish content with interactive widgets: `<Keyboard>`, `<CircleOfFifths>`, `<ChordBuilder>`, `<RhythmGrid>`, `<StaffPlayground>`. Plus the reference wiki with search, and the ⓘ concept-card popover reachable from inside any drill.

**Done when**: all 12 curriculum sections have at least one lesson with a working widget and a retrieval quiz; the wiki is searchable and works offline.

---

### WP-13 — Vocal drills 🎤
**Owns**: `src/drills/pitch-match/**`, `interval-leap/**`, `sight-singing/**`, `agility-run/**`, `call-response/**`, `src/features/vocal/**`
**Depends on**: WP-01, WP-02, WP-04, WP-05, WP-08

All of `02-FEATURES.md` §4. The one to nail: **sight-singing with the pitch trace over the staff** — it's the signature screen. Also owns range mapping, auto-transposition into range, warm-up/cool-down routines, and the vocal-health guardrails (non-negotiable, `01-PEDAGOGY.md` §4.4).

**Done when**: `<PitchRibbon>` tracks a sung line at 60fps with correct cents; sight-singing grades per note; every exercise auto-transposes to the stored range.

---

# Phase 3 — Meta layer (3 parallel sessions)

### WP-20 — Musicianship Map
**Owns**: `src/features/map/**`
**Depends on**: WP-06, WP-03

The constellation UI: zoom/pan, node states, prerequisite edges, **retention-based dimming**, region layout, unlock animations, and node detail sheets that launch practice. This is a screenshot screen — give it the polish budget.

### WP-21 — Warm-Up & session flow
**Owns**: `src/features/warmup/**`, `src/features/session/**`
**Depends on**: WP-06, WP-08, and at least two Phase-2 pillars

The daily 5-minute assembled session, session summary with its single specific observation, practice-mode selection (Focus/Marathon/Recital/Zen), streak + Fermata logic, and the combo system.

### WP-22 — Profile, journal, achievements
**Owns**: `src/features/profile/**`, `src/features/journal/**`, `src/features/achievements/**`
**Depends on**: WP-06, WP-07

Six-axis radar with monthly snapshots, XP/levels, the auto-generated Practice Journal with real observations mined from the review log, badge definitions and unlock logic, and shareable summary cards (canvas-rendered).

---

# Phase 4 — Polish (3 parallel sessions)

### WP-30 — Onboarding, calibration, placement
**Owns**: `src/features/onboarding/**`
First-run flow, audio gesture unlock, latency calibration wizard, guided range mapping, the ~3-minute adaptive placement test, and goal setting. **This is the highest-leverage screen in the app for retention** — most users decide here.

### WP-31 — PWA, offline, performance
**Owns**: `vite.config.ts` PWA section, `public/manifest.json`, `public/icons/**`, `src/lib/pwa/**`
Service worker, precache + runtime sample caching, install prompt (with the iOS "Add to Home Screen" hint), offline indicators, update flow, bundle splitting to hit the §6 performance targets, and a Lighthouse CI gate.

### WP-32 — Accessibility & i18n scaffold
**Owns**: `src/lib/a11y/**`, `src/lib/i18n/**`, plus a11y fixes across the app (coordinate — this one touches many files, so run it when Phase 2/3 sessions are quiet)
Full keyboard operation for every drill, screen-reader announcements, color-blind verification, reduced-motion variants, and string extraction for future translation (English only in v1).

---

# Phase 5 — Differentiators & scale

- **WP-40 — Full Circle drill** ⭐ the flagship (`02-FEATURES.md` §5.1). Needs WP-10, WP-11, WP-13. Worth doing as soon as those three land — it's the strongest thing in the product.
- **WP-41 — MIDI input** — Web MIDI across reading, dictation, Full Circle. Small cost, big payoff for keyboard players.
- **WP-42 — Song Decoder** — real-song progressions → generated drills. Check data licensing first; start with user-entered and PD-derived progressions.
- **WP-43 — Sync & social** — optional accounts, cross-device sync, seeded weekly challenges (everyone gets identical items), friend duels. Deliberately last.

---

## Revised plan — shipping one drill at a time

**Superseded the parallel-first plan after prototype feedback.** The wide fan-out below is still the right shape for later, but the first milestone is deliberately narrow and sequential: build one drill end to end, get it in front of real use, then widen. Phase 2's four-way split only pays off once the shell, the drill contract and the feedback loop have survived contact with an actual user.

**Shipped** — six courses across all four pillars (Find the Note, Chords, Progressions, Intervals, Read the Note, Foundations), a Practice library listing built and planned courses alike, tab navigation, a You screen, Vite/React/TS shell, design tokens, Web Audio engine with sampled piano and the musical feedback layer, the Find the Note drill across seventeen levels and four stages (two- and three-note phrases, minor keys, chromatics, and three sung levels), our own MPM pitch detector, adaptive item selection, per-note stats across rounds, Welcome/Home/Summary/Settings, local persistence, PWA, unit tests on the core. Deployed.

**Also shipped since** — the Daily Warm-Up (a mixed, interleaved session drawn from every started course, with a share of it reaching back below the current level); vocal range mapping and auto-transposition of every sung prompt; five more theory lessons including a playable circle of fifths; the Sing a Phrase course (eight levels of phrases and agility runs, graded per note); and backup/restore to a JSON file.

**And since that** — Read the Rhythm (nine levels, tapped, with latency cancelled by measurement rather than a calibration wizard).

**And since that** — response time as a second signal, a forgetting-curve retention model, the Musicianship Map, and warm-up scheduling driven by that model rather than by accuracy alone.

**Next, in order** — each is a self-contained increment small enough to review in one sitting:

1. **Melodic dictation** — hear a phrase, write it down. The listening counterpart to Sing a Phrase, which already generates and grades phrases.
5. **Scroll reading** with the lookahead veil — the last big piece of the reading pillar, and the one the prototype still owns.

**Deliberately not next:** XP and achievements. The gamification that pays here is musical (feedback that resolves to the tonic, streaks that climb the scale) and it is already in. A points layer on top would be the generic version of something the app does better.

## Original build order for the first milestone

The fastest path to something genuinely worth using and demoing:

```
WP-00  →  WP-01 + WP-02 + WP-03 (parallel)  →  WP-06 + WP-08 (parallel)
       →  WP-10 Degree ID only  →  WP-21 Warm-Up  →  WP-31 PWA
```

That's a **working, installable, offline functional ear trainer with spaced repetition** — already better than most of the market — and it validates the micro loop before we invest in the other three pillars.

---

## Open questions for the product owner

1. **Solfège system** — movable-do with la-based minor (most common in the US) vs do-based minor? Offer both as a setting, but which is the default?
2. **Corpus scope** — how much curated repertoire is worth the effort vs leaning almost entirely on generation?
3. **Accounts** — is anonymous-forever acceptable, given that clearing browser data loses progress? (Mitigated by JSON export, but it's a real risk.)
4. **Instrument breadth** — piano-only samples in v1, or add guitar/strings early for timbre variety in ear training?
5. **Analytics** — self-hosted (Plausible/Umami) or none at all in v1?
