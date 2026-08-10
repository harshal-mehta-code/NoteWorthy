import { BOTTOM_LINE, staffStep, type Clef } from '@/core/reading';

/**
 * A single note on a stave, drawn as SVG.
 *
 * Hand-drawn rather than engraved with VexFlow, on purpose: naming one note
 * needs five lines, a clef and a notehead, and VexFlow is ~300KB plus an API
 * that shifts between majors. It arrives when we need beams, rhythms and
 * multiple voices — see docs/04-ARCHITECTURE.md §3.2. Clefs use the Unicode
 * glyphs, with the stave still readable if a platform lacks them.
 */

const SPACE = 14; // vertical distance between two stave lines
const HALF = SPACE / 2; // one diatonic step
const WIDTH = 260;
const NOTE_X = 168;

export function Staff({
  index,
  clef,
  tone = 'neutral',
}: {
  index: number;
  clef: Clef;
  tone?: 'neutral' | 'correct' | 'wrong';
}) {
  const step = staffStep(index, clef);

  // The top line is step 8. Put it a fixed distance from the top of the box,
  // then leave room for four ledger lines either side.
  const topLineY = 56;
  const y = (s: number) => topLineY + (8 - s) * HALF;
  const height = topLineY * 2 + SPACE * 4;

  const colour =
    tone === 'correct'
      ? 'var(--nw-correct)'
      : tone === 'wrong'
        ? 'var(--nw-wrong)'
        : 'var(--nw-text)';

  // Ledger lines march outward in whole steps from the stave edge.
  const ledgers: number[] = [];
  for (let s = 10; s <= step; s += 2) ledgers.push(s);
  for (let s = -2; s >= step; s -= 2) ledgers.push(s);

  const stemUp = step < 4;
  const noteY = y(step);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={`A note on the ${clef} stave`}
      className="max-w-[280px]"
    >
      {[0, 2, 4, 6, 8].map((s) => (
        <line
          key={s}
          x1={16}
          y1={y(s)}
          x2={WIDTH - 16}
          y2={y(s)}
          stroke="var(--nw-text)"
          strokeOpacity="0.42"
          strokeWidth="1.2"
        />
      ))}

      <text
        x={clef === 'treble' ? 26 : 30}
        y={clef === 'treble' ? y(2) + 6 : y(6) + 6}
        fontSize={clef === 'treble' ? SPACE * 5.2 : SPACE * 3.4}
        fill="var(--nw-text)"
        fillOpacity="0.85"
        fontFamily="'Bravura','Segoe UI Symbol','Apple Symbols','Noto Music',serif"
      >
        {clef === 'treble' ? '\u{1D11E}' : '\u{1D122}'}
      </text>

      {ledgers.map((s) => (
        <line
          key={`l${s}`}
          x1={NOTE_X - 16}
          y1={y(s)}
          x2={NOTE_X + 16}
          y2={y(s)}
          stroke="var(--nw-text)"
          strokeOpacity="0.42"
          strokeWidth="1.2"
        />
      ))}

      <ellipse
        cx={NOTE_X}
        cy={noteY}
        rx={HALF * 1.32}
        ry={HALF * 0.96}
        transform={`rotate(-20 ${NOTE_X} ${noteY})`}
        fill={colour}
      />
      <line
        x1={stemUp ? NOTE_X + HALF * 1.2 : NOTE_X - HALF * 1.2}
        y1={noteY}
        x2={stemUp ? NOTE_X + HALF * 1.2 : NOTE_X - HALF * 1.2}
        y2={stemUp ? noteY - SPACE * 2.4 : noteY + SPACE * 2.4}
        stroke={colour}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { BOTTOM_LINE };
