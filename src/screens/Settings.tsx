import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, IconButton, Label, Screen, Segmented } from '@/components/ui';
import { backupFilename, buildBackup, parseBackup, type RestoreResult } from '@/core/backup';
import { INTRO_HELP } from '@/core/levels';
import type { IntroMode } from '@/core/levels';
import { KEYS, midiToName } from '@/core/music';
import { isUsable } from '@/core/range';
import { useStore } from '@/store/useStore';

export default function Settings() {
  const navigate = useNavigate();
  const s = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const introValue: IntroMode | 'auto' = s.introOverride;

  return (
    <Screen className="pad-top pad-bottom">
      <header className="flex items-center gap-4 py-2">
        <IconButton label="Back" onClick={() => navigate('/')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path
              d="M9.5 2.5L4 7.5l5.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        <h1 className="text-[15px] font-bold tracking-tight">Settings</h1>
      </header>

      <div className="flex-1 space-y-8 py-8">
        <Field
          label="Note labels"
          help="Numbers are easier to start with. Solfège is what most singers and teachers use."
        >
          <Segmented
            ariaLabel="Note labels"
            value={s.labelStyle}
            onChange={s.setLabelStyle}
            options={[
              { value: 'numbers', label: '1 2 3' },
              { value: 'solfege', label: 'Do Re Mi' },
            ]}
          />
        </Field>

        <Field label="Intro to the key" help={introValue === 'auto' ? 'Each level picks its own.' : INTRO_HELP[introValue]}>
          <Segmented
            ariaLabel="Intro to the key"
            value={introValue}
            onChange={s.setIntroOverride}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'full', label: 'Full' },
              { value: 'short', label: 'Short' },
              { value: 'home', label: 'Minimal' },
            ]}
          />
          {introValue !== 'auto' && (
            <p className="mt-2 text-[13px] text-subtle">Overrides the level's own setting.</p>
          )}
        </Field>

        <Field
          label="Key"
          help="A fixed key is calmer while you're learning. Rotating keys stops your ear latching onto one set of pitches."
        >
          <Segmented
            ariaLabel="Key mode"
            value={s.keyMode}
            onChange={s.setKeyMode}
            options={[
              { value: 'fixed', label: 'Fixed' },
              { value: 'random', label: 'Rotate' },
            ]}
          />
          {s.keyMode === 'fixed' && (
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {KEYS.map((k) => (
                <button
                  key={k.name}
                  onClick={() => s.setKeyName(k.name)}
                  className={`rounded-lg border py-2.5 text-sm font-semibold transition ${
                    s.keyName === k.name
                      ? 'border-accent bg-accent-wash text-accent'
                      : 'border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  {k.name}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field
          label="Your voice"
          help="Sung answers are graded on the note, never the octave — this only changes which octave the app plays its prompts in."
        >
          <button
            onClick={() => navigate('/voice/range')}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-left transition hover:border-line-strong hover:bg-surface-2"
          >
            <span className="text-[15px] font-semibold">
              {isUsable(s.vocalRange) ? 'Your range' : 'Find your range'}
            </span>
            <span className="tnum text-[14px] text-subtle">
              {isUsable(s.vocalRange)
                ? `${midiToName(s.vocalRange.low)} – ${midiToName(s.vocalRange.high)}`
                : 'Not measured'}
            </span>
          </button>
        </Field>

        <Field label="Appearance">
          <Segmented
            ariaLabel="Appearance"
            value={s.theme}
            onChange={s.setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'dark', label: 'Midnight' },
              { value: 'light', label: 'Paper' },
            ]}
          />
        </Field>

        <div className="border-t border-line pt-8">
          <Label>Your progress</Label>
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
            {s.totalSessions} {s.totalSessions === 1 ? 'round' : 'rounds'}, {s.totalAnswers}{' '}
            {s.totalAnswers === 1 ? 'question' : 'questions'} answered. Everything is stored on this
            device only — no account, and nothing leaves your browser.
          </p>

          <Backup />

          {confirmReset ? (
            <div className="mt-4 space-y-2">
              <p className="text-[15px] text-wrong">
                This erases every level, streak and statistic. It cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    s.resetProgress();
                    setConfirmReset(false);
                    navigate('/');
                  }}
                >
                  Erase everything
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="mt-4 text-sm text-subtle transition hover:text-wrong"
            >
              Reset progress
            </button>
          )}
        </div>
      </div>
    </Screen>
  );
}

/**
 * Backup and restore.
 *
 * The flip side of "no account, nothing leaves your browser" is that clearing
 * site data takes everything with it. A file the user keeps is the whole
 * mitigation, so it sits directly under the sentence that creates the risk.
 */
function Backup() {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<RestoreResult | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function save() {
    const file = buildBackup({
      progress: store.progress,
      lastCourse: store.lastCourse,
      lessonsDone: store.lessonsDone,
      labelStyle: store.labelStyle,
      keyMode: store.keyMode,
      keyName: store.keyName,
      introOverride: store.introOverride,
      theme: store.theme,
      vocalRange: store.vocalRange,
      stats: store.stats,
      degreeStats: store.degreeStats,
      streakDays: store.streakDays,
      lastPracticeDay: store.lastPracticeDay,
      totalSessions: store.totalSessions,
      totalAnswers: store.totalAnswers,
      lastSession: null,
    });

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    a.click();
    URL.revokeObjectURL(url);
    setNote('Saved. Keep it somewhere you back up.');
  }

  async function chose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input, or picking the same file twice in a row does nothing.
    e.target.value = '';
    if (!file) return;
    setNote(null);
    setPending(parseBackup(await file.text()));
  }

  return (
    <div className="mt-5">
      <div className="flex gap-2">
        <button
          onClick={save}
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-3 text-[14px] font-semibold transition hover:border-line-strong hover:bg-surface-2"
        >
          Save a backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-3 text-[14px] font-semibold transition hover:border-line-strong hover:bg-surface-2"
        >
          Restore
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={chose}
        className="hidden"
        aria-label="Choose a backup file"
      />

      {note && <p className="mt-3 text-[13.5px] text-subtle">{note}</p>}

      {pending && !pending.ok && (
        <Card className="mt-3">
          <p className="text-[14.5px] leading-relaxed text-wrong">{pending.error}</p>
          <button
            onClick={() => setPending(null)}
            className="mt-3 text-sm text-subtle transition hover:text-ink"
          >
            Close
          </button>
        </Card>
      )}

      {pending?.ok && (
        <Card tone="accent" className="mt-3">
          <Label className="text-accent">Restore this backup?</Label>
          <p className="mt-2.5 text-[14.5px] leading-relaxed">{pending.summary}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            This replaces everything currently on this device. Restoring merges nothing — two
            histories of the same drill would average into a figure describing neither.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                store.restore(pending.payload);
                setPending(null);
                setNote('Restored.');
              }}
            >
              Restore it
            </Button>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2.5">{children}</div>
      {help && <p className="mt-2 text-[13px] leading-relaxed text-subtle">{help}</p>}
    </div>
  );
}
