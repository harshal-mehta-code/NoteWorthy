import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button, Card, Label, Screen } from '@/components/ui';
import { LEVELS, STAGE_LABEL, getLevel } from '@/core/levels';
import { SOLFEGE, STEP_NICKNAME } from '@/core/music';
import { useStore } from '@/store/useStore';
import { playLevelUp } from '@/audio/engine';

export default function Summary() {
  const navigate = useNavigate();
  const session = useStore((s) => s.lastSession);
  const level = useStore((s) => s.level);
  const setLevel = useStore((s) => s.setLevel);
  const streakDays = useStore((s) => s.streakDays);
  const [promoted, setPromoted] = useState(false);

  const canLevelUp = session?.promoted && level < LEVELS.length && !promoted;

  useEffect(() => {
    if (!session?.promoted) return;
    const t = window.setTimeout(() => playLevelUp(60), 900);
    return () => clearTimeout(t);
  }, [session?.promoted]);

  if (!session) return <Navigate to="/" replace />;

  const pct = Math.round((session.correct / session.total) * 100);

  function levelUp() {
    setLevel(level + 1);
    setPromoted(true);
  }

  return (
    <Screen className="pad-top pad-bottom">
      <div className="anim-rise flex flex-1 flex-col justify-center gap-7 py-10">
        <div className="text-center">
          <Label className="text-accent">Round complete</Label>
          <p className="tnum mt-4 text-[64px] leading-none font-bold tracking-[-0.05em]">
            {session.correct}
            <span className="text-subtle">/{session.total}</span>
          </p>
          <p className="mt-3 text-[15px] text-muted">
            {getLevel(session.levelId).name} · {pct}% this round
          </p>
        </div>

        <Card tone="cool">
          <Label className="text-cool">One thing worth knowing</Label>
          <p className="mt-2.5 text-[15px] leading-relaxed">{observation(session)}</p>
        </Card>

        {canLevelUp && (
          <Card tone="accent">
            <Label className="text-accent">You're ready</Label>
            <p className="mt-2.5 text-[15px] leading-relaxed">
              You've been holding 85%+ at this level. {whatsNext(level)}
            </p>
            <Button className="mt-4" onClick={levelUp}>
              Move to level {level + 1}
            </Button>
          </Card>
        )}

        {promoted && (
          <Card tone="accent">
            <p className="text-[15px] leading-relaxed">
              You're on level {level} now — {getLevel(level).blurb.toLowerCase()}
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-3 pb-2">
        <Button onClick={() => navigate('/practice', { replace: true })}>Another round</Button>
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
 * One specific, earned observation — never a wall of stats. Specific beats
 * comprehensive (docs/03-GAMIFICATION.md §4.1).
 */
function observation(s: {
  correct: number;
  total: number;
  bestStreak: number;
  weakSteps: number[];
}): string {
  if (s.correct === s.total) {
    return 'Clean round — every one. Do that consistently and the next level opens up.';
  }

  const worst = s.weakSteps[0];
  if (worst !== undefined) {
    return `${worst} · ${SOLFEGE[worst - 1]} caught you out most — ${STEP_NICKNAME[worst]}. Listen for whether the note has arrived or still wants to move.`;
  }

  if (s.bestStreak >= 5) {
    return `A run of ${s.bestStreak} in the middle there. The ear is starting to hold the key on its own.`;
  }

  return 'Nothing stood out this round. Consistency at this level is exactly what earns the next one.';
}

/** What level+1 actually changes, said plainly. */
function whatsNext(level: number): string {
  const current = getLevel(level);
  const next = getLevel(level + 1);

  if (current.stage !== next.stage) {
    return `Next comes ${STAGE_LABEL[next.stage].toLowerCase()} — ${next.blurb.toLowerCase()}`;
  }
  if (current.drone && !next.drone) {
    return 'Next, the drone comes off and you hold home in your head instead.';
  }
  if (current.kind !== next.kind) {
    return `Level ${next.id} changes the question: ${next.blurb.toLowerCase()}`;
  }

  const added = next.steps.filter((s) => !current.steps.includes(s));
  if (added.length) {
    return `Level ${next.id} adds ${added.map((s) => `${s} · ${SOLFEGE[s - 1]}`).join(' and ')}.`;
  }
  if (next.twoOctaves && !current.twoOctaves) {
    return `Level ${next.id} widens the range to two octaves.`;
  }
  return `Level ${next.id} gives you a shorter introduction to the key.`;
}
