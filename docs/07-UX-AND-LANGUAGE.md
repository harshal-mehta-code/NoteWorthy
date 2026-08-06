# Navigation & Language

Short doc, two rules. Both came out of prototype feedback: the app had too many things going on at once, and it used words a beginner doesn't have yet.

---

## 1. Navigation: one path, one action

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

**One axis moves at a time.** Notes are added, or help is withdrawn, never both — and help only starts being withdrawn once all seven notes are in play.

### Round length
Six questions in the naming stage, eight in the yes/no stage where each question is quicker. Under a minute either way. Long rounds make the app feel like homework; a short round you'll happily repeat beats a long one you won't start.
