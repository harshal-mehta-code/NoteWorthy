# NoteWorthy — Learning Design

Why every drill is shaped the way it is. When a design decision is contested, the answer should be traceable to something here.

A note on evidence: the general learning-science findings below (retrieval practice, spacing, interleaving, feedback timing) are well-replicated across domains. The music-specific claims are supported by a smaller literature plus strong practitioner consensus; where the evidence is practitioner-level rather than experimental, it's marked **[practice]**. We should treat our own analytics as the tiebreaker and A/B test the contested choices.

---

## 1. Core learning principles we build on

### 1.1 Retrieval practice (the testing effect)
Being asked to produce an answer strengthens memory far more than being shown the answer. Consequences for us:

- **No passive lessons.** Theory content is never more than ~3 screens before a question.
- **Produce, don't recognize, where possible.** Singing a scale degree back > picking it from four buttons. Notating a heard melody > multiple choice. We offer both, but production modes are worth more XP and are weighted more heavily in mastery estimates.
- Every lesson ends with retrieval, and the same items return days later via the scheduler.

### 1.2 Spaced repetition
Review at expanding intervals timed to just-before-forgetting beats massed practice, dramatically, for long-term retention.

- We use **FSRS** (Free Spaced Repetition Scheduler) at the level of *concepts*, not individual questions — e.g. `interval.m6.descending.major-context`, `keysig.Bb.major`, `chord.dim7.root-position`.
- Each due concept **generates a fresh item** at review time rather than replaying a memorized stimulus. This is the critical adaptation: in language flashcards the card *is* the content, but in ear training a memorized specific audio clip teaches nothing. Same concept, new instance, every time.
- Grading maps performance → FSRS rating: correct+fast → *Easy*; correct+slow or after replay → *Good*; correct after hint → *Hard*; wrong → *Again*.

### 1.3 Interleaving
Mixing item types within a session hurts practice-session performance and *improves* long-term retention and transfer — the classic desirable-difficulty result. Blocked practice feels better and works worse.

- The daily Warm-Up is **always interleaved** across pillars and concepts.
- Free-play modes may be blocked (users want to grind one thing, and that's fine for initial acquisition), but the scheduler will always re-interleave that material later.
- New concepts get a short blocked introduction (~8 reps) before entering the interleaved pool. Pure interleaving from rep zero is too hard for acquisition.

### 1.4 Desirable difficulty & adaptive targeting
Learning is fastest at a success rate meaningfully below 100%. The commonly cited optimum for this class of task is around **80–85%**.

- Every drill runs a live difficulty controller targeting **~82% accuracy**.
- Implementation: per-concept ability estimate updated with an Elo-style rule; item difficulty selected to sit near the user's current estimate. (Elo, not full IRT — it's online, cheap, needs no calibration corpus, and is what chess and Duolingo both use successfully.)
- If accuracy drifts above 90% for a window, difficulty escalates automatically (faster tempo, wider range, more chromatics, thinner context). Below ~70%, it backs off and can drop to a scaffolded variant.

### 1.5 Immediate, comparative, corrective feedback
For perceptual discrimination, feedback needs to be immediate and needs to make the *contrast* audible.

- Wrong answer → instant **A/B replay**: your answer, then the correct one, then the correct one in context. This is the single highest-value 3 seconds in the app.
- Feedback is never only visual for an auditory skill. Red text teaches nothing about sound.
- Correct answers get a brief, musical confirmation and move on fast — don't spend the user's attention on things they already know.

### 1.6 Generation & production
Producing a response with your body (voice) creates stronger, more durable representations than button-pressing, and it's the only way to verify you actually internalized a pitch relationship rather than pattern-matching a UI.

- Singing is a first-class input everywhere it makes sense, not a separate silo.
- The Full Circle drill (hear → sing → notate → read → play) exists specifically to run one idea through multiple production modalities.

---

## 2. Ear training method

### 2.1 Functional-first, intervals second
The central methodological choice. Two competing traditions:

- **Abstract interval training** — "is this a m3 or M3?" Notes float free of any key.
- **Functional (contextual) training** — establish a key with a cadence, then identify notes by their *scale degree* / function. This is the Bruce Arnold / Alain Benbassat lineage, popularized by the Functional Ear Trainer app. **[practice]**

We make functional the backbone because real music is tonal: when you hear a melody, you are hearing degrees relative to a tonic, not a chain of isolated intervals. Interval-only training notoriously produces people who ace interval quizzes and still can't transcribe a pop song — the skill doesn't transfer because the task doesn't match.

Abstract intervals still matter (atonal contexts, leaps in wide-interval melodies, instrumental transposition), so they remain a supporting track — roughly **70% functional / 30% interval** in the mixed pool.

**Context establishment**: before each functional item, play a short cadence in the key (I–IV–V–I, or a compact V7–I). Randomize the voicing and instrument so users key off the tonality rather than memorizing one specific sound.

### 2.2 The degree ladder
Scale degrees introduced in an order driven by perceptual salience and tonal stability — stable tones first, then the tones that pull toward them:

1. **1, 5** — tonic and dominant, the two anchors
2. **+3** — the triad; establishes major/minor color
3. **+ 4, 7** — the tritone pair that defines dominant function; 7→1 leading-tone pull
4. **+ 2, 6** — full diatonic scale
5. **Minor keys** — natural first, then harmonic (raised 7), then melodic
6. **Chromatics** — introduced by function, not chromatically: ♭7 first (mixolydian/blues, most common), then ♯4 (lydian/secondary dominant), then ♭3, ♭6, ♭2
7. **Two-octave range**, then leaps across octaves

### 2.3 Melodic dictation ladder
Length grows only when accuracy holds:

`2 notes → 3 → 4 → 5-note phrase → 8-note phrase → 2-bar phrase with rhythm`

Answer modes, in increasing difficulty and value: degree buttons → staff placement → **sing it back** → sing *and* notate.

Rhythm is introduced independently, then combined. Combining pitch and rhythm too early swamps working memory and stalls both.

### 2.4 Harmony ladder
1. Chord **quality** in isolation: maj / min → + dim / aug → + dominant 7 → + maj7 / min7 / m7♭5 → extensions
2. Chord **inversions** (root / 1st / 2nd) — trains bass-note hearing
3. **Diatonic function in a key**: I, IV, V first (covers a huge share of real music), then vi, ii, iii, vii°
4. **Progression dictation**: 2 chords → 3 → 4 → 8-bar forms, including genuinely common progressions (I–V–vi–IV, ii–V–I, 12-bar blues, I–vi–IV–V, Andalusian)
5. **Cadence identification**: authentic / plagal / half / deceptive
6. **Bass-line hearing** — hearing the bass is what unlocks transcription; explicitly trained, rarely taught
7. **Modal interchange & secondary dominants** — the "why does that chord sound cool" tier

### 2.5 Working memory constraints
Auditory working memory holds roughly 3–5 chunks for a few seconds. So:

- Never ask for more than ~4 new items before an answer opportunity.
- Replay is always available; it costs a small score penalty rather than being forbidden. Blocking replay just creates anxiety and teaches nothing.
- Answer time limits are generous by default and only tighten in explicit speed modes.

---

## 3. Sight reading method

### 3.1 The actual bottleneck: eye-hand span
Skilled sight readers look **ahead** of what they're currently producing — commonly a beat or more, roughly a measure at higher skill levels — and read in *chunks* (patterns, contours, intervals) rather than note-by-note. Poor readers fixate on the current note and decode letter names serially. **[practice, with supporting eye-tracking literature]**

This yields three drills nobody else ships:

- **Eye Span** — flash a fragment (150–800ms), hide it, reproduce it. Chunk size grows with skill. Directly trains the span.
- **Scroll mode with a lookahead veil** — the notes *behind* the playhead fade out, forcing forward reading and making regression impossible.
- **Contour-first reading** — early drills ask "up, down, or same?" and "step or leap?" before ever asking for note names. Reading is pattern recognition first, alphabet second.

### 3.2 Landmarks over counting
Beginners are taught mnemonics ("Every Good Boy...") that force serial counting up the staff. Better: learn a few **landmark notes** by shape recognition (treble G on the G-line, bass F, middle C in both clefs) and read everything else as an interval from the nearest landmark. Faster, and it scales to ledger lines. **[practice — standard among reading pedagogues]**

### 3.3 Volume of novel material, never repeated
Sight reading is by definition first-encounter reading. Practicing the same 20 exercises builds memorization, not reading.

- Exercises are **procedurally generated** within tight stylistic constraints, so material is effectively unlimited and never repeats.
- A curated public-domain corpus (folk melodies, Bach chorale phrases, hymn tunes) supplies real music alongside it — see §5.
- The generator is constrained by a difficulty vector (see 02-FEATURES §2) so "new" never means "random garbage."

### 3.4 Don't stop
The cardinal rule of sight reading is keep going. So the app **never pauses on an error** during a read-through. It marks it and moves on; review happens after. Stopping to fix mistakes actively trains the wrong habit.

### 3.5 Rhythm before pitch
Rhythm errors kill more readings than pitch errors, and rhythm can be practiced without pitch at all. Rhythm-only tap-along drills come first in each new metric context, then pitch is layered in.

---

## 4. Vocal training method

### 4.1 Feedback loop
Singing accuracy is a closed-loop skill: produce → hear → correct. Real-time visual pitch feedback accelerates this loop measurably, especially for people who can't yet hear their own error.

- Live pitch ribbon with a **cents** readout and a target band.
- Tolerance starts wide (±50¢, ~half a semitone) and narrows with skill toward ±15¢. A fixed tight tolerance just demoralizes beginners; a fixed loose one stops teaching.
- Score components: **centering** (mean deviation), **stability** (variance / wobble), **onset accuracy** (timing), and **recovery** (how fast you correct after drifting) — recovery is the one that actually predicts real-world singing and is almost never measured.

### 4.2 Range-first
Detect comfortable range at onboarding (guided glissando up and down, with clear "stop if it strains" instruction), store it, and **auto-transpose every singable exercise** into it. Re-check monthly, and after any warm-up where the top notes are consistently missed.

### 4.3 Agility
Vocal agility (fast accurate melismas, scale runs, arpeggios) improves with tempo-laddered repetition of small patterns. Standard voice-studio practice: a pattern at a tempo, ascending by semitone through the range, with tempo increasing only once accuracy holds. **[practice]**

- Patterns: 5-note scale, arpeggio, turn, octave leap, chromatic approach, sequenced thirds.
- Tempo ladder gated on accuracy: hold ≥85% at the current tempo across the range before it advances.

### 4.4 Vocal health (non-negotiable)
- Every vocal session opens with a warm-up and closes with a cool-down; these are not skippable in guided sessions.
- Session length nudges at 15 and 25 minutes; a hard suggestion to stop at 40.
- Any strain-adjacent signal (repeated failure at the top of the range, unstable high notes) → drop the transposition, don't push.
- Explicit copy: this is training, not diagnosis; stop if anything hurts.

---

## 5. Content strategy

- **Procedural generation** for the bulk of drill items — constrained by key, range, rhythmic vocabulary, interval set, and difficulty vector.
- **Curated public-domain corpus** for musical authenticity: folk melodies, Bach chorales (harmonic analysis is already published for many), hymn tunes, simple classical themes. All **PD or CC0** — licensing is checked before anything enters the repo, and every item carries a source field.
- **Never generate ugly music.** The generator obeys voice-leading and contour rules (resolve leading tones, prefer stepwise motion after a leap, keep phrases in a singable range, end phrases on stable degrees). Users notice, and ugly drills feel cheap.

---

## 6. Assessment & the mastery model

Two numbers per concept, kept separate because they answer different questions:

| Metric | What it means | Used for |
|---|---|---|
| **Ability** (Elo-style, continuous) | How hard an item you can currently handle | Picking the next item's difficulty |
| **Retention** (FSRS memory state) | How likely you are to still know it in N days | Deciding *when* to bring it back |

Mastery levels shown to the user: **Introduced → Practicing → Proficient → Mastered → Maintained**. Promotion requires performance across **separate sessions on different days** — never within one session. Same-session repetition inflates apparent mastery and is the classic way learning apps lie to their users.

---

*Next: [02-FEATURES.md](./02-FEATURES.md) — the drills themselves.*
