# Navigation & Language

Short doc, two rules. Both came out of prototype feedback: the app had too many things going on at once, and it used words a beginner doesn't have yet.

---

## 1. Navigation: one path, one action

> **Revised at v0.4.** The rules below were written when the app had one drill, and they were right then. With four courses across four pillars they went wrong in the opposite direction: a seventeen-level app with its other courses behind a small "change level" link reads as a one-trick toy. Tabs and a Practice library are now in. What has *not* changed is rule 2 — a drill still carries no navigation at all.
>
> The library also lists **planned** courses, greyed and honest, because the fastest way to make an app look thin is to hide everything it is going to be.

The prototype showed four tab bars' worth of destinations before a single drill existed. That's backwards. The shipped structure is a **line, not a hub**:

```
Welcome  →  Home  →  Practice  →  Summary  →  Home
              ↓                        ↓
           Settings              Practice (again)
```

Rules that keep it that way:

1. **Home has exactly one primary action.** Everything else on it is status, and status is one line each. The moment Home becomes a dashboard, it stops being obvious what to do next.
2. **A drill screen has no navigation.** Exit and progress, nothing else. No XP counter ticking, no badges firing.
3. **Settings is a leaf.** Reachable from Home, returns to Home, links nowhere.
4. **New surfaces need a reason.** A tab bar arrives when there are genuinely 3+ things worth switching between — not before. The Map, the profile, and the journal are all deferred until the pillars they summarise exist.
5. **Nothing is locked.** Levels can be jumped between freely. Gating content is a retention trick, and we don't do those.

### What was deliberately cut from v1
Tab bar · Musicianship Map · profile radar · journal · XP and levels-as-currency · achievements · daily Warm-Up mix. All specified, none built. They earn their way in once there is more than one drill to summarise.

---

## 2. Language: name the sound, not the theory

The learner is someone who likes music and can't yet read it. Every word on screen has to work for them.

| Don't say | Say | Why |
|---|---|---|
| Degree ID | **Find the Note** | "Degree" is a music-theory word. Nobody arrives knowing it. |
| Scale degree | **note**, or **the note's place in the key** | The number on the button carries the idea. |
| Tonic | **home** | Instantly graspable, and it's what the note actually feels like. |
| Cadence | **the intro to the key** | Names its purpose rather than its category. |
| Context establishment | *(don't mention it)* | Explain by playing one, not by defining it. |
| Functional ear training | *(never user-facing)* | Internal term. |
| Interval | **the distance between two notes** | Only when we actually get to intervals. |

### The nicknames
Each note of the key gets a plain description, shown in feedback so the number means something musical:

| | |
|---|---|
| **1** | home |
| **2** | the step above home |
| **3** | the bright one |
| **4** | the leaning one |
| **5** | the strong one |
| **6** | the soft one |
| **7** | the one that pulls home |

These are how the app teaches function without ever using the word. "3 is the bright one that tells you the key is major" does more work than "3 is the mediant."

### Explaining by ear, not by text
The onboarding's middle screen doesn't define a cadence — it **plays** one, labels the two parts as they sound ("the key", then "the note"), and moves on. The concept is far easier to hear than to read, and that's true of most of this curriculum.

### Copy tone
Plain, specific, no exclamation marks, no cheerleading. Feedback states a fact and points at what to listen for. "3 · Mi caught you out most — the bright one. Listen for whether the note has arrived or still wants to move."

---

## 3. Difficulty: teach the prerequisite first

The original ladder started by asking which of seven notes you'd heard. That silently assumes you can already **find home** — and nothing anywhere was teaching that. It tested the skill instead of building it.

So the ladder now has two stages, and the first one exists purely to make the second one learnable.

### Stage 1 — Finding home
A **drone** holds the home note under everything. That is the whole trick: with home sounding continuously you *compare* rather than *remember*, so the question stops depending on a memory you don't have yet.

| Level | Question | Notes |
|---|---|---|
| 1 — Home or away | Was that note home? | 1 vs 5 |
| 2 — Spot home anywhere | Was that note home? | 1 vs any |
| 3 — Settled or restless | Had it arrived, or did it want to move? | all seven |
| 4 — Find home | Three notes play — which was home? | drone off |

The progression inside the stage is: recognise home against an obvious contrast → against any contrast → generalise to *stability* rather than one specific note → hold home in memory without the drone. Level 4 is the bridge, and one of its two distractors is always a 3 or a 5, because those are what people actually mistake for home.

### Stage 2 — Naming the notes
The drone is gone. Now the key is planted by a chord intro and you name what you hear.

| Level | Notes | Intro to the key |
|---|---|---|
| 5 — The home chord | 1, 3, 5 | Full |
| 6 — The two that pull | + 4, 7 | Full |
| 7 — All seven | + 2, 6 | Full |
| 8 — Less help | all seven | Short |
| 9 — On your own | all seven, two octaves | Home chord only |

### Stage 3 — Going deeper
Where it stops being gentle. Each level moves a *different* axis, so none of them is just "the same thing but faster".

| Level | What changes | Axis |
|---|---|---|
| 10 — Two in a row | Two notes play; name both in order | phrase length |
| 11 — Three in a row | Three notes, shorter intro | phrase length + help |
| 12 — Minor keys | Third, sixth and seventh all move down | mode |
| 13 — Colour notes | Adds ♭7 and ♯4, from outside the key | chromaticism |
| 14 — Nothing to hold onto | New key every question, two octaves, one chord of intro | reference |

**One axis moves at a time.** Notes are added, or help is withdrawn, or the phrase gets longer — never two at once, and help only starts being withdrawn once all seven notes are in play.

### Stage 4 — Your voice
The first three stages are recognition: you pick from what's offered. This stage is **production** — you make the note yourself, which cannot be guessed and is a far stronger test of whether you actually have the pitch.

| Level | What you do | Help |
|---|---|---|
| 15 — Sing home | Hear the key, then sing home | always the same note |
| 16 — Sing it back | A note plays; sing it back once it stops | you heard it |
| 17 — Sing the note | You're *told* which note; nothing plays it | none |

Three rules make this work:

- **Any octave counts.** A bass and a soprano asked for the same note will correctly sing an octave or two apart. Grading is on pitch class, so both are right. Absolute-pitch grading would need range mapping first, which we don't have.
- **Nothing sounds while you sing.** The reference plays and then *stops*. That makes it production from memory rather than imitation — and it stops the app hearing its own playback through the speakers and scoring it as your voice.
- **Declining is never a dead end.** The microphone is requested at the drill, not on load, with a plain explanation. Refusing it leaves every other level working, and a skip advances without recording anything, so a missing microphone never poisons your statistics.

Tolerance starts at ±50 cents and tightens to ±40 by level 17. You have to hold the note for about a second, with a short grace period so a breath doesn't reset you.

### Round length
Six questions in the naming stage, eight in the yes/no stage where each question is quicker, five where each question is three notes or sung. Under a minute either way. Long rounds make the app feel like homework; a short round you'll happily repeat beats a long one you won't start.

---

## 4. Adaptation: the app notices

Two things run off per-note history, kept per level.

**Selection.** Notes you've been missing come up more often — weighted up to 3.5×, floored at 1× so a note you're good at never disappears entirely. Practising only your weak spots lets the strong ones quietly rot. Weights are captured once per round rather than recomputed live, because a distribution that chases a single bad answer reads as the app picking on you.

**Reporting.** The summary's single observation prefers history over this round: ten questions is far too few to say anything reliable. It reaches for the weakest note across every round at the level, mentions it by name and nickname, and says whether it's climbing. Underneath, a quiet strip of tinted chips gives per-note accuracy at a glance — scannable in a second, which a table never is.
