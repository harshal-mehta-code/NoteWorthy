import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, IconButton, Label, Screen, Segmented } from '@/components/ui';
import { INTRO_HELP } from '@/core/levels';
import type { IntroMode } from '@/core/levels';
import { KEYS } from '@/core/music';
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
