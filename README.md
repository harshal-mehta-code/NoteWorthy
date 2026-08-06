# NoteWorthy

> An all-round musical training webapp — sight reading, ear training, music theory, and vocal training as **one connected skill**.

Free, forever. Runs in the browser, installable as a PWA, works offline.

**Status: v0.1 shipped.** The first drill — **Find the Note** — is built and deployed. Everything else below is planned.

```bash
npm install
npm run dev
```

---

## The four pillars

| | |
|---|---|
| 🎧 **Ear training** | Hearing where a note sits inside a key first, intervals second, building to chord quality, inversions, and progression dictation. **Built.** |
| 👁 **Sight reading** *(planned)* | Landmark recognition → contour → rhythm → scrolling reads that never stop, plus **eye-span** training that attacks the real bottleneck. |
| 🧠 **Music theory** *(planned)* | Bite-sized interactive lessons, every concept bound to an ear, reading, and vocal drill. |
| 🎤 **Vocal training** *(planned)* | Live pitch feedback, interval leaps, agility runs, and sight-singing with your pitch traced over the staff. |

## What makes it different

- **The Full Circle drill** — hear it → sing it → notate it → read it → play it. One idea, five modalities. Nothing else on the market closes this loop.
- **Key of the Week** — every pillar tunes to one tonal center, rotating the circle of fifths.
- **Musical feedback** — the reward sounds are diatonic and in the current key, so the gamification layer is itself ear training.
- **Comparative error playback** — hear what you picked vs what it was, back to back, in context.
- **The Musicianship Map** — a skill constellation across all four pillars, where nodes visibly dim as your retention decays.
- **Auto-transposition to your voice** — range mapped once, every singable exercise fits you afterward.
- **No dark patterns** — no ads, no energy meters, no streak guilt, nothing locked.

---

## What's in v0.1

**Find the Note** — a short chord intro plants *home* in your ear, one note plays, you say which note of the key it was.

- Five levels, starting with **three buttons** and adding notes a small group at a time
- Musical feedback: correct answers resolve to home and climb the scale as your streak grows; wrong answers play your note, the real one, then the real one in the key
- Plain language throughout — no "degree", no "cadence", no "tonic"
- Midnight and Paper themes, keyboard input, works at 320px
- Local-first: no account, nothing leaves the browser
- Installable PWA, works offline

Deliberately **not** in v0.1: tab bar, skill map, XP, achievements, the daily Warm-Up mix. They arrive when there's more than one drill to tie together — see [07-UX-AND-LANGUAGE.md](docs/07-UX-AND-LANGUAGE.md) §1.

## Documentation

Read in order:

| Doc | What's in it |
|---|---|
| [00-VISION.md](docs/00-VISION.md) | Who it's for, product principles, differentiators, the daily loop |
| [01-PEDAGOGY.md](docs/01-PEDAGOGY.md) | The learning science, and the method behind every drill |
| [02-FEATURES.md](docs/02-FEATURES.md) | Drill-by-drill specs, progression ladders, scoring |
| [03-GAMIFICATION.md](docs/03-GAMIFICATION.md) | Engagement design, and the anti-patterns we forbid |
| [04-ARCHITECTURE.md](docs/04-ARCHITECTURE.md) | Stack, module boundaries, data model, contracts |
| [05-DESIGN-SYSTEM.md](docs/05-DESIGN-SYSTEM.md) | Tokens, type, motion, layout, components |
| [06-ROADMAP.md](docs/06-ROADMAP.md) | What's shipped, what's next, and the parallel work packages for later |
| [07-UX-AND-LANGUAGE.md](docs/07-UX-AND-LANGUAGE.md) | Navigation rules and the plain-language glossary |

## Prototype

`prototype/index.html` — a self-contained clickable prototype with **real Web Audio**. Open it directly in a browser, no build step:

```bash
open prototype/index.html      # macOS
xdg-open prototype/index.html  # Linux
```

Six screens covering all four pillars. Its ear-training screen is **superseded by the real app** — go there for that. The prototype remains the reference for the five screens not yet built: Today, Scroll Reading, Sight-Singing with a pitch trace, the Musicianship Map, and a Theory lesson.

Rendered captures of every screen live in [`prototype/screens/`](prototype/screens). See [`prototype/README.md`](prototype/README.md) for what's real vs. mocked, and for the mapping from prototype shortcuts to real implementations — **the prototype is authoritative for look and feel, the docs are authoritative for behavior.**

## Stack

**In use:** Vite · React 19 · TypeScript · Tailwind v4 · React Router · Zustand · Web Audio · vite-plugin-pwa. Static deploy, no backend.

**Planned:** VexFlow 5 (notation) · pitchy (pitch detection) · ts-fsrs (spaced repetition) · Dexie (once localStorage stops being enough) · smplr (sampled piano). See [04-ARCHITECTURE.md](docs/04-ARCHITECTURE.md).

## Working in parallel

The first milestone is deliberately sequential — one drill at a time. Once there are several, work splits into packages that own disjoint paths so multiple sessions can run at once. See [06-ROADMAP.md](docs/06-ROADMAP.md).
