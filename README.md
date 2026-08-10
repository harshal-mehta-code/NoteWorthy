# NoteWorthy

> An all-round musical training webapp — sight reading, ear training, music theory, and vocal training as **one connected skill**.

Free, forever. Runs in the browser, installable as a PWA, works offline.

**Status: v1.0 shipped.** Eight courses across all four pillars, a Daily Warm-Up that mixes them, the Musicianship Map with a real forgetting curve behind it, vocal range mapping, and backup to a file.

```bash
npm install
npm run dev
```

---

## The four pillars

| | |
|---|---|
| 🎧 **Ear training** | **Find the Note** (17 levels), **Chords** (7), **Progressions** (7) and **Intervals** (8). Still to come: melodic dictation. |
| 👁 **Sight reading** *(started)* | **Read the Note** (7 levels) by landmark, both clefs and ledger lines, and **Read the Rhythm** (9 levels) tapped in time. Still to come: scrolling reads that never stop. |
| 🧠 **Music theory** *(started)* | Nine interactive lessons with a playable keyboard and a circle of fifths you can hear. More of the curriculum to follow. |
| 🎤 **Vocal training** *(started)* | **Sing a Phrase** (8 levels) plus sung answers inside Find the Note, live pitch feedback, and range mapping that fits every prompt to your voice. Still to come: sight-singing with your pitch traced over the staff. |

## What makes it different

- **The Full Circle drill** — hear it → sing it → notate it → read it → play it. One idea, five modalities. Nothing else on the market closes this loop.
- **Key of the Week** — every pillar tunes to one tonal center, rotating the circle of fifths.
- **Musical feedback** — the reward sounds are diatonic and in the current key, so the gamification layer is itself ear training.
- **Comparative error playback** — hear what you picked vs what it was, back to back, in context.
- **The Musicianship Map** — a skill constellation across all four pillars, where nodes visibly dim as your retention decays.
- **Auto-transposition to your voice** — range mapped once, every singable exercise fits you afterward.
- **No dark patterns** — no ads, no energy meters, no streak guilt, nothing locked.

---

## What's built

**Eight courses across all four pillars**, all reachable from a Practice library that also lists what's still planned — hiding the unbuilt parts made a seventeen-level app look like a one-trick toy.

### 🎧 Find the Note — seventeen levels across four stages

**Stage 1, finding home.** A drone holds the home note underneath, so you *compare* rather than remember. Was that note home? Then: settled, or restless? Then the drone comes off and you pick home out of three. This stage exists because naming notes assumes you can already find home, and nothing was teaching that.

**Stage 2, naming the notes.** A chord intro plants the key, then you name what you hear — three notes at first, then five, then all seven, then with less and less help.

**Stage 3, going deeper.** Two- and three-note phrases, minor keys, chromatic colour notes (♭7 and ♯4), and finally a level that changes key on every question so there's nothing to settle into.

**Stage 4, your voice.** Stop picking answers and produce them: sing home, sing back a note you just heard, then sing a note you're only *told*. Graded by live pitch detection, on pitch class — so any octave counts. Needs a microphone; every other level works without one.

### 🎧 Intervals — eight levels
Name the distance between two notes: fifths and octaves first, then thirds, steps, the tritone, and finally every interval inside an octave — ascending, descending, and both at once. Deliberately the *second* ear course, not the first: interval training in isolation produces people who ace interval quizzes and still can't work out a song.

### 🎧 Chords — seven levels
Major or minor first — the question people actually have when they hear a record — then diminished and augmented, the dominant seventh, the four sevenths, inversions, and finally wide voicings that arrive one note at a time. **Root, register and voicing are re-rolled every question**, because a fixed voicing lets you memorise one sound instead of learning what a quality is.

### 🎧 Progressions — seven levels
Name chords by their **role in the key**, not their quality. Knowing a chord is minor is useful; knowing it's the **vi** of the key you're in is what lets you work out a song, transpose it, and play along with something you've never heard. Two chords, then three, then four; the whole diatonic family; minor keys; and finally progressions lifted from real music. Every progression opens on home and the app says so — guessing the first chord is *finding the key*, a different skill, and asking for both at once would muddle them.

### 👁 Read the Note — seven levels
Name notes on the stave, built on **landmarks** rather than "Every Good Boy Deserves Fudge" — mnemonics force you to count up one line at a time, a habit you then have to unlearn. Treble, then ledger lines, then bass, then both clefs unannounced. Answer with the letter keys.

### 🧠 Foundations — nine lessons
Short interactive lessons with a keyboard you can play: how the keyboard is laid out, half and whole steps, what makes a scale major, why one note feels like home, what an interval actually is, how triads are built, why chords get numbers instead of names, what changes in a minor key, and the circle of fifths — as a ring you tap to hear rather than a diagram to memorise. Every lesson ends by pointing at the drill where the same idea turns up; that linkage is what stops theory becoming trivia.

### 👁 Read the Rhythm — nine levels
Tap what you read. Quarter notes, then held notes, rests, eighths, two bars, sixteenths, and finally everything at once with the click dropping out after the count-in — which is the real step, because playing against a click that has stopped is what tests whether you are *keeping* time or just following it.

Timing is the awkward part: between screen, audio output, input stack and person there is a constant lag that has nothing to do with musicianship and is easily large enough to fail someone who played perfectly. The usual fix is a calibration wizard before you're allowed to start. Instead the median offset across the attempt is measured and subtracted before anything is judged, so **there is nothing to calibrate** — and the offset is reported back rather than discarded, because "you were consistently 60ms behind the beat" is worth knowing. It's also remembered between rounds, so a bar too short to measure its own lag still gets the benefit of one.

### 🎤 Sing a Phrase — eight levels
Sing back two notes, then three, then four- and five-note scale runs, then runs that turn around at the top, then the same in minor. Two axes move, one at a time: how many notes, and how fast they arrive — the later levels are the agility work, where speed is the difficulty.

The hard part is **segmentation**: deciding where one note ends and the next begins in a continuous pitch stream. People sing legato, so silence can't be the only boundary — and a fixed tolerance band can't do it either, because it has to be wide enough for vibrato, and vibrato is wider than the semitone step it would then swallow. Sustained deviation separates them: vibrato swings past the threshold and comes straight back, a real step goes and stays. Slots fill with what you actually sang, right or wrong, so you're never stuck part way through a phrase.

### 🎤 Your range
Sing your lowest comfortable note and your highest, once. After that every sung prompt plays in your octave instead of around middle C, so a low voice never has to transpose the question before answering it. Grading was always on the note rather than the octave, so nothing about what counts as right changes. Reported as a span in plain words — never a voice type, which two measured notes cannot support anyway.

### 🗺 The Musicianship Map
Every course as a node, wired by what leads into what, on the You screen. Node size shows how far up a ladder you are; **brightness shows how much of it you still have**, so a course you ground through in March and never touched again visibly fades. That needs a real forgetting curve to be honest, so there is one: retrievability follows the power function FSRS settled on, `R(t) = (1 + 19/81 · t/S)^-0.5`, where stability `S` is by definition the interval at which recall falls to 90%.

The stability update is deliberately *not* full FSRS — that fits seventeen weights against a review history this app doesn't have. It's a simple model with the same shape: successful recall multiplies stability, the multiplier grows the more overdue the item was (the spacing effect), and difficulty and **response time** scale it. Response time matters because accuracy alone can't tell knowing something from working it out, and the second decays much faster. It's measured against a par time per question type, since six seconds is fluent for a four-chord progression and laboured for naming one note.

Three node states, because they mean three different things: never touched is an outline, started-but-unmeasurable (lessons don't decay in any way the app can honestly measure) sits at a fixed middle, and everything drilled is lit by what survives.

### 🔁 The Daily Warm-Up
Ten questions assembled fresh from every course you've started, weighted by two things that mean different things: how **weak** a course is right now, and how close it is to being **lost** according to the retention model. A course you're bad at but drilled this morning is worth less than one you were good at in March, and accuracy alone cannot see that difference. Roughly a third of questions reach back below your current level, and they land on the level closest to slipping rather than a random one. It exists because practising a course always serves its current level, so everything under it quietly rots — and because **interleaving** beats grinding one drill at a time for retention, even though it reliably feels worse while you're doing it. No single course can take more than 60% of the round, so the same drill never lands three times running.

---

- **Sampled piano**, with a synth fallback so the app always makes sound
- **Live pitch detection** written from scratch (McLeod / NSDF), unit-tested against synthesized tones
- **Adapts to you** — notes you keep missing come up more often, and the summary reports on your weakest note across every round, not just this one
- Musical feedback: correct answers resolve to home and climb the scale as your streak grows; wrong answers play your note, the real one, then the real one in the key
- Plain language throughout — no "degree", no "cadence", no "tonic"
- Rounds are five to eight questions — under a minute
- Unit-tested core: every level's question generation is checked against its own rules, and the pitch detector against known tones
- Midnight and Paper themes, keyboard input, works at 320px
- Local-first: no account, nothing leaves the browser — and **backup to a file**, because the flip side of that promise is that clearing site data would otherwise take months of practice with it. Restore validates the file field by field, so picking the wrong one in a file dialog says what was wrong instead of corrupting your progress.
- Installable PWA, works offline

Deliberately **not** built yet: XP and achievements. The gamification that works here is musical — feedback resolving to the tonic, streaks climbing the scale — and that is already in; a points layer would be the generic version of something the app does better. Four more courses are listed as planned inside the app itself rather than hidden — see [07-UX-AND-LANGUAGE.md](docs/07-UX-AND-LANGUAGE.md) §1.

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

Six screens covering all four pillars. Its ear training, theory and Today screens are now **superseded by the real app**. It remains the reference for what isn't built: Scroll Reading with its lookahead veil, sight-singing with a pitch trace over the stave, and the Musicianship Map.

Rendered captures of every screen live in [`prototype/screens/`](prototype/screens). See [`prototype/README.md`](prototype/README.md) for what's real vs. mocked, and for the mapping from prototype shortcuts to real implementations — **the prototype is authoritative for look and feel, the docs are authoritative for behavior.**

## Stack

**In use:** Vite · React 19 · TypeScript · Tailwind v4 · React Router · Zustand · Web Audio · vite-plugin-pwa. Static deploy, no backend.

**Piano samples** live in `public/samples/piano/` and are generated by `tools/render-piano.mjs` — a physically-informed string model (stretched partials, hammer-position nulls, three detuned strings per note), rendered offline where it can afford far more partials than realtime synthesis could. They are *not* recordings of a real instrument; no licence-clean recordings were reachable offline. Swapping real ones in later is a file drop — keep the filenames and the sampler needs no changes.

**Pitch detection** is ours (`src/mic/pitch.ts`) — the McLeod method in ~120 lines, which removes a dependency and is directly unit-testable against synthesized tones.

**Planned:** VexFlow 5 (notation) · ts-fsrs (spaced repetition) · Dexie (once localStorage stops being enough). See [04-ARCHITECTURE.md](docs/04-ARCHITECTURE.md).

## Working in parallel

The first milestone is deliberately sequential — one drill at a time. Once there are several, work splits into packages that own disjoint paths so multiple sessions can run at once. See [06-ROADMAP.md](docs/06-ROADMAP.md).
