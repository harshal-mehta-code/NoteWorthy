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

## 3. Difficulty: one axis at a time

The other source of overwhelm was too many notes at once. The ladder now adds a small group, holds everything else constant, and only withdraws help once every note is in play:

| Level | Notes | Intro to the key |
|---|---|---|
| 1 — The home chord | 1, 3, 5 | Full |
| 2 — The two that pull | + 4, 7 | Full |
| 3 — All seven | + 2, 6 | Full |
| 4 — Less help | all seven | Short |
| 5 — On your own | all seven, two octaves | Home chord only |

Three buttons on the first screen instead of seven is the single biggest reason the drill now feels approachable.
