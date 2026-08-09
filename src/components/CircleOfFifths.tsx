import { useState } from 'react';

/**
 * The circle of fifths, as a thing you can play.
 *
 * A picture of the circle gets memorised as a picture. The point of the
 * circle is that **neighbours share almost all their notes**, and the only
 * way to know that rather than recite it is to hear two neighbours back to
 * back and then hear two opposites. So every position sounds its home chord.
 */

/** Clockwise from C. Each step is a fifth up, and one more sharp. */
const RING: { name: string; tonic: number; accidentals: string }[] = [
  { name: 'C', tonic: 60, accidentals: '' },
  { name: 'G', tonic: 55, accidentals: '1♯' },
  { name: 'D', tonic: 62, accidentals: '2♯' },
  { name: 'A', tonic: 57, accidentals: '3♯' },
  { name: 'E', tonic: 64, accidentals: '4♯' },
  { name: 'B', tonic: 59, accidentals: '5♯' },
  { name: 'G♭', tonic: 54, accidentals: '6♭' },
  { name: 'D♭', tonic: 61, accidentals: '5♭' },
  { name: 'A♭', tonic: 56, accidentals: '4♭' },
  { name: 'E♭', tonic: 63, accidentals: '3♭' },
  { name: 'B♭', tonic: 58, accidentals: '2♭' },
  { name: 'F', tonic: 65, accidentals: '1♭' },
];

export function CircleOfFifths({ onPick }: { onPick?: (tonic: number, name: string) => void }) {
  const [active, setActive] = useState<string | null>(null);

  const size = 100;
  const c = size / 2;
  const radius = 38;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      className="touch-manipulation select-none"
      role="group"
      aria-label="Circle of fifths"
    >
      <circle cx={c} cy={c} r={radius} fill="none" stroke="var(--nw-border)" strokeWidth="0.4" />

      {RING.map((key, i) => {
        // Twelve o'clock is C, then clockwise.
        const angle = (i / RING.length) * Math.PI * 2 - Math.PI / 2;
        const x = c + Math.cos(angle) * radius;
        const y = c + Math.sin(angle) * radius;
        const on = active === key.name;

        return (
          <g
            key={key.name}
            onPointerDown={() => {
              setActive(key.name);
              onPick?.(key.tonic, key.name);
            }}
            style={{ cursor: onPick ? 'pointer' : 'default' }}
            role="button"
            aria-label={`${key.name} major`}
          >
            <circle
              cx={x}
              cy={y}
              r={9}
              fill={on ? 'var(--nw-accent)' : 'var(--nw-surface-2)'}
              stroke={on ? 'var(--nw-accent)' : 'var(--nw-border)'}
              strokeWidth="0.4"
            />
            <text
              x={x}
              y={y - 0.4}
              textAnchor="middle"
              fontSize="5.4"
              fontWeight="700"
              fill={on ? 'var(--nw-on-accent)' : 'var(--nw-text)'}
            >
              {key.name}
            </text>
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fontSize="3.2"
              fill={on ? 'var(--nw-on-accent)' : 'var(--nw-text-subtle)'}
            >
              {key.accidentals || '—'}
            </text>
          </g>
        );
      })}

      <text
        x={c}
        y={c - 2}
        textAnchor="middle"
        fontSize="4"
        fill="var(--nw-text-subtle)"
        letterSpacing="0.4"
      >
        CLOCKWISE
      </text>
      <text x={c} y={c + 4} textAnchor="middle" fontSize="4" fill="var(--nw-text-subtle)">
        adds a sharp
      </text>
    </svg>
  );
}
