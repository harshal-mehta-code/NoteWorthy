import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Dots, IconButton, Screen, Sheet } from '@/components/ui';
import { SingPanel, type SingOutcome } from '@/components/SingPanel';
import { PhrasePanel, type PhraseOutcome } from '@/components/PhrasePanel';
import { TapPanel, type TapOutcome } from '@/components/TapPanel';
import { RhythmStaff } from '@/components/RhythmStaff';
import { gradeRhythm, offsetNote, soundingNotes, type RhythmGrade } from '@/core/rhythm';
import { Staff } from '@/components/Staff';
import { INTRO_HELP, INTRO_LABEL, findLevel, isPhraseKind, isSingKind, usesKey } from '@/core/levels';
import type { IntroMode } from '@/core/levels';
import { getCourse, COURSES } from '@/core/courses';
import { buildWarmup, planBreakdown, type PlanStep } from '@/core/warmup';
import { isUsable, octaveShiftFor, shiftIntoRange } from '@/core/range';
import { directionLabel } from '@/core/intervals';
import { buildChord, type ChordQuality } from '@/core/chords';
import { KEYS, degreeLabel, degreeToMidi, keyLabel, pickRandom, type KeyChoice } from '@/core/music';
import type { PhraseSlot } from '@/core/phrase';
import {
  blamedDegrees,
  columnsFor,
  degreeForOption,
  generate,
  slotCount,
  type Question,
} from '@/core/question';
import { degreeWeights, levelFor, useStore } from '@/store/useStore';
import { statKey } from '@/core/courses';
import {
  droneRunning,
  now,
  playAgainstHome,
  playComparison,
  playCorrect,
  playCorrectSimple,
  playKeyIntro,
  playSequence,
  playSessionEnd,
  playTapTick,
  startDrone,
  stopDrone,
  unlockAudio,
} from '@/audio/engine';

type Phase = 'intro' | 'playing' | 'question' | 'correct' | 'wrong';

const HOLD_CORRECT_MS = 1250;
const HOLD_WRONG_MS = 3200;
/** Gap between notes when a question plays more than one. */
const SEQUENCE_GAP = 0.78;

export default function Practice({ warmup = false }: { warmup?: boolean } = {}) {
  const navigate = useNavigate();
  const params = useParams<{ courseId?: string }>();

  const progress = useStore((s) => s.progress);
  const allStats = useStore((s) => s.stats);
  const keyMode = useStore((s) => s.keyMode);
  const keyName = useStore((s) => s.keyName);
  const labelStyle = useStore((s) => s.labelStyle);
  const introOverride = useStore((s) => s.introOverride);
  const allDegreeStats = useStore((s) => s.degreeStats);
  const allMemories = useStore((s) => s.memories);
  const vocalRange = useStore((s) => s.vocalRange);
  const tapOffsetMs = useStore((s) => s.tapOffsetMs);
  const learnTapOffset = useStore((s) => s.learnTapOffset);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const recordRetention = useStore((s) => s.recordRetention);
  const finishSession = useStore((s) => s.finishSession);

  /**
   * Both modes run the same loop over a **plan** — a list of
   * {course, level} steps. A normal round is the same step repeated; a
   * warm-up is a mix. Unifying them means the warm-up gets every drill type
   * for free, and there is only one place where a question is asked.
   */
  const plan = useMemo<PlanStep[]>(() => {
    if (warmup) return buildWarmup(progress, allStats, allMemories);
    const c = getCourse(params.courseId ?? 'find-the-note') ?? COURSES[0];
    const levelId = levelFor(progress, c.id);
    const rounds = findLevel(c.levels, levelId).roundLength;
    return Array.from({ length: rounds }, () => ({ courseId: c.id, levelId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [index, setIndex] = useState(0);
  const step = plan[Math.min(index, plan.length - 1)];
  const course = getCourse(step.courseId) ?? COURSES[0];
  const level = step.levelId;
  const config = findLevel(course.levels, level);

  /** Intervals, chords, reading and rhythm have no tonal centre to establish. */
  const inKey = usesKey(config.kind);
  const progression = config.kind === 'progression-id';
  const singing = isSingKind(config.kind);
  const phrase = isPhraseKind(config.kind);
  const reading = config.kind === 'read-note';
  const tapping = config.kind === 'tap-rhythm';

  const rollKey = useCallback(
    (): KeyChoice =>
      keyMode === 'random' || config.keyPerQuestion
        ? pickRandom(KEYS)
        : (KEYS.find((k) => k.name === keyName) ?? KEYS[0]),
    [config.keyPerQuestion, keyMode, keyName],
  );

  const [key, setKey] = useState<KeyChoice>(rollKey);
  const keyRef = useRef(key);
  keyRef.current = key;

  const introMode: IntroMode = !inKey
    ? 'none'
    : config.drone
      ? 'none'
      : introOverride === 'auto'
        ? config.intro
        : introOverride;

  const [phase, setPhase] = useState<Phase>('intro');
  const [question, setQuestion] = useState<Question | null>(null);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [slots, setSlots] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  /** Per-note results of a sung phrase, kept so the reveal can show them. */
  const [phraseSlots, setPhraseSlots] = useState<PhraseSlot[] | null>(null);
  /** Per-note results of a tapped rhythm, likewise. */
  const [rhythmGrade, setRhythmGrade] = useState<RhythmGrade | null>(null);

  const score = useRef({ correct: 0, skipped: 0, bestStreak: 0, misses: new Map<number, number>() });
  /**
   * Per course+level tallies, so retention can be updated once per level at
   * the end. A warm-up spans several, and one round of a level is the right
   * grain: grading each answer separately would swing stability on noise.
   */
  const perStep = useRef(new Map<string, { right: number; total: number; ms: number[] }>());
  /** When the current question became answerable. */
  const readyAt = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const prevItem = useRef<number | null>(null);
  const answered = useRef(false);

  /**
   * Weights are captured once per round, per course+level. Recomputing
   * mid-round would let the distribution chase a single bad answer, which
   * reads as the app picking on you rather than adapting.
   */
  const weightCache = useRef(new Map<string, Map<number, number>>());
  const weightsFor = useCallback(
    (s: PlanStep) => {
      const key = statKey(s.courseId, s.levelId);
      const cached = weightCache.current.get(key);
      if (cached) return cached;
      const c = getCourse(s.courseId) ?? COURSES[0];
      const built = degreeWeights(allDegreeStats[key], findLevel(c.levels, s.levelId).degrees);
      weightCache.current.set(key, built);
      return built;
    },
    [allDegreeStats],
  );

  /**
   * Log one answer against its course+level, with how long it took.
   *
   * Response time is only recorded for the *first* answer of a multi-slot
   * question — the second and third slots measure how fast you can tap, not
   * how fast you knew.
   */
  const tally = (s: PlanStep, right: boolean) => {
    const key = statKey(s.courseId, s.levelId);
    const entry = perStep.current.get(key) ?? { right: 0, total: 0, ms: [] as number[] };
    entry.right += right ? 1 : 0;
    entry.total += 1;
    if (readyAt.current !== null) {
      entry.ms.push(performance.now() - readyAt.current);
      readyAt.current = null;
    }
    perStep.current.set(key, entry);
  };

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      clearTimers();
      stopDrone();
    },
    [],
  );

  /**
   * Absolute pitches for a question, whether it thinks in degrees or not.
   *
   * Sung questions get moved into the singer's octave. Grading was always
   * octave-agnostic, so this changes nothing about what counts as right — it
   * only stops a low voice having to transpose the prompt before answering
   * it, which is an extra step and a harder one than the skill being trained.
   */
  const midisFor = useCallback(
    (q: Question, tonic: number) => {
      const midis = q.midis ?? q.sequence.map((deg, i) => degreeToMidi(tonic, deg, q.octaveUp[i]));
      return isSingKind(q.kind) ? shiftIntoRange(midis, vocalRange) : midis;
    },
    [vocalRange],
  );

  /** Where a sung target actually sounds, for the reference and the meter. */
  const singTargetMidi = useCallback(
    (q: Question, tonic: number) => {
      const base = degreeToMidi(tonic, q.target ?? 0);
      return base + octaveShiftFor(base, vocalRange);
    },
    [vocalRange],
  );

  const playQuestion = useCallback(
    (q: Question, tonic: number, onDone: () => void, gap = SEQUENCE_GAP) => {
      const midis = midisFor(q, tonic);
      setPlayingIndex(0);

      // Reading questions are silent until answered — the whole point is to
      // decode the notation, not to recognise a pitch.
      if (midis.length === 0 || q.kind === 'read-note') {
        setPlayingIndex(-1);
        later(onDone, 120);
        return;
      }

      if (q.chordSeq) {
        const gapMs = 1000;
        q.chordSeq.forEach((chord, i) => {
          later(() => {
            setPlayingIndex(i);
            playSequence(chord, 0, 0.92, 0.19);
          }, i * gapMs);
        });
        later(
          () => {
            setPlayingIndex(-1);
            onDone();
          },
          q.chordSeq.length * gapMs,
        );
        return;
      }

      if (q.simultaneous) {
        playSequence(midis, 0, 1.3, 0.24);
        later(() => {
          setPlayingIndex(-1);
          onDone();
        }, 320);
        return;
      }

      if (midis.length === 1) {
        playSequence(midis, SEQUENCE_GAP, 1.15, 0.26);
        later(() => {
          setPlayingIndex(-1);
          onDone();
        }, 260);
        return;
      }

      // A fast run needs shorter notes as well as a shorter gap, or they
      // overlap into a smear instead of sounding like a run.
      playSequence(midis, gap, Math.min(0.7, gap * 1.15), 0.26);
      midis.forEach((_, i) => later(() => setPlayingIndex(i), i * gap * 1000 + 60));
      later(
        () => {
          setPlayingIndex(-1);
          onDone();
        },
        (midis.length - 1) * gap * 1000 + 400,
      );
    },
    [midisFor],
  );

  const askQuestion = useCallback(
    (questionIndex: number) => {
      clearTimers();
      answered.current = false;
      setSlots([]);
      setPhraseSlots(null);
      setRhythmGrade(null);

      const thisStep = plan[Math.min(questionIndex, plan.length - 1)];
      const thisCourse = getCourse(thisStep.courseId) ?? COURSES[0];
      const cfg = findLevel(thisCourse.levels, thisStep.levelId);
      const thisUsesKey = usesKey(cfg.kind);

      // The drone belongs to a level, not a round — in a warm-up it has to
      // appear and disappear between questions.
      if (cfg.drone && !droneRunning()) startDrone(keyRef.current.tonic);
      if (!cfg.drone && droneRunning()) stopDrone();

      const tonic = cfg.keyPerQuestion && questionIndex > 0 ? rollKey() : keyRef.current;
      if (tonic !== keyRef.current) {
        keyRef.current = tonic;
        setKey(tonic);
      }

      const q = generate(cfg, prevItem.current, weightsFor(thisStep), tonic.tonic);
      prevItem.current =
        q.target ?? (q.kind === 'read-note' ? (q.staff?.index ?? null) : null) ??
        q.sequence[q.sequence.length - 1] ?? null;
      setQuestion(q);

      const startPlaying = () => {
        setPhase('playing');
        playQuestion(
          q,
          tonic.tonic,
          () => {
            readyAt.current = performance.now();
            setPhase('question');
          },
          cfg.phraseGap ?? SEQUENCE_GAP,
        );
      };

      if (cfg.drone) {
        setPhase('playing');
        later(startPlaying, questionIndex === 0 ? 950 : 320);
        return;
      }

      const levelIntro: IntroMode = !thisUsesKey
        ? 'none'
        : introOverride === 'auto'
          ? cfg.intro
          : introOverride;
      const intro: IntroMode =
        questionIndex === 0 && levelIntro === 'none' && thisUsesKey ? 'short' : levelIntro;

      if (intro === 'none') {
        setPhase('playing');
        later(startPlaying, 260);
        return;
      }

      setPhase('intro');
      const introEnds = playKeyIntro(tonic.tonic, intro, cfg.mode);
      later(startPlaying, Math.max(120, (introEnds - now()) * 1000 + 240));
    },
    [introOverride, plan, playQuestion, rollKey, weightsFor],
  );

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void unlockAudio().then(() => askQuestion(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function creditItems(q: Question): number[] {
    if (q.kind === 'interval-id') return [Number(q.correctIds[0])];
    if (q.kind === 'read-note') return q.staff ? [q.staff.index] : [];
    if (isSingKind(q.kind)) return q.target === undefined ? [] : [q.target];
    return q.sequence;
  }

  function grade(q: Question, answer: string[]) {
    answered.current = true;
    const tonic = keyRef.current.tonic;
    const correct = answer.every((id, i) => id === q.correctIds[i]);
    recordAnswer(step.courseId, step.levelId, correct, correct ? creditItems(q) : blamedDegrees(q, answer));
    tally(step, correct);

    const heard = midisFor(q, tonic);
    const homeMidi = degreeToMidi(tonic, 0);

    if (correct) {
      const next = streak + 1;
      setStreak(next);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, next);
      setPhase('correct');

      if (q.kind === 'name-the-note') {
        playCorrect(tonic, heard[heard.length - 1], next, config.mode);
      } else if (q.kind === 'read-note') {
        // Hearing it is the reward, and it ties the symbol to a sound.
        playSequence(heard, 0, 1.0, 0.26);
      } else if (q.kind === 'interval-id') {
        playSequence(heard, q.simultaneous ? 0 : 0.4, 0.8, 0.24);
      } else if (q.kind === 'chord-quality' || q.kind === 'chord-inversion') {
        playSequence(heard, 0, 1.1, 0.22);
      } else if (q.chordSeq) {
        // Land on home, so the round has somewhere to rest.
        playSequence(q.chordSeq[q.chordSeq.length - 1], 0, 1.2, 0.2);
      } else {
        playCorrectSimple(tonic, q.kind === 'which-is-home' ? homeMidi : heard[0]);
      }
      later(advance, HOLD_CORRECT_MS);
      return;
    }

    setStreak(0);
    setPhase('wrong');
    for (const item of blamedDegrees(q, answer)) {
      score.current.misses.set(item, (score.current.misses.get(item) ?? 0) + 1);
    }

    let holdMs = HOLD_WRONG_MS;

    if (q.kind === 'name-the-note' && q.sequence.length > 1) {
      const mine = answer.map((id, i) => degreeToMidi(tonic, Number(id), q.octaveUp[i]));
      playSequence(mine, SEQUENCE_GAP, 0.6, 0.24);
      const secondAt = q.sequence.length * SEQUENCE_GAP * 1000 + 500;
      later(() => playSequence(heard, SEQUENCE_GAP, 0.6, 0.24), secondAt);
      holdMs = secondAt + q.sequence.length * SEQUENCE_GAP * 1000 + 900;
    } else if (q.kind === 'name-the-note') {
      playComparison(tonic, degreeToMidi(tonic, Number(answer[0]), q.octaveUp[0]), heard[0], config.mode);
    } else if (q.kind === 'which-is-home') {
      const pickedDeg = degreeForOption(q, answer[0]);
      playComparison(tonic, degreeToMidi(tonic, pickedDeg ?? 0), homeMidi, config.mode);
    } else if (q.kind === 'interval-id') {
      // Your interval from the same root, then the real one — the contrast
      // is what corrects it.
      const root = heard[0];
      const mineSize = Number(answer[0]);
      const down = heard[1] < heard[0];
      playSequence([root, down ? root - mineSize : root + mineSize], 0.45, 0.7, 0.24);
      later(() => playSequence(heard, q.simultaneous ? 0 : 0.45, 0.8, 0.24), 1500);
      holdMs = 3600;
    } else if (q.kind === 'read-note') {
      playSequence(heard, 0, 1.0, 0.26);
      holdMs = 2600;
    } else if (q.kind === 'chord-quality') {
      // Your chord from the same root, then the real one. Comparing two
      // qualities on one root is the only way the difference is obvious.
      const root = heard[0];
      playSequence(buildChord(root, answer[0] as ChordQuality), 0, 0.9, 0.22);
      later(() => playSequence(heard, 0, 1.1, 0.22), 1350);
      holdMs = 3200;
    } else if (q.chordSeq) {
      // Replay the whole progression, a little faster, now that you know
      // what it was — the sequence is the thing to re-hear, not one chord.
      q.chordSeq.forEach((chord, i) => later(() => playSequence(chord, 0, 0.75, 0.19), i * 800));
      holdMs = q.chordSeq.length * 800 + 1200;
    } else if (q.kind === 'chord-inversion') {
      playSequence(heard, 0.32, 0.85, 0.22); // broken, so the bass is audible
      later(() => playSequence(heard, 0, 1.1, 0.22), 1800);
      holdMs = 3400;
    } else {
      playAgainstHome(tonic, heard[0]);
    }

    later(advance, holdMs);
  }

  function handleSing(outcome: SingOutcome) {
    if (!question || answered.current) return;
    answered.current = true;
    const tonic = keyRef.current.tonic;
    const targetMidi = singTargetMidi(question, tonic);

    // Skipping is what you do when there's no microphone, so it must not
    // score as a miss — it comes out of the denominator instead.
    if (outcome === 'skipped') {
      score.current.skipped += 1;
      setPhase('wrong');
      later(advance, 900);
      return;
    }

    const hit = outcome === 'hit';
    recordAnswer(step.courseId, step.levelId, hit, creditItems(question));
    tally(step, hit);

    if (hit) {
      const next = streak + 1;
      setStreak(next);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, next);
      setPhase('correct');
      playCorrect(tonic, targetMidi, next, config.mode);
      later(advance, HOLD_CORRECT_MS);
      return;
    }

    setStreak(0);
    setPhase('wrong');
    for (const item of creditItems(question)) {
      score.current.misses.set(item, (score.current.misses.get(item) ?? 0) + 1);
    }
    playSequence([targetMidi], SEQUENCE_GAP, 1.1, 0.26);
    later(advance, 2200);
  }

  /**
   * A sung phrase is graded per note, but scored as one question: getting
   * four of five right is not a pass. Partial credit would let someone climb
   * the ladder while never once singing a whole line correctly.
   */
  function handlePhrase(outcome: PhraseOutcome) {
    if (!question || answered.current) return;
    answered.current = true;
    const tonic = keyRef.current.tonic;

    if (outcome.kind === 'skipped') {
      score.current.skipped += 1;
      setPhase('wrong');
      later(advance, 900);
      return;
    }

    const missed = outcome.slots
      .map((slot, i) => ({ slot, deg: question.sequence[i] }))
      .filter(({ slot }) => slot.state !== 'hit')
      .map(({ deg }) => deg);
    const allHit = missed.length === 0;

    recordAnswer(step.courseId, step.levelId, allHit, allHit ? question.sequence : missed);
    tally(step, allHit);
    setPhraseSlots(outcome.slots);

    if (allHit) {
      const next = streak + 1;
      setStreak(next);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, next);
      setPhase('correct');
      playCorrect(tonic, degreeToMidi(tonic, question.sequence[question.sequence.length - 1]), next, config.mode);
      later(advance, HOLD_CORRECT_MS + 400);
      return;
    }

    setStreak(0);
    setPhase('wrong');
    for (const deg of missed) {
      score.current.misses.set(deg, (score.current.misses.get(deg) ?? 0) + 1);
    }
    // Play the phrase back correctly. Hearing the line you were reaching for,
    // right after your attempt, is the correction.
    const gap = config.phraseGap ?? SEQUENCE_GAP;
    playSequence(midisFor(question, tonic), gap, Math.min(0.8, gap * 1.3), 0.26);
    later(advance, question.sequence.length * gap * 1000 + 1800);
  }

  /**
   * Grade a tapped rhythm.
   *
   * Passing means every note landed inside the tolerance and there were no
   * stray taps. A rhythm with an extra note in it is a different rhythm, so
   * "mostly right plus one extra" is not most of the way there.
   */
  function handleTaps(outcome: TapOutcome) {
    if (!question?.pattern || answered.current) return;
    answered.current = true;

    const msPerBeat = 60000 / (config.bpm ?? 80);
    const grade = gradeRhythm(
      outcome.taps,
      question.pattern,
      msPerBeat,
      config.tapTolerance ?? 120,
      tapOffsetMs,
    );
    setRhythmGrade(grade);
    // Carry the lag forward. A one-bar pattern may be too short to measure
    // its own, and the lag belongs to the device rather than to the bar.
    learnTapOffset(grade.measuredOffsetMs);

    const notes = soundingNotes(question.pattern);
    // Items are note values, keyed in sixteenths, so stats can say "eighth
    // notes are your weakest" rather than naming a position in one bar.
    const missedValues = grade.notes
      .filter((n) => n.state !== 'hit')
      .map((n) => Math.round(notes[n.index].duration * 4));
    const allValues = notes.map((n) => Math.round(n.duration * 4));

    const clean = grade.accuracy === 1 && grade.extraTaps === 0;
    recordAnswer(step.courseId, step.levelId, clean, clean ? allValues : missedValues);
    tally(step, clean);

    if (clean) {
      const next = streak + 1;
      setStreak(next);
      score.current.correct += 1;
      score.current.bestStreak = Math.max(score.current.bestStreak, next);
      setPhase('correct');
      playCorrectSimple(keyRef.current.tonic, degreeToMidi(keyRef.current.tonic, 0));
      later(advance, HOLD_CORRECT_MS + 500);
      return;
    }

    setStreak(0);
    setPhase('wrong');
    for (const value of missedValues) {
      score.current.misses.set(value, (score.current.misses.get(value) ?? 0) + 1);
    }
    // The staff itself shows what went where, so the hold just has to be long
    // enough to read it rather than long enough to hear something.
    later(advance, 4200);
  }

  function replayReference() {
    if (!question) return;
    const tonic = keyRef.current.tonic;
    if (question.sequence.length) {
      const gap = config.phraseGap ?? SEQUENCE_GAP;
      playSequence(midisFor(question, tonic), gap, Math.min(1.0, gap * 1.3), 0.26);
    } else {
      playKeyIntro(tonic, 'home', config.mode);
    }
  }

  function pick(optionId: string) {
    if (phase !== 'question' || answered.current || !question) return;
    const next = [...slots, optionId];
    setSlots(next);
    if (next.length >= slotCount(question)) grade(question, next);
  }

  function undo() {
    if (phase !== 'question' || answered.current) return;
    setSlots((s) => s.slice(0, -1));
  }

  function advance() {
    const next = index + 1;
    if (next >= plan.length) {
      const weakDegrees = [...score.current.misses.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([item]) => item);
      stopDrone();

      // Retention is updated once per level, on the level's own accuracy in
      // this round — not on the round as a whole, which for a warm-up would
      // smear five different skills into one number.
      for (const [key, entry] of perStep.current) {
        if (entry.total === 0) continue;
        const [courseId, levelId] = key.split(':');
        const median = entry.ms.length
          ? [...entry.ms].sort((a, b) => a - b)[entry.ms.length >> 1]
          : null;
        recordRetention(courseId, Number(levelId), entry.right / entry.total, median);
      }
      finishSession({
        // A warm-up spans courses, so it gets its own id; the individual
        // answers were already credited to their real courses above.
        courseId: warmup ? 'warmup' : course.id,
        levelId: warmup ? 0 : level,
        correct: score.current.correct,
        // The plan is the round — for a warm-up no single level's
        // roundLength describes it. Skipped questions leave the denominator,
        // so someone without a microphone isn't marked wrong for it.
        total: plan.length - score.current.skipped,
        bestStreak: score.current.bestStreak,
        weakDegrees,
        mix: warmup ? planBreakdown(plan) : undefined,
      });
      playSessionEnd(keyRef.current.tonic, config.mode);
      navigate('/summary', { replace: true });
      return;
    }
    setIndex(next);
    askQuestion(next);
  }

  function replay() {
    if (phase !== 'question' || !question || reading) return;
    setPhase('playing');
    playQuestion(
      question,
      keyRef.current.tonic,
      () => setPhase('question'),
      config.phraseGap ?? SEQUENCE_GAP,
    );
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question || isSingKind(question.kind)) return;
      if (e.key === ' ') {
        e.preventDefault();
        replay();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
        return;
      }
      const letter = question.options.find((o) => o.id.toLowerCase() === e.key.toLowerCase());
      if (letter) {
        pick(letter.id);
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      const option = question.options[n - 1];
      if (option) pick(option.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const revealed = phase === 'correct' || phase === 'wrong';
  const cols = question ? columnsFor(question) : 3;
  const totalSlots = question ? slotCount(question) : 1;
  const multiNote = (question?.sequence.length ?? 0) > 1;
  const multiSlot = totalSlots > 1;

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-4 py-2">
        <IconButton label="End round" onClick={() => navigate(warmup ? '/' : '/practice')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
        <div className="ml-auto">
          <Dots total={plan.length} index={index} />
        </div>
      </header>

      <div className="flex flex-wrap justify-center gap-2 pt-4">
        {warmup && (
          <span className="label rounded-full border border-line px-3 py-1.5 text-subtle">
            {course.name}
          </span>
        )}
        {inKey ? (
          <span className="label rounded-full border border-accent-dim bg-accent-wash px-3 py-1.5 text-accent">
            Key of {keyLabel(key, config.mode)}
          </span>
        ) : (
          <span className="label rounded-full border border-line px-3 py-1.5 text-subtle">
            {warmup ? config.name : `${course.name} · ${config.name}`}
          </span>
        )}
        {config.drone && (
          <span className="label rounded-full border border-cool/40 px-3 py-1.5 text-cool">
            Drone on
          </span>
        )}
        {config.kind === 'interval-id' && (
          <span className="label rounded-full border border-cool/40 px-3 py-1.5 text-cool">
            {directionLabel(config.intervalDirection ?? 'up')}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 py-4 text-center">
        {singing && question && phase === 'question' ? (
          <div className="w-full">
            {phrase ? (
              <PhrasePanel
                key={index}
                targets={midisFor(question, keyRef.current.tonic)}
                labels={question.sequence.map((d) => degreeLabel(d, config.mode))}
                toleranceCents={config.singTolerance}
                holdMs={config.phraseHoldMs ?? 260}
                onOutcome={handlePhrase}
                onReplay={replay}
              />
            ) : (
              <SingPanel
                key={`${index}-${question.target}`}
                targetMidi={singTargetMidi(question, keyRef.current.tonic)}
                targetLabel={question.answerLabel}
                tolerance={config.singTolerance}
                onOutcome={handleSing}
                onReplayReference={replayReference}
              />
            )}
            {/* Only worth saying once, and only to someone it would help. */}
            {!isUsable(vocalRange) && (
              <p className="mt-3 text-center text-[13px] leading-snug text-subtle">
                Prompts are playing around middle C.{' '}
                <button
                  onClick={() => navigate('/voice/range')}
                  className="underline underline-offset-2 transition hover:text-ink"
                >
                  Find your range
                </button>{' '}
                and they'll fit your voice instead.
              </p>
            )}
          </div>
        ) : tapping && question?.pattern ? (
          <div className="w-full">
            {revealed ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-surface px-2 py-4">
                  <RhythmStaff pattern={question.pattern} results={rhythmGrade?.notes} />
                </div>
                {rhythmGrade && <RhythmReport grade={rhythmGrade} />}
              </div>
            ) : (
              <TapPanel
                key={index}
                pattern={question.pattern}
                bpm={config.bpm ?? 80}
                countIn={config.countIn ?? 4}
                clickThrough={config.clickThrough ?? true}
                onOutcome={handleTaps}
              />
            )}
          </div>
        ) : reading && question?.staff ? (
          <div className="w-full rounded-2xl border border-line bg-surface px-2 py-3">
            <Staff
              index={question.staff.index}
              clef={question.staff.clef}
              tone={phase === 'correct' ? 'correct' : phase === 'wrong' ? 'wrong' : 'neutral'}
            />
          </div>
        ) : progression && question?.chordSeq ? (
          <ProgressionRow
            count={question.chordSeq.length}
            playing={playingIndex}
            picked={slots}
            correctIds={question.correctIds}
            revealed={revealed}
            homeLabel={config.mode === 'minor' ? 'i' : 'I'}
          />
        ) : phrase && question ? (
          // Never orbs for a phrase: numbered positions sitting above the
          // answer chips read as note names, which is exactly the wrong
          // thing on a screen about note names. Show the notes themselves,
          // lighting up as they play — and nothing at all once answered,
          // because the chips below already say what happened.
          revealed ? null : (
            <PhraseRow
              labels={question.sequence.map((d) => degreeLabel(d, config.mode))}
              playing={playingIndex}
            />
          )
        ) : multiNote ? (
          <SequenceOrbs
            count={question?.sequence.length ?? 3}
            playing={playingIndex}
            highlightAnswer={question?.kind === 'which-is-home' && revealed}
            answerIndex={question?.kind === 'which-is-home' ? Number(question.correctIds[0]) : -1}
            pickedIndex={question?.kind === 'which-is-home' && slots.length ? Number(slots[0]) : -1}
          />
        ) : (
          <button
            onClick={replay}
            aria-label="Play again"
            className={`grid size-32 place-items-center rounded-full border bg-surface transition ${
              phase === 'correct'
                ? 'anim-pulse border-correct'
                : phase === 'wrong'
                  ? 'anim-shake border-wrong'
                  : phase === 'playing'
                    ? 'anim-ring border-accent-dim'
                    : phase === 'intro'
                      ? 'anim-ring border-line'
                      : 'border-line-strong'
            }`}
          >
            <span
              className={`text-[34px] leading-none ${phase === 'intro' ? 'text-subtle' : 'text-accent'}`}
              aria-hidden="true"
            >
              {phase === 'intro' ? '♩' : '♪'}
            </span>
          </button>
        )}

        {!(singing && phase === 'question') && (
          <p className="max-w-[30ch] text-[15px] text-muted">
            {phase === 'intro'
              ? 'Settling into the key…'
              : phase === 'playing'
                ? // There is nothing to hear in a written rhythm; the pattern
                  // is already on screen and the count-in does the waiting.
                  tapping
                  ? ''
                  : 'Listen…'
                : phase === 'question'
                  ? promptFor(question, slots.length, totalSlots)
                  : ''}
          </p>
        )}

        <div className="flex min-h-[66px] max-w-[32ch] flex-col items-center justify-center gap-1.5">
          {revealed && question && !tapping && (
            <>
              {/* For a phrase, which notes landed matters more than the
                  pass/fail — "you got four of five, the third was flat" is
                  the useful sentence. */}
              {phraseSlots ? (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {phraseSlots.map((slot, i) => (
                    <span
                      key={i}
                      className={`tnum rounded-lg border px-2.5 py-1 text-[15px] font-bold ${
                        slot.state === 'hit'
                          ? 'border-correct bg-correct-wash text-correct'
                          : 'border-wrong bg-wrong-wash text-wrong'
                      }`}
                      title={
                        slot.cents === null
                          ? 'not sung'
                          : `${slot.cents > 0 ? '+' : ''}${Math.round(slot.cents)} cents`
                      }
                    >
                      {degreeLabel(question.sequence[i], config.mode)}
                    </span>
                  ))}
                </div>
              ) : null}
              <p
                className={`text-xl font-bold tracking-tight ${
                  phase === 'correct' ? 'text-correct' : 'text-wrong'
                }`}
              >
                {phraseSlots ? phraseVerdict(phraseSlots) : question.answerLabel}
              </p>
              <p className="text-[13px] leading-snug text-subtle">{question.explain}</p>
            </>
          )}
        </div>
      </div>

      {multiSlot && question && !progression && (
        <SlotRow
          total={totalSlots}
          picked={slots}
          correctIds={question.correctIds}
          options={question.options}
          revealed={revealed}
          onUndo={undo}
        />
      )}

      {!singing && !tapping && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {question?.options.map((option) => {
            const tone =
              revealed && !multiSlot
                ? option.id === question.correctIds[0]
                  ? 'border-correct bg-correct-wash text-correct'
                  : option.id === slots[0]
                    ? 'border-wrong bg-wrong-wash text-wrong'
                    : 'border-line bg-surface text-subtle'
                : revealed
                  ? 'border-line bg-surface text-subtle'
                  : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2';

            return (
              <button
                key={option.id}
                disabled={phase !== 'question'}
                onPointerDown={() => {
                  const deg = degreeForOption(question, option.id);
                  if (phase === 'question' && deg !== null && question.kind === 'name-the-note') {
                    playTapTick(degreeToMidi(keyRef.current.tonic, deg));
                  }
                }}
                onClick={() => pick(option.id)}
                className={`grid gap-0.5 rounded-xl border px-1 py-3.5 transition active:scale-[0.97] disabled:active:scale-100 ${tone} ${
                  phase === 'intro' || phase === 'playing' ? 'opacity-45' : ''
                }`}
              >
                <span className="tnum text-[17px] leading-tight font-bold tracking-tight">
                  {question.kind === 'name-the-note' && labelStyle === 'solfege'
                    ? (option.secondary ?? option.primary)
                    : option.primary}
                </span>
                {option.secondary && (
                  <span className="text-[10px] leading-tight opacity-65">
                    {question.kind === 'name-the-note' && labelStyle === 'solfege'
                      ? option.primary
                      : option.secondary}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-3 pb-1 text-[13px]">
        <button
          onClick={replay}
          disabled={phase !== 'question' || singing || reading || tapping}
          className={`py-2 text-subtle transition hover:text-ink disabled:opacity-40 ${
            singing || reading || tapping ? 'invisible' : ''
          }`}
        >
          Play again
        </button>
        <span className="tnum text-accent">{streak >= 2 ? `${streak} in a row` : ''}</span>
        <button onClick={() => setHelpOpen(true)} className="py-2 text-subtle transition hover:text-ink">
          What's this?
        </button>
      </div>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="What's this?">
        <HelpBody kind={config.kind} droning={config.drone} minor={config.mode === 'minor'} />
        <p className="text-subtle">
          {course.name} · level {config.id} — {config.name}
          {inKey && !config.drone && (
            <>
              {' '}
              — <span className="text-ink">{INTRO_LABEL[introMode]}</span>, {INTRO_HELP[introMode]}
            </>
          )}
        </p>
      </Sheet>
    </Screen>
  );
}

function HelpBody({
  kind,
  droning,
  minor,
}: {
  kind: string;
  droning: boolean;
  minor: boolean;
}) {
  if (kind === 'interval-id') {
    return (
      <>
        <p>
          Two notes, and you name the gap between them. There's no key here — an interval is just a
          distance, the same one wherever it lands.
        </p>
        <p>
          Listen for <strong className="text-ink">width</strong> first, then colour. Is it a step, a
          reach, or a leap? Only then ask whether it sounds bright or shaded.
        </p>
      </>
    );
  }
  if (kind === 'progression-id') {
    return (
      <>
        <p>
          Every progression here starts on <strong className="text-ink">home</strong> — you're never
          asked to guess that one. Working out the key is a different skill, and asking for both at
          once would muddle them.
        </p>
        <p>
          Listen to where each chord sits <em>relative to home</em>. <strong className="text-ink">IV</strong>{' '}
          lifts and brightens. <strong className="text-ink">V</strong> pulls hard and wants to
          resolve. <strong className="text-ink">vi</strong> is the sad one — a minor chord inside a
          major key.
        </p>
        <p className="text-subtle">
          This is the skill that lets you play along with something you've never heard.
        </p>
      </>
    );
  }
  if (kind === 'chord-quality') {
    return (
      <>
        <p>
          Several notes at once. Don't try to pick them apart — listen to the{' '}
          <strong className="text-ink">colour</strong> of the whole thing.
        </p>
        <p>
          Bright and settled is major. Shaded is minor. Squeezed and anxious is diminished.
          Stretched with no obvious bottom is augmented. A seventh adds a note that rubs.
        </p>
        <p className="text-subtle">
          The root, register and voicing change every question on purpose — otherwise you learn one
          sound rather than the quality itself.
        </p>
      </>
    );
  }
  if (kind === 'chord-inversion') {
    return (
      <>
        <p>
          Same chords, but now the question is which note is at the{' '}
          <strong className="text-ink">bottom</strong>.
        </p>
        <p>
          Ignore the top of the chord and follow the lowest note. Root position sounds solid and
          finished; first inversion sounds lighter and leaning; second inversion sounds unsettled,
          like it is about to move.
        </p>
      </>
    );
  }
  if (kind === 'read-note') {
    return (
      <>
        <p>
          Don't count up from the bottom line. Find the nearest{' '}
          <strong className="text-ink">landmark</strong> you already know and read one or two steps
          from it.
        </p>
        <p>
          In the treble clef the curl of the clef wraps around <strong className="text-ink">G</strong>.
          In the bass clef the two dots sit either side of <strong className="text-ink">F</strong>.
          Middle C is one ledger line below the treble stave, and one above the bass.
        </p>
        <p className="text-subtle">Answer with the letter keys if you're on a keyboard.</p>
      </>
    );
  }
  if (droning) {
    return (
      <>
        <p>
          That steady tone underneath is <strong className="text-ink">home</strong>. It never
          changes, so you don't have to remember anything — you just compare.
        </p>
        <p>
          A note that <em>is</em> home blends into the drone and almost disappears. Every other note
          sits against it and creates a little friction.
        </p>
      </>
    );
  }
  if (kind === 'tap-rhythm') {
    return (
      <>
        <p>
          A bar of clicks counts you in, then you tap the rhythm on the page. Space bar works too.
        </p>
        <p>
          <strong className="text-ink">Rests are counted, not waited out.</strong> Keep the pulse
          running underneath and the silence takes care of itself — trying to feel the gap as a gap
          is what makes rests hard.
        </p>
        <p className="text-subtle">
          A constant lag between your tap and the app is measured and removed before anything is
          judged, so there is nothing to calibrate. You are graded on the spacing between your
          taps, and told separately if you were leaning early or late.
        </p>
      </>
    );
  }
  if (kind === 'sing-phrase') {
    return (
      <>
        <p>
          The phrase plays, then stops. Sing the whole thing back as{' '}
          <strong className="text-ink">one line</strong> — the boxes fill as you go.
        </p>
        <p>
          They fill with whatever you actually sang, right or wrong, so you are never stuck part
          way through. A note counts once you hold it for a moment; sliding past it doesn't.
        </p>
        <p className="text-subtle">
          Any octave counts. Getting most of them right still scores the question as missed — the
          skill is the whole line, not the notes in isolation.
        </p>
      </>
    );
  }
  if (kind === 'sing-home' || kind === 'sing-back' || kind === 'sing-degree') {
    return (
      <>
        <p>
          Nothing plays while you sing — the reference stops first, so you're producing the note
          from memory rather than matching one that's still ringing.
        </p>
        <p>
          <strong className="text-ink">Any octave counts.</strong> Sing it wherever it sits
          comfortably; the app only cares that it's the right note.
        </p>
        <p className="text-subtle">Headphones help. Hold it steady for about a second to pass.</p>
      </>
    );
  }
  return (
    <>
      <p>
        The chords at the start plant <strong className="text-ink">home</strong> in your ear. Then
        the question plays, and you hold home in your head rather than hear it.
      </p>
      <p>
        Don't count intervals. Ask instead: has this note arrived, or does it want to move? That
        instinct is the whole skill.
      </p>
      {minor && (
        <p>
          This key is <strong className="text-ink">minor</strong> — the third, sixth and seventh all
          sit a semitone lower, which is what makes it sound darker.
        </p>
      )}
    </>
  );
}

/**
 * What happened, in the order that helps: how many landed, then the constant
 * lag if there was one, then stray taps.
 */
function RhythmReport({ grade }: { grade: RhythmGrade }) {
  const hits = grade.notes.filter((n) => n.state === 'hit').length;
  const note = offsetNote(grade.offsetMs);

  return (
    <div className="space-y-2 text-center">
      <p
        className={`text-xl font-bold tracking-tight ${
          hits === grade.notes.length && grade.extraTaps === 0 ? 'text-correct' : 'text-wrong'
        }`}
      >
        {hits} of {grade.notes.length} in time
        {grade.extraTaps > 0 &&
          ` · ${grade.extraTaps} extra ${grade.extraTaps === 1 ? 'tap' : 'taps'}`}
      </p>
      {note && <p className="mx-auto max-w-[34ch] text-[13px] leading-snug text-subtle">{note}</p>}
    </div>
  );
}

/** A phrase verdict that says what actually happened, not just pass/fail. */
function phraseVerdict(slots: PhraseSlot[]): string {
  const hits = slots.filter((s) => s.state === 'hit').length;
  if (hits === slots.length) return 'All of it';
  if (hits === 0) return 'Not this time';

  const missed = slots.filter((s) => s.state !== 'hit');
  // If every miss leant the same way, that's a habit worth naming.
  const sung = missed.filter((s) => s.cents !== null);
  if (sung.length === missed.length && sung.every((s) => s.cents! > 0)) {
    return `${hits} of ${slots.length} — the rest sharp`;
  }
  if (sung.length === missed.length && sung.every((s) => s.cents! < 0)) {
    return `${hits} of ${slots.length} — the rest flat`;
  }
  return `${hits} of ${slots.length}`;
}

function promptFor(q: Question | null, filled: number, total: number): string {
  switch (q?.kind) {
    case 'sing-home':
      return 'Now sing home.';
    case 'sing-back':
      return 'Sing that note back.';
    case 'sing-degree':
      return 'Find it and sing it.';
    case 'sing-phrase':
      return 'Sing the whole line back.';
    case 'tap-rhythm':
      return '';
    case 'home-or-not':
      return 'Was that home?';
    case 'rest-or-move':
      return 'Settled, or restless?';
    case 'which-is-home':
      return 'Which one was home?';
    case 'interval-id':
      return 'How far apart were they?';
    case 'read-note':
      return 'What note is this?';
    case 'chord-quality':
      return 'What kind of chord?';
    case 'chord-inversion':
      return "Which note is at the bottom?";
    case 'progression-id':
      return total > 1 ? `Name chord ${filled + 2}` : 'What was the second chord?';
    default:
      return total > 1 ? `Name note ${filled + 1} of ${total}` : 'Which note was that?';
  }
}

function SlotRow({
  total,
  picked,
  correctIds,
  options,
  revealed,
  onUndo,
}: {
  total: number;
  picked: string[];
  correctIds: string[];
  options: { id: string; primary: string }[];
  revealed: boolean;
  onUndo: () => void;
}) {
  const labelOf = (id: string) => options.find((o) => o.id === id)?.primary ?? id;

  return (
    <div className="mb-3 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const value = picked[i];
        const right = revealed && value === correctIds[i];
        const wrong = revealed && value !== undefined && value !== correctIds[i];
        return (
          <div
            key={i}
            className={`tnum grid h-11 min-w-[52px] place-items-center rounded-xl border px-2 text-[15px] font-bold ${
              right
                ? 'border-correct bg-correct-wash text-correct'
                : wrong
                  ? 'border-wrong bg-wrong-wash text-wrong'
                  : value
                    ? 'border-accent-dim bg-accent-wash text-accent'
                    : 'border-line border-dashed text-subtle'
            }`}
          >
            {value ? labelOf(value) : '·'}
          </div>
        );
      })}
      {!revealed && picked.length > 0 && (
        <button
          onClick={onUndo}
          aria-label="Undo last note"
          className="ml-1 grid size-11 place-items-center rounded-xl border border-line text-subtle transition hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path
              d="M6 3L2.5 6.5 6 10M2.5 6.5h6a4 4 0 010 8H6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/** The chords of a progression, with the given opening chord marked. */
function ProgressionRow({
  count,
  playing,
  picked,
  correctIds,
  revealed,
  homeLabel,
}: {
  count: number;
  playing: number;
  picked: string[];
  correctIds: string[];
  revealed: boolean;
  homeLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {Array.from({ length: count }, (_, i) => {
        const active = playing === i;
        if (i === 0) {
          return (
            <div
              key={i}
              className={`grid h-[62px] min-w-[62px] place-items-center rounded-2xl border px-2 transition ${
                active ? 'border-accent bg-accent-wash text-accent' : 'border-line text-subtle'
              }`}
            >
              <span className="text-lg font-bold">{homeLabel}</span>
              <span className="label text-[8px]">given</span>
            </div>
          );
        }

        const answer = picked[i - 1];
        const right = revealed && answer === correctIds[i - 1];
        const wrong = revealed && answer !== undefined && answer !== correctIds[i - 1];

        // Once revealed the box always shows the *right* chord, in the
        // right colour. Tinting the correct answer red because you missed
        // it reads as "vi is wrong", which is the opposite of the lesson;
        // your pick goes underneath instead.
        const tone = revealed
          ? right
            ? 'border-correct bg-correct-wash text-correct'
            : 'border-correct/60 text-correct'
          : active
            ? 'border-accent bg-accent-wash text-accent'
            : answer
              ? 'border-accent-dim text-accent'
              : 'border-line border-dashed text-subtle';

        return (
          <div
            key={i}
            className={`grid h-[62px] min-w-[62px] place-items-center rounded-2xl border px-2 transition ${tone} ${
              active ? 'scale-105' : ''
            }`}
          >
            <span className="text-lg font-bold">
              {revealed ? correctIds[i - 1] : (answer ?? '?')}
            </span>
            {wrong && <span className="label text-[8px] text-wrong">you said {answer}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** The notes of a phrase, lighting up one at a time as it plays. */
function PhraseRow({ labels, playing }: { labels: string[]; playing: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {labels.map((label, i) => {
        const active = playing === i;
        return (
          <div
            key={i}
            className={`grid h-[58px] min-w-[54px] place-items-center rounded-2xl border bg-surface px-2 transition ${
              active ? 'scale-105 border-accent text-accent' : 'border-line text-subtle'
            }`}
          >
            <span className="tnum text-lg font-bold">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function SequenceOrbs({
  count,
  playing,
  highlightAnswer,
  answerIndex,
  pickedIndex,
}: {
  count: number;
  playing: number;
  highlightAnswer: boolean;
  answerIndex: number;
  pickedIndex: number;
}) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: count }, (_, i) => {
        const active = playing === i;
        const tone = highlightAnswer
          ? i === answerIndex
            ? 'border-correct text-correct'
            : i === pickedIndex
              ? 'border-wrong text-wrong'
              : 'border-line text-subtle'
          : active
            ? 'border-accent text-accent'
            : 'border-line text-subtle';
        return (
          <div
            key={i}
            className={`grid size-[64px] place-items-center rounded-2xl border bg-surface transition ${tone} ${
              active ? 'scale-105' : ''
            }`}
          >
            <span className="tnum text-lg font-bold">{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}
