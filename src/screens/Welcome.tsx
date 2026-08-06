import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Label, Screen } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { DEFAULT_KEY, stepToMidi } from '@/core/music';
import { now, playKeyIntro, playNote, unlockAudio } from '@/audio/engine';

/**
 * Three screens, one idea each. The middle one is the important one: rather
 * than explaining what a cadence is, it plays one and names what you just
 * heard. The concept is much easier to hear than to read.
 */
export default function Welcome() {
  const navigate = useNavigate();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [demoState, setDemoState] = useState<'idle' | 'key' | 'note' | 'done'>('idle');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  async function playDemo() {
    await unlockAudio();
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const tonic = DEFAULT_KEY.tonic;
    setDemoState('key');
    const introEndsAt = playKeyIntro(tonic, 'full');
    const noteDelayMs = Math.max(0, (introEndsAt - now()) * 1000);

    timers.current.push(
      window.setTimeout(() => {
        setDemoState('note');
        playNote(stepToMidi(tonic, 3, true), 0.02, 1.1);
      }, noteDelayMs),
    );
    timers.current.push(window.setTimeout(() => setDemoState('done'), noteDelayMs + 1200));
  }

  function finish() {
    completeOnboarding();
    navigate('/', { replace: true });
  }

  const steps = [
    {
      label: 'What this is',
      title: 'Learn to hear where a note sits.',
      body: (
        <>
          <p>
            Every song lives in a <em>key</em> — a set of seven notes that sound like they belong
            together, with one of them feeling like <strong className="text-ink">home</strong>.
          </p>
          <p>
            Train your ear to place a note against that home and you can start working out music by
            ear. It's the skill underneath playing along, transcribing, improvising and singing in
            tune.
          </p>
        </>
      ),
      action: <Button onClick={() => setStep(1)}>Show me</Button>,
    },
    {
      label: 'How a question works',
      title: 'First the key, then one note.',
      body: (
        <>
          <p>
            Each question opens with a few chords. That's not a test — it's there to plant{' '}
            <strong className="text-ink">home</strong> in your ear so the note that follows has
            something to sit against.
          </p>
          <p>Press play and listen for the two parts.</p>
        </>
      ),
      action: (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Marker active={demoState === 'key'} done={demoState === 'note' || demoState === 'done'}>
              The key
            </Marker>
            <Marker active={demoState === 'note'} done={demoState === 'done'}>
              The note
            </Marker>
          </div>
          <Button variant="secondary" onClick={playDemo}>
            {demoState === 'idle' ? 'Play an example' : 'Play it again'}
          </Button>
          <Button onClick={() => setStep(2)} disabled={demoState === 'idle'}>
            {demoState === 'idle' ? 'Listen first' : 'Makes sense'}
          </Button>
        </div>
      ),
    },
    {
      label: 'Your first round',
      title: 'Three notes to start.',
      body: (
        <>
          <p>
            You'll begin with just the three notes of the home chord, and more get added as those
            become easy.
          </p>
          <p>
            A round is ten questions — about ninety seconds. Get one wrong and you'll hear your
            answer and the right one back to back, which is the fastest way to fix it.
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

function Marker({
  children,
  active,
  done,
}: {
  children: React.ReactNode;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
        active
          ? 'border-accent bg-accent-wash text-accent'
          : done
            ? 'border-line text-muted'
            : 'border-line text-subtle'
      }`}
    >
      {children}
    </div>
  );
}
