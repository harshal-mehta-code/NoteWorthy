# NoteWorthy — Feature Specification

Drill-level specs for the four pillars plus the cross-cutting modes. Each drill lists its **concept tags** (what it feeds into the scheduler), **inputs**, **scoring**, and **progression**.

Legend: 🎧 ear · 👁 reading · 🧠 theory · 🎤 voice · ⭐ flagship/differentiator

---

## 0. Shared drill anatomy

Every drill implements the same interface so the scheduler, scoring, and UI can treat them uniformly (see `04-ARCHITECTURE.md` §4 for the TypeScript contract).

```
generate(params, rng)  → Item          // deterministic given a seed
present(item)          → stimulus      // audio and/or notation
collect()              → response      // buttons | staff | mic | keyboard | tap
grade(item, response)  → Result        // correct, latency, partial credit, per-concept ratings
explain(item, result)  → Feedback      // the A/B replay + concept card
```

**Universal rules**
- Replay allowed, costs a small score multiplier (×0.9), never blocked.
- Hint available after 5s of inactivity (progressive: narrow to 2 options → show first note → reveal).
- Wrong answer always triggers comparative playback before moving on.
- Every item is reproducible from `{seed, params}` — critical for bug reports and for the "replay yesterday's session" feature.

---

## 1. 🎧 Ear Training

### 1.1 Find the Note (functional) ⭐ — the backbone
> Named **Degree ID** in earlier drafts. Renamed because "degree" is a theory word a beginner doesn't have yet — see [07-UX-AND-LANGUAGE.md](./07-UX-AND-LANGUAGE.md) §2. `Find the Note` is the user-facing name; concept ids keep `degree.*`.

**What**: a short chord intro establishes the key ("home"), then a single note sounds. Say which note of the key it was.

- **Input**: degree buttons (`1 2 3 4 5 6 7`, movable-do `Do Re Mi…`, or numeric — user preference), or **sing it back** (mic), or place it on a staff.
- **Intro to the key** (user-facing wording; "cadence" and "context" never appear on screen): full (I–IV–V–I) → short (V7–I) → home chord only → none. Weaning off the intro is its own progression axis, and it only starts once every note is in play — never at the same time as new notes.
- **Scoring**: correct/incorrect, latency, replay count. Confusion pairs are tracked explicitly (3↔5 and 4↔7 are the classic ones) and feed targeted remediation.
- **Progression**: degree ladder from `01-PEDAGOGY.md` §2.2. Then: octave range widens, tempo of presentation increases, context thins.
- **Concept tags**: `degree.<n>.<mode>.<context-level>`

### 1.2 Interval ID (abstract)
**What**: two notes, ascending / descending / harmonic. Name the interval.
- **Progression**: m2/M2/P5/octave → +M3/m3 → +P4/tritone → +6ths/7ths → compound intervals → harmonic (hardest — no melodic contour cue).
- **Twist**: "interval in context" variant plays the pair inside a key, so users learn that the *same* interval sounds different depending on function. Almost no app teaches this and it's a genuine insight moment.
- **Concept tags**: `interval.<quality><number>.<direction>`

### 1.3 Melodic Dictation
**What**: hear a phrase, reproduce it.
- **Input modes**: degree buttons → staff placement → sing-back → sing *and* notate (Full Circle).
- **Partial credit**: per-note scoring with contour bonus — getting the shape right but one note wrong is meaningfully different from random, and scoring it that way keeps people going.
- **Progression**: 2 → 3 → 4 → 5 → 8 notes; stepwise-only → leaps within triad → full diatonic → chromatic; free rhythm → notated rhythm.

### 1.4 Chord Quality & Inversion
- Quality ladder: maj/min → dim/aug → dom7 → maj7/min7/m7♭5 → 9ths/11ths/13ths.
- Inversion ID as a separate track, since it trains bass hearing.
- **Voicing randomization** is mandatory — close, open, drop-2, different registers and timbres. Fixed voicings let users memorize a sound instead of learning a quality.

### 1.5 Progression Dictation ⭐
**What**: hear 2–8 chords in a key, identify by roman numeral.
- **Input**: roman-numeral chips, or drag chords onto a timeline.
- Starts with I/IV/V only — which already covers an enormous amount of real music, and that fact is stated in the UI because it's motivating.
- Real progressions from real songs (see §6 Song Decoder) once the basics land.
- **Concept tags**: `progression.<roman-set>.<length>`

### 1.6 Rhythm Dictation
Hear a 1–2 bar rhythm, reproduce it by **tapping** (timing-graded) or by assembling note values.
Ladder: quarters/halves → eighths → rests → dotted → sixteenths → triplets → syncopation → compound meter (6/8, 12/8) → odd meter (5/4, 7/8).

### 1.7 Cadence & Function ID
Identify authentic / plagal / half / deceptive cadences; then "does this phrase end open or closed?" — the musically meaningful version of the same skill.

### 1.8 Bonus: Timbre & Production Ear
Opt-in side track, popular with producers and cheap to build: identify EQ boost frequency, compression amount, reverb type, and which of two clips is processed. Fits the pitch ("all-rounder") and pulls in an audience the competitors serve badly.

---

## 2. 👁 Sight Reading

### 2.1 Note Recognition (foundation)
Flash a note, name it. Landmark-based progression: treble G / bass F / middle C first, then neighbors, then ledger lines. Speed-graded — the goal is **sub-second recognition**, and the UI shows a running average response time because that's the number that actually matters.

### 2.2 Contour Reading
Before note names: "does this go up or down?", "step or leap?", "same or different?". Trains the pattern-recognition layer that fluent reading actually runs on.

### 2.3 Rhythm Reading (tap-along)
Notation scrolls past a playhead with a metronome; tap the rhythm.
- **Requires latency calibration** (see §5.2). Without it the scoring is meaningless.
- Grading: onset deviation in ms, with a tightening window (±120ms → ±50ms).

### 2.4 Scroll Reading ⭐
The main event. A line of music scrolls past a fixed playhead. Sing it (mic), play it (on-screen keyboard / MIDI), or name-and-tap it.
- **Lookahead veil**: notes behind the playhead fade, forcing forward reading.
- **Never stops**, never repeats material.
- Post-read review: the score is redrawn with your errors marked and a replay of what you did vs what was written.

### 2.5 Eye Span ⭐⭐
Flash a fragment for a controlled duration, hide it, reproduce it from memory.
- Axes: fragment length (2 → 8 notes), exposure time (800ms → 150ms), complexity.
- This is the app's most distinctive reading drill and directly targets the real bottleneck.

### 2.6 Key Signature & Clef Fluency
Identify key signatures instantly (both directions: sig → key, key → sig). Alto/tenor clef as an advanced unlock — string players and singers actually need these.

### 2.7 Real Repertoire Reading
Curated public-domain excerpts at your level, with a difficulty rating computed by the same vector as the generator. "You just sight-read a Bach chorale phrase" is a much better reward than a badge.

**Difficulty vector** (shared by generator and corpus rating): `{ pitchRange, keySignatureComplexity, rhythmicVocabulary, tempo, leapSize, chromaticism, ledgerLines, voiceCount }`.

---

## 3. 🧠 Music Theory

### 3.1 Format
Bite-sized interactive cards, never more than ~3 screens before a question. Every concept ships with a **manipulable widget**, not a diagram:

- Interactive keyboard (click to hear, highlights scale/chord tones)
- Circle of fifths you can spin, with live key signature and relative minor
- Staff you can drag notes onto, which plays what you build
- Chord builder — stack thirds and hear the result
- Rhythm grid you can toggle and play back

### 3.2 Curriculum
1. **Notation basics** — staff, clefs, note values, rests, measures, time signatures
2. **Rhythm & meter** — simple/compound, subdivision, syncopation, tuplets
3. **Pitch & keys** — accidentals, key signatures, circle of fifths, enharmonics
4. **Scales & modes** — major, three minors, pentatonic, blues, the seven modes
5. **Intervals** — number + quality, inversion, consonance/dissonance
6. **Chords** — triads, 7ths, inversions, figured-bass basics, symbols/slash chords
7. **Diatonic harmony** — roman numerals, function (T/S/D), cadences
8. **Melodic writing** — non-chord tones, phrase structure, contour
9. **Chromatic harmony** — secondary dominants, modal interchange, Neapolitan, augmented sixths
10. **Voice leading** — the rules and, more usefully, why they exist
11. **Form** — binary, ternary, verse/chorus, 12-bar blues, sonata sketch
12. **Applied** — transposition, instrument ranges, lead sheets, Nashville numbers

### 3.3 The linkage rule ⭐
**Every theory concept is bound to ear, reading, and vocal drills.** Learn "V7 resolves to I" → hear it in a drill within the same session → sing the 7→1 resolution → read it on a staff. The concept card is reachable from inside any drill via ⓘ, and the drill is reachable from the concept card. This bidirectional linking is what makes theory stop being trivia.

### 3.4 Reference Wiki
Every concept card doubles as a permanently browsable reference with a search box. Available offline. Useful even to people who never do a single drill — which is a real acquisition channel.

---

## 4. 🎤 Vocal Training

### 4.1 Range Mapping (onboarding + monthly)
Guided glissando up and down; detect comfortable low/high with strain guidance. Stored as `{ low, high, comfortableLow, comfortableHigh }` and used to transpose everything.

### 4.2 Pitch Match
Sustain a target pitch. Live ribbon shows deviation in cents; score = time inside tolerance. Tolerance narrows with skill (±50¢ → ±15¢).
Variants: match a played note · match after a 2s silence (memory) · match while a distractor drone plays (hardest, and the most real-world useful).

### 4.3 Interval Leaps
Given a root, sing the target interval. Measures landing accuracy (cents), time-to-stable, and overshoot. Ascending and descending; the same interval both directions is genuinely different in difficulty and scored separately.

### 4.4 Sight-Singing with pitch trace ⭐⭐
Sing a notated line while your pitch is drawn as a ribbon over the staff. Per-note grading (centered / sharp / flat / missed) plus timing. The signature screenshot of the app.

### 4.5 Agility Runs
Tempo-laddered patterns (5-note scale, arpeggio, turn, octave leap, sequenced thirds) ascending by semitone through your range. Tempo advances only when accuracy holds ≥85% across the range.

### 4.6 Call & Response
The app sings/plays a phrase, you sing it back immediately. Phrase length grows. This is the most fun vocal drill and the closest to real musicianship — it's essentially melodic dictation with your voice as the answer sheet.

### 4.7 Warm-ups & Cool-downs
Guided routines: lip trills, sirens, humming, 5-note patterns, descending cool-down. Structured as a playable sequence with a timer. Bookends every guided vocal session, non-skippable.

---

## 5. Cross-cutting modes

### 5.1 The Full Circle ⭐⭐⭐ — flagship
One musical idea through five modalities:

| Step | Action | Scored on |
|---|---|---|
| 1 | **Hear** a 4–8 note phrase in the week's key | — |
| 2 | **Sing** it back | pitch accuracy, contour, timing |
| 3 | **Notate** it on a staff | note accuracy, rhythm accuracy |
| 4 | **Sight-sing** it from your own notation | reading + pitch |
| 5 | **Play** it (on-screen keyboard or MIDI) | accuracy |

Steps 2 and 5 are skippable (no mic / no keyboard), and the drill still works with 1-3-4. Completing all five yields the largest single XP award in the app and a distinct visual celebration. Unlocks once the user has *Proficient* in the relevant Degree ID and Notation nodes.

### 5.2 Latency Calibration (required, one-time + on device change)
A 20-second wizard: tap along to a click, measure round-trip offset, store it. Mic input path is calibrated separately from output. Everything rhythm- or timing-scored refuses to run without it, and says why. Most competing apps skip this, which is exactly why their rhythm scoring feels broken.

### 5.3 Placement Test (optional, onboarding)
~3 minutes, adaptive, across all four pillars. Seeds initial ability estimates and unlocks the Map accordingly, so an experienced musician isn't forced through "this is a quarter note." Skippable — skipping just starts everything at zero.

### 5.4 Daily Warm-Up
The 5-minute assembled session described in `00-VISION.md` §4. Composition is adaptive: pillar weights shift toward the user's weak areas but never drop a pillar entirely (interleaving matters more than optimization here).

### 5.5 Recitals (boss battles)
End-of-unit mixed challenge. Opt-in, 3 lives, no replays, tighter timing. Passing awards a badge and unlocks the next Map region. Failing costs nothing but the attempt — you can retry immediately. This is the only place a failure state exists.

---

## 6. Later-phase features

### 6.1 Song Decoder ⭐
Pick a real song's chord progression (from a free/community progression source, or entered manually), and the app generates a custom drill set from it: hear those changes, sing the bass line, identify the borrowed chord. "Learn to hear the songs you love" is the single most compelling thing this app can say, and it's genuinely achievable once the progression engine exists.

*Note: chord-progression data has licensing constraints — plan for user-entered + PD-derived progressions first, and evaluate any third-party source's terms before integrating.*

### 6.2 MIDI Input
Web MIDI for real keyboard input across reading, dictation, and Full Circle. Big quality jump for keyboard players; genuinely small implementation cost.

### 6.3 Practice Journal
Auto-generated weekly summaries with specific, earned observations and a shareable card.

### 6.4 Social layer (opt-in, last)
Weekly challenge with a shared seed (everyone gets the identical items — actually fair, unlike most leaderboards), friend duels, optional leagues. Deliberately last: it must never become the reason to use the app.

---

*Next: [03-GAMIFICATION.md](./03-GAMIFICATION.md).*
