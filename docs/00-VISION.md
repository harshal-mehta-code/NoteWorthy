# NoteWorthy — Vision

> One app that turns a person who "likes music" into a musician who can **hear**, **read**, **understand**, and **sing** it.

## The one-line pitch

Most music-training apps teach one narrow skill in isolation and feel like a spreadsheet with sound. NoteWorthy trains ear, eye, mind, and voice as **one connected skill**, in one tonal context, with a feedback loop tight enough to be addictive.

---

## 1. Who this is for

| Persona | What they want | What they get |
|---|---|---|
| **The self-taught player** (guitar/piano/producer) | "I can play but I can't read, and I can't hear chord changes." | Functional ear training + sight reading that finally connects to what they already play. |
| **The singer** | "My pitch drifts and I can't sight-sing at rehearsal." | Real-time pitch feedback, agility drills, sight-singing with pitch trace over the staff. |
| **The returning adult** | "I did 6 years of lessons as a kid and remember nothing." | A placement test that skips what they know; 5-minute daily sessions that fit a real life. |
| **The music student** | "I have an aural skills exam and my school's software is from 2009." | Dictation, functional harmony, cadences, and a practice journal that shows measurable growth. |

The common thread: **adults with limited time who have failed at this before**, usually because the old apps were boring, abstract, or disconnected from real music.

---

## 2. Product principles

These are non-negotiable and should be used to settle design arguments.

1. **One tonal context.** Nearly every drill happens *in a key*, established by a cadence. Abstract, context-free intervals are a supporting drill, never the backbone. This is what makes skills transfer to real music.
2. **Everything connects.** Any concept you learn in Theory shows up within days as an ear drill, a reading drill, and a singing drill. Cross-modal encoding is the app's core mechanic, not a bonus.
3. **The feedback is musical.** Correct/incorrect chimes, streak sounds, and level-up stingers are all *in the current key and diatonically meaningful*. The reward layer is itself ear training. No generic UI blips.
4. **Never punish practice.** Hearts/lives exist only in opt-in "Recital" challenge modes. Regular practice is infinite and free of failure states.
5. **Zero chrome during a drill.** When you're in an exercise, the screen holds the exercise and nothing else — no nav bars, no badges popping, no upsells. Chrome returns between reps.
6. **No account to start.** Local-first. You can be doing a real drill within 15 seconds of landing on the URL. Sign-in is only ever offered for sync.
7. **Free, permanently, with no dark patterns.** No ads, no artificial energy meters, no streak-loss guilt-bombing, no "you're about to lose everything" push notifications.
8. **Fast and quiet.** Sub-second to first sound. Latency-calibrated. Works offline. Feels like a native instrument app, not a website.

---

## 3. What makes it different

Competitor landscape, briefly: **Functional Ear Trainer** (great method, one drill, dated UX), **ToneGym** (broad, gamified, but shallow and paywalled), **EarMaster** (deep, desktop-heavy, expensive, academic feel), **Teoria/musictheory.net** (excellent free reference, no progression or retention loop), **Duolingo-for-music clones** (fun, but musically thin — mostly note-name quizzes).

None of them do these:

### 3.1 The Full Circle drill — the flagship
A single exercise that runs one musical idea through every modality in sequence:

```
HEAR it  →  SING it back  →  NOTATE it  →  READ & SING it from your notation  →  PLAY it
 (audio)     (mic scored)     (staff input)     (sight-sing, scored)          (keyboard/MIDI)
```

Nothing else on the market closes this loop. It's the difference between "I can pass an interval quiz" and "I am a musician." It's also intrinsically satisfying — you hear a phrase, and four steps later you *own* it.

### 3.2 Key of the Week
Every pillar tunes to one tonal center for a week, rotating around the circle of fifths. Ear drills, reading material, vocal warm-ups, and theory examples all live in that key. You develop genuine functional hearing in a key instead of a shallow smear across twelve. It also gives the app a **rhythm** — a reason this week is different from last week, without inventing fake events.

### 3.3 Eye-Span training for sight reading
Real sight-reading is bottlenecked by how far *ahead* of the sounding note your eyes are. Nobody trains this directly. We do: flash a measure, hide it, then have you sing/play it from memory — progressively increasing the chunk. Directly attacks the actual limiting factor.

### 3.4 Pitch trace over the staff
When you sight-sing, your live pitch is drawn as a ribbon over the notation, with cents deviation shaded. It is instantly legible, gorgeous, and shareable — the kind of screenshot that sells an app by itself.

### 3.5 Comparative error playback
Get an answer wrong and you don't just see red — you *hear* the A/B: "here's what you picked, here's what it was," back to back, in context. Comparative feedback is the fastest known correction mechanism for auditory discrimination, and almost no app does it.

### 3.6 The Musicianship Map
Progress isn't a list of lessons; it's a constellation of connected skill nodes across all four pillars, with visible edges showing prerequisites. You can *see* that "hearing V→I" sits between "major triad quality" and "progression dictation." Deeply motivating, and it makes the curriculum's logic legible.

### 3.7 Auto-transposition to your voice
On first run we map your comfortable range (30 seconds, guided). From then on, every singable exercise is automatically transposed into your range. No other app does this well, and it removes the single biggest friction point for vocal drills.

### 3.8 The Practice Journal
Auto-written, human-readable weekly summaries: *"Your descending minor 6th went 42% → 78% this week. Your weakest area is now chord inversions in minor keys."* Real, specific, earned feedback — the thing people screenshot and share.

---

## 4. The daily loop (retention design)

The app's heartbeat is a **5-minute Warm-Up**, assembled fresh each day by the scheduler from all four pillars:

```
1 min   Vocal warm-up in your range, in this week's key
2 min   Ear training — spaced-repetition items that are due, interleaved
1 min   Sight reading — new material, never repeated
1 min   Theory retrieval — 3-5 questions on concepts going stale
```

Finish it and the streak advances. It's short enough to do on a commute, structured enough to be genuinely effective, and different every day. Everything beyond the Warm-Up is free-play practice the user chooses.

**Retention is earned through competence, not coercion.** The hook is "I can hear things I couldn't hear last month," reinforced by the Journal and the Map. Streaks are supportive (with a free "Fermata" pause), never punitive.

---

## 5. Success criteria

We'll know the design is working when:

- **D1 / D7 / D30 retention** — the honest test of whether the loop is fun.
- **Median session length 5–12 min**, multiple sessions/week (not one long cram).
- **Measured skill gain**: functional-degree ID accuracy at a fixed difficulty, tracked per user over 30 days. The app should be able to *prove* it works.
- **Warm-Up completion rate > 60%** among returning users.
- **Time-to-first-sound < 3s** on a mid-range phone over 4G.

---

## 6. Scope boundaries (what this is *not*)

- Not a DAW, not a notation editor, not a score library.
- Not an instrument-technique teacher (no guitar tabs, no piano fingering courses).
- No video lessons. Everything is interactive.
- No social feed in v1. Leaderboards and challenges are a later, opt-in layer.

---

*Next: [01-PEDAGOGY.md](./01-PEDAGOGY.md) — why the drills are shaped the way they are.*
