import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button, Card, Label, Screen } from '@/components/ui';
import { STAGE_LABEL, findLevel } from '@/core/levels';
import { getCourse, statKey, COURSES } from '@/core/courses';
import { INTERVAL_LONG } from '@/core/intervals';
import { CHORD_LONG, CHORD_ORDER, INVERSION_LABEL } from '@/core/chords';
import { ROMAN, ROMAN_ORDER } from '@/core/progressions';
import { indexToName } from '@/core/reading';
import { degreeLabel, degreeNickname, degreeSolfege, type Deg, type Mode } from '@/core/music';
import {
  degreeReport,
  useStore,
  weakestDegree,
  type DegreeStat,
  type SessionResult,
} from '@/store/useStore';
import { playLevelUp } from '@/audio/engine';
import { sessionAdvice } from '@/core/voiceHealth';

/** Rhythm stats are keyed by note value in sixteenths. */
const NOTE_VALUE_NAME: Record<number, string> = {
  1: 'sixteenth notes',
  2: 'eighth notes',
  4: 'quarter notes',
  8: 'half notes',
  16: 'whole notes',
};

export default function Summary() {
  const navigate = useNavigate();
  const session = useStore((s) => s.lastSession);
  const setLevel = useStore((s) => s.setLevel);
  const streakDays = useStore((s) => s.streakDays);
  const sungMsToday = useStore((s) => s.sungMsToday);
  const sungDay = useStore((s) => s.sungDay);
  const allDegreeStats = useStore((s) => s.degreeStats);
  const [promoted, setPromoted] = useState(false);

  const isWarmup = session?.courseId === 'warmup';
  // Yesterday's singing has no bearing on today's voice.
  const today = new Date();
  const dayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const advice = sessionAdvice(sungDay === dayId ? sungMsToday : 0);
  const course = getCourse(session?.courseId ?? '') ?? COURSES[0];
  const level = session?.levelId ?? 1;
  const canLevelUp = !isWarmup && session?.promoted && level < course.levels.length && !promoted;

  useEffect(() => {
    if (!session?.promoted) return;
    const t = window.setTimeout(() => playLevelUp(60), 900);
    return () => clearTimeout(t);
  }, [session?.promoted]);

  if (!session) return <Navigate to="/" replace />;

  const config = findLevel(course.levels, isWarmup ? 1 : session.levelId);
  const degreeStats = isWarmup
    ? undefined
    : allDegreeStats[statKey(session.courseId, session.levelId)];
  // A round where every question was skipped has nothing to average.
  const answered = session.total > 0;
  const pct = answered ? Math.round((session.correct / session.total) * 100) : 0;

  function levelUp() {
    setLevel(course.id, level + 1);
    setPromoted(true);
  }

  return (
    <Screen className="pad-top pad-bottom">
      <div className="anim-rise flex flex-1 flex-col justify-center gap-6 py-8">
        <div className="text-center">
          <Label className="text-accent">Round complete</Label>
          <p className="tnum mt-4 text-[64px] leading-none font-bold tracking-[-0.05em]">
            {session.correct}
            <span className="text-subtle">/{session.total}</span>
          </p>
          <p className="mt-3 text-[15px] text-muted">
            {!answered
              ? 'Nothing answered this round'
              : isWarmup
                ? `Daily Warm-Up · ${pct}%`
                : `${course.name} · ${config.name} · ${pct}% this round`}
          </p>
        </div>

        <Card tone="cool">
          <Label className="text-cool">One thing worth knowing</Label>
          <p className="mt-2.5 text-[15px] leading-relaxed">
            {isWarmup
              ? warmupObservation(session)
              : observation(session, degreeStats, config.mode, config.kind)}
          </p>
        </Card>

        {isWarmup && session.mix && session.mix.length > 0 && (
          <div>
            <Label>What you covered</Label>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {session.mix.map(({ courseId, count }) => (
                <span
                  key={courseId}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-muted"
                >
                  {getCourse(courseId)?.name ?? courseId}
                  <span className="tnum ml-1.5 text-subtle">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {!isWarmup && config.kind === 'name-the-note' && (
          <NoteAccuracy degrees={config.degrees} stats={degreeStats} mode={config.mode} />
        )}

        {canLevelUp && (
          <Card tone="accent">
            <Label className="text-accent">You're ready</Label>
            <p className="mt-2.5 text-[15px] leading-relaxed">
              You've been holding 85%+ at this level. {whatsNext(course.levels, level)}
            </p>
            <Button className="mt-4" onClick={levelUp}>
              Move to level {level + 1}
            </Button>
          </Card>
        )}

        {promoted && (
          <Card tone="accent">
            <p className="text-[15px] leading-relaxed">
              You're on level {level} now — {findLevel(course.levels, level).blurb.toLowerCase()}
            </p>
          </Card>
        )}
      </div>

      {/* Vocal health lives here rather than mid-round: interrupting someone
          between two questions is the worst possible moment, and the end of a
          round is when they are deciding whether to do another. */}
      {session.sang && (
        <div className="space-y-3 pb-2">
          {advice && (
            <Card tone={advice.level === 'stop' ? 'accent' : 'cool'}>
              <Label className={advice.level === 'stop' ? 'text-accent' : 'text-cool'}>
                {advice.level === 'stop' ? 'Time to stop' : 'Your voice'}
              </Label>
              <p className="mt-2.5 text-[15px] leading-relaxed">{advice.message}</p>
            </Card>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate('/voice/cooldown', { replace: true })}
          >
            Cool down{advice?.level === 'stop' ? ' and finish' : ''}
          </Button>
        </div>
      )}

      <div className="space-y-3 pb-2">
        <Button
          onClick={() =>
            navigate(isWarmup ? '/warmup' : `/practice/${course.id}`, { replace: true })
          }
        >
          {isWarmup ? 'Another warm-up' : 'Another round'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/', { replace: true })}>
          Done for now
        </Button>
        {streakDays > 0 && (
          <p className="pt-1 text-center text-sm text-subtle">
            {streakDays} {streakDays === 1 ? 'day' : 'days'} in a row
          </p>
        )}
      </div>
    </Screen>
  );
}

/**
 * A warm-up spans courses, so per-item stats would be comparing apples to
 * oranges. What is worth saying instead is that the mixing itself is the
 * point — people reliably assume a mixed session went badly *because* it
 * felt harder than grinding one thing.
 */
function warmupObservation(s: SessionResult): string {
  if (s.correct === s.total) {
    return 'Every one, across several different skills. Mixed practice is much harder than grinding one course — that is a real result.';
  }
  if (s.correct / s.total >= 0.7) {
    return 'A mixed session always feels worse than practising one thing at a time. It is also what actually sticks, so this score is worth more than the same score in a single course.';
  }
  return 'Switching between skills is genuinely harder than staying in one. That difficulty is the point — it is what makes the practice transfer.';
}

/**
 * One specific, earned observation — never a wall of stats. Cross-round
 * history beats this round's noise whenever there's enough of it: ten
 * questions is far too few to say anything reliable on its own.
 */
function observation(
  s: SessionResult,
  stats: Record<number, DegreeStat> | undefined,
  mode: Mode,
  kind: string,
): string {
  /** Items mean different things in different courses. */
  const name = (item: number) => {
    switch (kind) {
      case 'interval-id':
        return INTERVAL_LONG[item];
      case 'read-note':
        return indexToName(item);
      case 'chord-quality':
        return CHORD_LONG[CHORD_ORDER[item]] ?? 'that chord';
      case 'chord-inversion':
        return `${INVERSION_LABEL[item]} position`;
      case 'progression-id':
        return ROMAN_ORDER[item] ?? 'that chord';
      // Rhythm items are note values keyed in sixteenths.
      case 'tap-rhythm':
        return NOTE_VALUE_NAME[item] ?? 'that note value';
      default:
        return `${degreeLabel(item, mode)} · ${degreeSolfege(item)}`;
    }
  };
  const nickname = (item: number) => {
    if (kind === 'progression-id') {
      const roman = ROMAN_ORDER[item];
      return roman ? ` — ${ROMAN[roman].role}` : '';
    }
    if (
      kind === 'interval-id' ||
      kind === 'read-note' ||
      kind === 'chord-quality' ||
      kind === 'chord-inversion' ||
      kind === 'tap-rhythm'
    ) {
      return '';
    }
    return ` — ${degreeNickname(item, mode)}`;
  };

  const weakest = weakestDegree(stats, 5);

  if (weakest && weakest.accuracy < 0.75) {
    const rate = Math.round(weakest.accuracy * 100);
    if (weakest.trend === 'improving') {
      return `${name(weakest.deg)} is still your weakest at ${rate}% across ${weakest.attempts} tries — but it's climbing. Keep going.`;
    }
    return `Across every round at this level, ${name(weakest.deg)} is your weakest at ${rate}%${nickname(weakest.deg)}. It'll come up more often now.`;
  }

  const climbing = improvingDegree(stats);
  if (climbing !== null) {
    const report = degreeReport(stats, climbing);
    return `${name(climbing)} has come good — ${Math.round((report?.accuracy ?? 0) * 100)}% now, and clearly better than it was.`;
  }

  if (s.correct === s.total) {
    return 'Clean round — every one. Do that consistently and the next level opens up.';
  }

  const worst = s.weakDegrees[0];
  if (worst !== undefined) {
    return `${name(worst)} caught you out most this round${nickname(worst)}.`;
  }

  if (s.bestStreak >= 5) {
    return `A run of ${s.bestStreak} in the middle there. The ear is starting to hold the key on its own.`;
  }

  return 'Nothing stood out this round. Consistency at this level is exactly what earns the next one.';
}

function improvingDegree(stats: Record<number, DegreeStat> | undefined): Deg | null {
  if (!stats) return null;
  for (const [key, d] of Object.entries(stats)) {
    const report = degreeReport(stats, Number(key));
    if (report?.trend === 'improving' && d.right + d.wrong >= 8) return Number(key);
  }
  return null;
}

/**
 * A quiet per-note strip rather than a table: tinted chips you can scan in
 * a second, so "which notes am I bad at" is answerable without reading.
 */
function NoteAccuracy({
  degrees,
  stats,
  mode,
}: {
  degrees: Deg[];
  stats: Record<number, DegreeStat> | undefined;
  mode: Mode;
}) {
  if (!stats) return null;
  const seen = degrees.filter((d) => {
    const s = stats[d];
    return s && s.right + s.wrong >= 3;
  });
  if (seen.length < 3) return null;

  return (
    <div>
      <Label>Your notes, all rounds</Label>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {degrees.map((deg) => {
          const s = stats[deg];
          const attempts = s ? s.right + s.wrong : 0;
          const acc = attempts >= 3 ? s!.right / attempts : null;
          const tone =
            acc === null
              ? 'border-line text-subtle'
              : acc >= 0.85
                ? 'border-correct/50 text-correct'
                : acc >= 0.65
                  ? 'border-accent-dim text-accent'
                  : 'border-wrong/60 text-wrong';
          return (
            <div
              key={deg}
              className={`flex min-w-[52px] flex-col items-center rounded-lg border px-2 py-1.5 ${tone}`}
              title={`${degreeLabel(deg, mode)} — ${attempts} tries`}
            >
              <span className="tnum text-[13px] font-bold">{degreeLabel(deg, mode)}</span>
              <span className="tnum text-[10px] opacity-75">
                {acc === null ? '—' : `${Math.round(acc * 100)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** What level+1 actually changes, said plainly. */
function whatsNext(levels: Parameters<typeof findLevel>[0], level: number): string {
  const current = findLevel(levels, level);
  const next = findLevel(levels, level + 1);

  if (current.stage !== next.stage) {
    return `Next comes ${STAGE_LABEL[next.stage].toLowerCase()} — ${next.blurb.toLowerCase()}`;
  }
  if (current.drone && !next.drone) {
    return 'Next, the drone comes off and you hold home in your head instead.';
  }
  if (current.kind !== next.kind) {
    return `Level ${next.id} changes the question: ${next.blurb.toLowerCase()}`;
  }
  if (next.sequenceLength > current.sequenceLength) {
    return `Level ${next.id} plays ${next.sequenceLength} notes in a row, and you name all of them.`;
  }
  if (next.mode !== current.mode) {
    return `Level ${next.id} moves to minor keys, where three of the seven notes sit lower.`;
  }

  const added = next.degrees.filter((d) => !current.degrees.includes(d));
  if (added.length) {
    return `Level ${next.id} adds ${added.map((d) => `${degreeLabel(d, next.mode)} · ${degreeSolfege(d)}`).join(' and ')}.`;
  }
  if (next.keyPerQuestion && !current.keyPerQuestion) {
    return `Level ${next.id} changes key on every question. Nothing to settle into.`;
  }
  if (next.twoOctaves && !current.twoOctaves) {
    return `Level ${next.id} widens the range to two octaves.`;
  }
  return `Level ${next.id} gives you a shorter introduction to the key.`;
}
