import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Label, Screen, Sheet } from '@/components/ui';
import { LEVELS, STAGE_BLURB, STAGE_LABEL, getLevel, type Stage } from '@/core/levels';
import { recentAccuracy, useStore } from '@/store/useStore';
import { unlockAudio } from '@/audio/engine';

/**
 * One screen, one action. Everything else on it is status, and status is
 * kept to a single line each — the moment Home becomes a dashboard it stops
 * being obvious what to do next.
 */
export default function Home() {
  const navigate = useNavigate();
  const level = useStore((s) => s.level);
  const stats = useStore((s) => s.stats);
  const streakDays = useStore((s) => s.streakDays);
  const totalSessions = useStore((s) => s.totalSessions);
  const setLevel = useStore((s) => s.setLevel);
  const [picking, setPicking] = useState(false);

  const current = getLevel(level);
  const accuracy = recentAccuracy(stats[level]);

  async function start() {
    await unlockAudio();
    navigate('/practice');
  }

  const stages: Stage[] = ['finding', 'naming'];

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center justify-between py-2">
        <span className="text-[15px] font-bold tracking-tight">NoteWorthy</span>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="label text-subtle transition hover:text-ink"
        >
          Settings
        </button>
      </header>

      <div className="flex flex-1 flex-col justify-center py-8">
        <Label className="text-accent">{STAGE_LABEL[current.stage]}</Label>
        <h1 className="mt-3 text-[36px] leading-[1.05] font-bold tracking-[-0.04em] text-balance">
          {current.name}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">{current.blurb}</p>

        <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
          {current.drone ? (
            <span className="label rounded-full border border-cool/40 px-3 py-1.5 text-cool">
              Drone holds home
            </span>
          ) : (
            <StepPreview steps={current.steps} />
          )}
          {accuracy !== null && (
            <span className="tnum font-mono text-xs text-subtle">
              {Math.round(accuracy * 100)}% lately
            </span>
          )}
        </div>

        {totalSessions === 0 && (
          <Card tone="accent" className="mt-7">
            <p className="text-[15px] leading-relaxed">
              A round is {current.roundLength} questions and takes under a minute. There's no timer
              and no way to fail.
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-3 pb-2">
        <Button onClick={start}>
          {totalSessions === 0 ? 'Start your first round' : 'Start a round'}
        </Button>
        <button
          onClick={() => setPicking(true)}
          className="w-full py-1 text-center text-sm text-subtle transition hover:text-ink"
        >
          Level {level} of {LEVELS.length} — change
        </button>
        {streakDays > 0 && (
          <p className="pt-1 text-center text-sm text-subtle">
            {streakDays} {streakDays === 1 ? 'day' : 'days'} in a row
          </p>
        )}
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Choose a level">
        <p>
          The first four teach you to <em>find</em> home, with a drone holding it underneath. The
          rest take the drone away and ask you to name what you hear.
        </p>
        <p className="text-subtle">Nothing is locked — jump around freely.</p>

        <div className="space-y-5 pt-1">
          {stages.map((stage) => (
            <div key={stage}>
              <Label className="text-accent">{STAGE_LABEL[stage]}</Label>
              <p className="mt-1 mb-2.5 text-[13px] text-subtle">{STAGE_BLURB[stage]}</p>
              <div className="space-y-2">
                {LEVELS.filter((l) => l.stage === stage).map((l) => {
                  const acc = recentAccuracy(stats[l.id]);
                  const active = l.id === level;
                  return (
                    <button
                      key={l.id}
                      onClick={() => {
                        setLevel(l.id);
                        setPicking(false);
                      }}
                      className={`w-full rounded-xl border p-3.5 text-left transition ${
                        active
                          ? 'border-accent bg-accent-wash'
                          : 'border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={`font-semibold ${active ? 'text-accent' : 'text-ink'}`}>
                          {l.id}. {l.name}
                        </span>
                        <span className="tnum shrink-0 font-mono text-[11px] text-subtle">
                          {acc === null ? '' : `${Math.round(acc * 100)}%`}
                        </span>
                      </div>
                      <span className="mt-1 block text-[13px] leading-snug text-muted">
                        {l.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </Screen>
  );
}

/** The notes in play at this level, as a row of chips. */
function StepPreview({ steps }: { steps: number[] }) {
  return (
    <div className="flex gap-1.5" aria-label={`${steps.length} notes in play`}>
      {steps.map((s) => (
        <span
          key={s}
          className="tnum grid size-7 place-items-center rounded-lg border border-line bg-surface font-mono text-[12px] text-muted"
        >
          {s}
        </span>
      ))}
    </div>
  );
}
