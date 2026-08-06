import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Label, Screen } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { DEFAULT_KEY, stepToMidi } from '@/core/music';
import { playNote, startDrone, stopDrone, unlockAudio } from '@/audio/engine';

type Demo = 'home' | 'away';

/**
 * Three screens, one idea each.
 *
 * The middle one is the important one, and it teaches rather than explains:
 * a drone holds home, and you can play a note that *is* home and a note that
 * isn't, back to back, as many times as you like. Hearing home blend into
 * the drone and then hearing another note rub against it is the entire
 * foundation of the app, and it takes about ten seconds to feel.
 */
export default function Welcome() {
  const navigate = useNavigate();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [heard, setHeard] = useState<Set<Demo>>(new Set());
  const [lastPlayed, setLastPlayed] = useState<Demo | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      stopDrone();
    };
  }, []);

  // The drone belongs to screen two only.
  useEffect(() => {
    if (step !== 1) stopDrone();
  }, [step]);

  async function play(which: Demo) {
    await unlockAudio();
    startDrone(DEFAULT_KEY.tonic);
    setLastPlayed(which);
    setHeard((prev) => new Set(prev).add(which));

    const midi = stepToMidi(DEFAULT_KEY.tonic, which === 'home' ? 1 : 4, true);
    timers.current.push(window.setTimeout(() => playNote(midi, 0.02, 1.6, 0.3), 550));
  }

  function finish() {
    stopDrone();
    completeOnboarding();
    navigate('/', { replace: true });
  }

  const heardBoth = heard.has('home') && heard.has('away');

  const steps = [
    {
      label: 'What this is',
      title: 'Learn to hear where a note sits.',
      body: (
        <>
          <p>
            Every song lives in a <em>key</em> — a set of notes that sound like they belong
            together, with one of them feeling like <strong className="text-ink">home</strong>.
          </p>
          <p>
            Hearing where a note sits against that home is the skill underneath playing along,
            working out songs by ear, improvising, and singing in tune.
          </p>
        </>
      ),
      action: <Button onClick={() => setStep(1)}>Let me hear it</Button>,
    },
    {
      label: 'The whole idea, in one listen',
      title: 'Home blends in. Everything else rubs.',
      body: (
        <>
          <p>
            You'll hear a steady tone underneath — that's <strong className="text-ink">home</strong>,
            holding. Play both notes over it and notice how different they feel.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <DemoButton
              onClick={() => play('home')}
              active={lastPlayed === 'home'}
              done={heard.has('home')}
              title="Home"
              caption="settles, disappears"
            />
            <DemoButton
              onClick={() => play('away')}
              active={lastPlayed === 'away'}
              done={heard.has('away')}
              title="Not home"
              caption="leans, wants to move"
            />
          </div>
          <p className="text-subtle">
            {heardBoth
              ? 'That difference is what the first four levels train, and nothing else.'
              : 'Play them both — ideally a couple of times each.'}
          </p>
        </>
      ),
      action: (
        <Button onClick={() => setStep(2)} disabled={!heardBoth}>
          {heardBoth ? 'I hear the difference' : 'Play both to continue'}
        </Button>
      ),
    },
    {
      label: 'Your first round',
      title: 'Two buttons to start.',
      body: (
        <>
          <p>
            Level one is exactly what you just did: the drone holds home, one note plays, and you
            say whether it was home or not. Two buttons, nothing to memorise.
          </p>
          <p>
            The drone comes off later, and only then do we start naming notes. A round is eight
            questions — well under a minute.
          </p>
        </>
      ),
      action: <Button onClick={finish}>Start</Button>,
    },
  ];

  const current = steps[step];

  return (
    <Screen className="pad-top pad-bottom">
      <div className="flex items-center gap-2 py-2">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-accent' : 'bg-surface-3'
            }`}
          />
        ))}
      </div>

      <div key={step} className="anim-rise flex flex-1 flex-col justify-center py-10">
        <Label className="text-accent">{current.label}</Label>
        <h1 className="mt-3 text-[34px] leading-[1.1] font-bold tracking-[-0.035em] text-balance">
          {current.title}
        </h1>
        <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-muted">{current.body}</div>
      </div>

      <div className="pb-2">{current.action}</div>
    </Screen>
  );
}

function DemoButton({
  onClick,
  active,
  done,
  title,
  caption,
}: {
  onClick: () => void;
  active: boolean;
  done: boolean;
  title: string;
  caption: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-4 text-center transition active:scale-[0.97] ${
        active
          ? 'border-accent bg-accent-wash'
          : done
            ? 'border-line-strong bg-surface'
            : 'border-line bg-surface hover:border-line-strong'
      }`}
    >
      <span className={`block text-[15px] font-semibold ${active ? 'text-accent' : 'text-ink'}`}>
        {title}
      </span>
      <span className="mt-0.5 block text-[12px] leading-snug text-subtle">{caption}</span>
    </button>
  );
}
