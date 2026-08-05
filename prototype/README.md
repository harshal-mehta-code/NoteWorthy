# NoteWorthy — Visual Prototype

A self-contained design reference. **No build step, no network, no dependencies.**

```bash
open index.html        # macOS
xdg-open index.html    # Linux
```

Turn your sound on — the ear-training drill genuinely plays.

---

## What's real vs. mocked

| | |
|---|---|
| **Real** | The Degree ID drill: Web Audio cadence, item generation, answer grading, musical correct-feedback with a rising combo, A/B comparative playback on errors, replay, hints, keyboard input (`1`–`7`, `r` to replay). Both themes, driven entirely by tokens. |
| **Mocked** | The other six screens. Static markup with hand-drawn SVG (staff, pitch trace, skill map, keyboard) and one CSS-driven scroll animation. |

The prototype deliberately does **not** implement the scheduler, storage, mic input, or real notation engraving. Those are specified in [`../docs/04-ARCHITECTURE.md`](../docs/04-ARCHITECTURE.md).

## Screens

Rendered captures live in [`screens/`](./screens), both themes, named to match the sections below.

| # | Screen | Spec |
|---|---|---|
| 01 | Ear training — Degree ID | [02-FEATURES §1.1](../docs/02-FEATURES.md) |
| 02 | Today / home | [00-VISION §4](../docs/00-VISION.md) |
| 03 | Sight reading — scroll mode | [02-FEATURES §2.4](../docs/02-FEATURES.md) |
| 04 | Vocal — sight-singing with pitch trace | [02-FEATURES §4.4](../docs/02-FEATURES.md) |
| 05 | Musicianship Map | [03-GAMIFICATION §3.3](../docs/03-GAMIFICATION.md) |
| 06 | Theory lesson card | [02-FEATURES §3](../docs/02-FEATURES.md) |
| 07 | Session summary | [03-GAMIFICATION §4.1](../docs/03-GAMIFICATION.md) |

---

## Using this as an implementation reference

**The prototype is authoritative for look and feel. The docs are authoritative for behavior.** Where they disagree, the docs win — the prototype takes shortcuts that don't survive contact with real data.

### What to copy directly

- **Tokens.** The `:root` block at the top of `index.html` is the real palette, and it matches [`../docs/05-DESIGN-SYSTEM.md`](../docs/05-DESIGN-SYSTEM.md). Port it to `src/design/tokens.css` verbatim, including the `@media (prefers-color-scheme)` / `[data-theme]` pairing — the theme toggle must beat the media query in both directions.
- **Drill screen anatomy.** Exit + progress dots at top, stimulus vertically centered with roughly 55% of the height, response UI in the thumb zone, replay and hint as quiet bottom corners. Every drill uses this layout so muscle memory transfers.
- **Feedback timing.** Correct: ~420ms pulse. Wrong: a 3px, 220ms shake — small, never a full-screen flash. Audio and visual must land on the same frame.
- **Copy tone.** Specific and factual, no exclamation marks, no cheerleading. "Retention 61% and falling. Two minutes fixes it."

### What to rebuild properly

| Prototype shortcut | Real implementation |
|---|---|
| Two detuned oscillators | Sampled piano via `smplr`, with the synth kept as an offline fallback (WP-02) |
| Hand-drawn SVG staff, Unicode `𝄞` clef | VexFlow 5 behind the `src/notation` wrapper, engraving with Bravura (WP-04) |
| Simulated pitch ribbon | Live MPM detection in an AudioWorklet (WP-05) |
| `Math.random()` item picks | Seeded RNG + FSRS scheduling + Elo difficulty targeting (WP-06) |
| Hardcoded G major | Key of the Week, and auto-transposition into the user's mapped vocal range |
| Static map SVG | `<MapCanvas>` driven by the `CONCEPTS` registry, with retention-based dimming (WP-20) |

### Known shortcuts worth naming

- The scroll-reading animation steps notes on a timer rather than scrolling continuously against a transport clock. The real one is 60fps against the audio clock.
- The pitch trace is a plausible synthetic curve (locks on, drifts flat on the leap, recovers) — chosen to show what the *visual* should communicate, not real detection output.
- Screen chrome is faked at fixed pixel heights. Real screens are responsive and must survive a 320px-wide viewport.
- Degree buttons are labeled with both number and solfège. Which one leads is an open product question — see [`../docs/06-ROADMAP.md`](../docs/06-ROADMAP.md#open-questions-for-the-product-owner).

---

## Regenerating the screen captures

The images in `screens/` were rendered from `index.html` with Playwright at `deviceScaleFactor: 2`, capturing each `.phone` element in both color schemes. Re-render them whenever the prototype changes so the reference doesn't drift.
