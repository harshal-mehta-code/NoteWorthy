# NoteWorthy

> An all-round musical training webapp — sight reading, ear training, music theory, and vocal training as **one connected skill**.

Free, forever. Runs in the browser, installable as a PWA, works offline.

**Status: planning.** No app code yet — the docs below are the plan, and `prototype/` holds a clickable visual prototype for feedback.

---

## The four pillars

| | |
|---|---|
| 🎧 **Ear training** | Functional (in-key) degree recognition first, intervals second, building to chord quality, inversions, and progression dictation. |
| 👁 **Sight reading** | Landmark recognition → contour → rhythm → scrolling reads that never stop, plus **eye-span** training that attacks the real bottleneck. |
| 🧠 **Music theory** | Bite-sized interactive lessons, every concept bound to an ear, reading, and vocal drill. |
| 🎤 **Vocal training** | Live pitch feedback, interval leaps, agility runs, and sight-singing with your pitch traced over the staff. |

## What makes it different

- **The Full Circle drill** — hear it → sing it → notate it → read it → play it. One idea, five modalities. Nothing else on the market closes this loop.
- **Key of the Week** — every pillar tunes to one tonal center, rotating the circle of fifths.
- **Musical feedback** — the reward sounds are diatonic and in the current key, so the gamification layer is itself ear training.
- **Comparative error playback** — hear what you picked vs what it was, back to back, in context.
- **The Musicianship Map** — a skill constellation across all four pillars, where nodes visibly dim as your retention decays.
- **Auto-transposition to your voice** — range mapped once, every singable exercise fits you afterward.
- **No dark patterns** — no ads, no energy meters, no streak guilt, nothing locked.

---

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
| [06-ROADMAP.md](docs/06-ROADMAP.md) | Phases and dispatchable parallel work packages |

## Prototype

`prototype/index.html` — a self-contained clickable prototype with **real Web Audio**. Open it directly in a browser, no build step:

```bash
open prototype/index.html      # macOS
xdg-open prototype/index.html  # Linux
```

The Degree ID ear drill actually plays and grades. Five more screens are mocked: Today, Scroll Reading, Sight-Singing with a pitch trace, the Musicianship Map, a Theory lesson, and the session summary. Both themes included.

Rendered captures of every screen live in [`prototype/screens/`](prototype/screens). See [`prototype/README.md`](prototype/README.md) for what's real vs. mocked, and for the mapping from prototype shortcuts to real implementations — **the prototype is authoritative for look and feel, the docs are authoritative for behavior.**

## Planned stack

Vite · React 19 · TypeScript · Tailwind v4 · Zustand · Dexie · Tone.js · VexFlow 5 · pitchy · ts-fsrs · vite-plugin-pwa. Static deploy, no backend in v1. See [04-ARCHITECTURE.md](docs/04-ARCHITECTURE.md).

## Working in parallel

Work is split into work packages that own disjoint paths so multiple sessions can run at once. See [06-ROADMAP.md](docs/06-ROADMAP.md) for the dependency graph and the dispatch prompt template.
