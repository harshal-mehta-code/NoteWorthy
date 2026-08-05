# NoteWorthy — Design System

**Target feel:** a precision instrument. Think a high-end studio tool or a well-made metronome app — dark, quiet, confident, generous with space. Not a toy, not a textbook, not a game with a mascot.

---

## 1. Design principles

1. **The content is the interface.** A staff, a keyboard, a pitch ribbon — these *are* the UI. Chrome exists to get out of their way.
2. **Zero chrome in a drill.** During an exercise: no nav, no XP counter ticking, no badges. Chrome returns between reps.
3. **Motion communicates, never decorates.** Every animation carries information (this was right, this is next, this is where you are).
4. **Dark-first.** Musicians practice at night, and dark makes notation and color feedback pop. A light theme exists and is fully supported.
5. **One accent, used sparingly.** Restraint is what reads as premium. Color means something.
6. **Legibility above all.** Notation must be crisp at every size. Never sacrifice reading clarity for style.

---

## 2. Color

Dark theme is canonical; light is a first-class port.

```css
/* Canvas & surfaces — warm-tinted near-black, not pure grey */
--nw-bg:            #0A0B0D;   /* app canvas */
--nw-surface-1:     #121417;   /* cards */
--nw-surface-2:     #1A1D21;   /* raised / hover */
--nw-surface-3:     #24282D;   /* input fields, active */
--nw-border:        #2A2F35;   /* hairline, 1px */
--nw-border-strong: #3A4048;

/* Text */
--nw-text:          #F2F4F6;
--nw-text-muted:    #9BA3AD;
--nw-text-subtle:   #646C76;

/* Accent — brass. Instruments, warmth, precision. */
--nw-accent:        #E8B44A;
--nw-accent-hot:    #F5C761;
--nw-accent-dim:    #8A6B2C;
--nw-accent-wash:   rgba(232,180,74,0.12);

/* Secondary — cool teal. Voice, pitch, live signal. */
--nw-cool:          #4ECDC4;
--nw-cool-dim:      #2A7A75;

/* Semantic — deliberately desaturated. Never harsh. */
--nw-correct:       #5BC98B;
--nw-wrong:         #E5736B;
--nw-warn:          #E8B44A;
--nw-flat:          #6B9FE8;   /* pitch below target */
--nw-sharp:         #E88F6B;   /* pitch above target */

/* Pillars — used only on the Map and Profile radar */
--nw-pillar-ear:      #C77DFF;
--nw-pillar-reading:  #4ECDC4;
--nw-pillar-theory:   #E8B44A;
--nw-pillar-voice:    #FF9E6B;
```

**Rules**
- Accent is for the primary action and current state only. If everything is brass, nothing is.
- Correct/wrong **always** pair color with an icon and a shape — never hue alone (§7).
- Surfaces separate with **borders, not shadows**. Shadows in dark UI read as muddy.
- Flat/sharp use a blue↔orange axis, which survives all common color-vision deficiencies.

---

## 3. Typography

```css
--nw-font-ui:      'Inter var', system-ui, -apple-system, sans-serif;
--nw-font-display: 'Inter var', system-ui, sans-serif;  /* tight tracking, heavy weight */
--nw-font-mono:    'JetBrains Mono', ui-monospace, monospace;  /* cents, ms, numeric readouts */
```

Music glyphs come from **Bravura** (ships with VexFlow) — used for notation and for inline symbols like ♯ ♭ 𝄞 in copy.

Scale (fluid, `clamp()`-based):

| Token | Size | Use |
|---|---|---|
| `display` | 48–72px, weight 700, tracking −0.03em | Drill stimulus, big numbers, celebration |
| `h1` | 32–40px / 700 | Screen titles |
| `h2` | 24px / 600 | Section headers |
| `h3` | 18px / 600 | Card titles |
| `body` | 16px / 400, line-height 1.6 | Prose |
| `small` | 14px / 400 | Secondary |
| `caption` | 12px / 500, tracking 0.04em, uppercase | Labels, metadata |
| `numeric` | mono, tabular-nums | Cents, ms, scores, timers |

Prose max-width 68ch. Tabular figures everywhere a number changes in place, so digits don't jitter.

---

## 4. Space, radius, elevation

8px base grid: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.

```css
--nw-radius-sm: 8px;    /* chips, small buttons */
--nw-radius-md: 12px;   /* buttons, inputs */
--nw-radius-lg: 16px;   /* cards */
--nw-radius-xl: 24px;   /* sheets, modals */
--nw-radius-full: 999px;
```

Elevation is expressed as border + subtle background lift, not drop shadows. The one exception: modals and sheets get a large soft ambient shadow to separate from the scrim.

---

## 5. Motion

```css
--nw-dur-instant: 100ms;   /* state flips */
--nw-dur-fast:    160ms;   /* hover, press, feedback pulse */
--nw-dur-base:    240ms;   /* transitions, reveals */
--nw-dur-slow:    400ms;   /* screen changes, Map movement */

--nw-ease-out:    cubic-bezier(0.16, 1, 0.3, 1);      /* entrances */
--nw-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* movement */
--nw-spring:      spring(1, 90, 12, 0);               /* feedback, celebration */
```

**Signature motions**
- **Correct** — a 120ms scale pulse to 1.04 plus an accent-wash glow, synchronized to the audio confirmation. Audio and visual must land on the same frame; a lag of even 80ms feels broken.
- **Wrong** — a 3px, 200ms horizontal shake. Small. Never a full-screen flash.
- **Item advance** — outgoing slides left and fades; incoming enters from right. Directional, so progress feels linear.
- **Map** — spring-based pan/zoom; unlocking a node animates the prerequisite edge lighting up *first*, then the node — so the causality is visible.
- **Pitch ribbon** — 60fps, no easing (it's live data; smoothing it would be a lie).

All of this respects `prefers-reduced-motion`: transforms become cross-fades, the ribbon stays live, celebrations become static.

---

## 6. Layout

**Mobile (< 768px)** — bottom tab bar: Home · Practice · Map · Profile. Drill screens are full-bleed with only a close (×) and progress dots at top.

**Desktop (≥ 1024px)** — collapsible left rail; content column max 960px, centered. Drills center in the viewport with generous margin — never stretched edge to edge.

**Drill screen anatomy** (identical for every drill, so muscle memory transfers):

```
┌──────────────────────────────────────┐
│  ×                    ● ● ● ○ ○      │  ← exit + progress only
│                                      │
│                                      │
│            [ STIMULUS ]              │  ← notation / staff / ribbon
│                                      │
│                                      │
│          [ RESPONSE UI ]             │  ← buttons / keyboard / mic
│                                      │
│      ⟳ replay          ⓘ hint        │  ← subtle, bottom corners
└──────────────────────────────────────┘
```

The stimulus is vertically centered and gets ~55% of the height. The response UI sits in the thumb zone on mobile — always.

---

## 7. Component inventory

**Primitives** (`src/design/components/`): Button (primary/secondary/ghost/danger) · IconButton · Card · Sheet · Modal · Chip · Toggle · Slider · Progress (linear + ring) · Tabs · Tooltip · Toast · Skeleton · EmptyState

**Music-specific** (the ones that matter):
- **`<Staff>`** — VexFlow-rendered notation with highlight/playhead/trace overlay
- **`<Keyboard>`** — responsive piano, 1–4 octaves, playable, highlightable, labelable
- **`<DegreeButtons>`** — 7 or 12 buttons, numbers or solfège, keyboard-shortcut driven
- **`<PitchRibbon>`** — live pitch trace with target band and cents readout
- **`<IntervalDial>`** — radial interval selector, faster than a list on mobile
- **`<CircleOfFifths>`** — interactive, spinnable, shows key sigs and relative minors
- **`<ChordChips>`** — roman-numeral chips for progression dictation
- **`<RhythmGrid>`** — tappable rhythm input/display
- **`<MapCanvas>`** — the skill constellation, zoom/pan
- **`<RadarChart>`** — six-axis musicianship profile
- **`<ComboMeter>`** — streak multiplier, appears *only* between items

**Feedback**: `<CorrectPulse>` · `<WrongShake>` · `<ABReplay>` (the comparative playback control) · `<ConceptCard>` (the ⓘ popover) · `<SessionSummary>`

---

## 8. Iconography

Custom line icons at 1.5px stroke, 24px grid — matched to the type's weight. Music symbols come from Bravura, never from emoji. Never mix icon families; that's the fastest way to look cheap.

---

## 9. Sound design (visual system's twin)

The audio identity is specified in `03-GAMIFICATION.md` §2. What matters here: **audio and visual feedback are designed as one system and must be frame-synchronized.** A correct-answer pulse that lands 80ms after its sound feels broken even if neither element is wrong on its own. Any component that renders feedback takes its timing from the audio clock, not from a CSS transition.

---

## 10. Themes

- **Midnight** (default dark) — as specified above
- **Paper** (light) — warm off-white `#FAF9F7`, ink `#1A1D21`, same accents adjusted for contrast. Notation especially benefits — some readers strongly prefer black-on-white staves.
- **High contrast** — accessibility variant, WCAG AAA
- Later unlockables (cosmetic only, never gated content): *Score* (sepia/manuscript), *Neon* (synthwave), *Concert* (deep blue).

Theme is a CSS-variable swap on `:root`; no component knows which theme is active.

---

*Next: [06-ROADMAP.md](./06-ROADMAP.md).*
