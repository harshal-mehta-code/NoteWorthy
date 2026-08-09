import { midiToName } from '@/core/music';

/**
 * A playable piano, used by the theory lessons.
 *
 * Every theory concept ships with something you can poke rather than a
 * diagram (docs/02-FEATURES.md §3.1) — the keyboard is the one that carries
 * the most weight, because half steps, scales and chords are all *shapes* on
 * it long before they're anything else.
 */
export function Keyboard({
  low = 60,
  high = 84,
  highlight = [],
  labels = 'none',
  onPress,
}: {
  low?: number;
  high?: number;
  /** MIDI notes to mark as part of the thing being explained. */
  highlight?: number[];
  labels?: 'none' | 'c' | 'all';
  onPress?: (midi: number) => void;
}) {
  const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);

  const width = 100;
  const keyW = width / whites.length;
  const height = 46;

  const label = (m: number) => {
    if (labels === 'all') return midiToName(m).replace(/\d/g, '');
    if (labels === 'c' && m % 12 === 0) return midiToName(m);
    return '';
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      className="touch-manipulation select-none"
      role="group"
      aria-label="Piano keyboard"
    >
      {whites.map((m, i) => {
        const on = highlight.includes(m);
        return (
          <g key={m} onPointerDown={() => onPress?.(m)} style={{ cursor: onPress ? 'pointer' : 'default' }}>
            <rect
              x={i * keyW}
              y={0}
              width={keyW - 0.4}
              height={height}
              rx={0.8}
              fill={on ? 'var(--nw-accent)' : 'var(--key-white)'}
              stroke="var(--nw-border)"
              strokeWidth="0.3"
            />
            {label(m) && (
              <text
                x={i * keyW + keyW / 2}
                y={height - 3}
                textAnchor="middle"
                fontSize="3.2"
                fill={on ? 'var(--nw-on-accent)' : 'var(--nw-text-subtle)'}
              >
                {label(m)}
              </text>
            )}
          </g>
        );
      })}

      {whites.map((m, i) => {
        const black = m + 1;
        if (black > high || !isBlack(black)) return null;
        const on = highlight.includes(black);
        return (
          <rect
            key={black}
            x={(i + 1) * keyW - keyW * 0.3}
            y={0}
            width={keyW * 0.6}
            height={height * 0.62}
            rx={0.6}
            fill={on ? 'var(--nw-accent)' : 'var(--key-black)'}
            stroke="var(--key-black)"
            strokeWidth="0.3"
            onPointerDown={() => onPress?.(black)}
            style={{ cursor: onPress ? 'pointer' : 'default' }}
          />
        );
      })}
    </svg>
  );
}
