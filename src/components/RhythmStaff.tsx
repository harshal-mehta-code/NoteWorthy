import { beamGroups, soundingNotes, type NoteResult, type RhythmPattern } from '@/core/rhythm';

/**
 * Rhythm notation on a single line.
 *
 * One line rather than five, because pitch is not part of this question and a
 * five-line stave would invite reading one. This is the same convention used
 * for unpitched percussion, and it makes the omission deliberate rather than
 * looking like notes that forgot where to sit.
 *
 * The rests are drawn as SVG paths rather than set in a music font: there is
 * no licence-clean music font reachable offline, and the alternative — the
 * Unicode musical symbols — renders inconsistently or not at all across
 * platforms. These are honest approximations of the engraved shapes, not
 * facsimiles of them.
 */
export function RhythmStaff({
  pattern,
  playing = -1,
  results,
}: {
  pattern: RhythmPattern;
  /** Index into the sounding notes, for the playhead. */
  playing?: number;
  /** Per-note grading, once answered. */
  results?: NoteResult[];
}) {
  const totalBeats = pattern.beatsPerBar * pattern.bars;
  const padX = 5;
  const width = 100;
  const height = 34;
  const line = 20;
  const span = width - padX * 2;

  /**
   * Horizontal layout.
   *
   * Purely proportional spacing — x from time — is what a naive reading of
   * notation suggests, and it is unreadable: a run of sixteenths collapses
   * into overlapping note heads while a half note floats in acres of space.
   * Engravers give every note a minimum width and compress the proportional
   * part to fit, which is what this does.
   */
  const MIN_WIDTH = 5.4;
  /** Room after the last symbol, so the closing barline never lands on it. */
  const END_PAD = 3.5;
  const rawWidths = pattern.events.map((e) =>
    Math.max(MIN_WIDTH, (e.duration / totalBeats) * span),
  );
  const rawTotal = rawWidths.reduce((sum, w) => sum + w, 0);
  const scale = (span - END_PAD) / rawTotal;

  /** Left edge of each event, and one past the last. */
  const edges: number[] = [padX];
  rawWidths.forEach((w) => edges.push(edges[edges.length - 1] + w * scale));
  const endX = edges[edges.length - 1] + END_PAD;

  /** Where a bar begins, by event index. */
  const barStartIndex = (bar: number) =>
    pattern.events.findIndex((e) => e.start >= bar * pattern.beatsPerBar);
  const barlineX = (bar: number) => {
    if (bar >= pattern.bars) return endX;
    const i = barStartIndex(bar);
    return i < 0 ? endX : edges[i] - 1.2;
  };

  const beams = beamGroups(pattern);
  const beamOf = new Map<number, number[]>();
  beams.forEach((group) => group.forEach((i) => beamOf.set(i, group)));

  // Sounding notes are numbered separately, since that is what gets graded.
  let soundingIndex = -1;
  const soundingAt = pattern.events.map((e) => (e.rest ? -1 : ++soundingIndex));
  const noteCount = soundingNotes(pattern).length;

  const toneOf = (i: number) => {
    const s = soundingAt[i];
    if (s < 0 || !results) return null;
    return results[s]?.state ?? null;
  };

  const colourFor = (i: number) => {
    const tone = toneOf(i);
    if (tone === 'hit') return 'var(--nw-correct)';
    if (tone === 'early' || tone === 'late') return 'var(--nw-wrong)';
    if (tone === 'missed') return 'var(--nw-text-subtle)';
    // Rests carry no sounding index, so they must not match the playhead —
    // with both at -1 they would light up on every question.
    if (soundingAt[i] >= 0 && soundingAt[i] === playing) return 'var(--nw-accent)';
    // Rests sit back: they are read, not played.
    return pattern.events[i].rest ? 'var(--nw-text-muted)' : 'var(--nw-text)';
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      className="select-none"
      role="img"
      aria-label={`${noteCount} notes to tap`}
    >
      {/* The one line everything sits on. */}
      <line
        x1={padX}
        y1={line}
        x2={endX}
        y2={line}
        stroke="var(--nw-text-subtle)"
        strokeWidth="0.35"
      />

      {/* Barlines. No opening one — there is no clef to separate it from, and
          it would sit right on top of the first note head. */}
      {Array.from({ length: pattern.bars }, (_, i) => i + 1).map((bar) => (
        <line
          key={`bar${bar}`}
          x1={barlineX(bar)}
          y1={line - 5}
          x2={barlineX(bar)}
          y2={line + 5}
          stroke="var(--nw-text-subtle)"
          strokeWidth={bar === pattern.bars ? 0.8 : 0.35}
        />
      ))}

      {pattern.events.map((event, i) => {
        const cx = edges[i] + 2.2;
        const colour = colourFor(i);
        if (event.rest) return <Rest key={i} x={cx} y={line} beats={event.duration} colour={colour} />;

        const beamed = beamOf.get(i);
        const stemTop = line - 11;
        const hollow = event.duration >= 2;

        return (
          <g key={i}>
            <ellipse
              cx={cx}
              cy={line}
              rx={1.9}
              ry={1.45}
              transform={`rotate(-18 ${cx} ${line})`}
              fill={hollow ? 'none' : colour}
              stroke={colour}
              strokeWidth={hollow ? 0.6 : 0}
            />
            {event.duration < 4 && (
              <line
                x1={cx + 1.75}
                y1={line - 0.5}
                x2={cx + 1.75}
                y2={stemTop}
                stroke={colour}
                strokeWidth="0.4"
              />
            )}
            {/* A flag only when the note is not part of a beam group. */}
            {event.duration < 1 && !beamed && (
              <Flag x={cx + 1.75} y={stemTop} count={event.duration <= 0.25 ? 2 : 1} colour={colour} />
            )}
          </g>
        );
      })}

      {/* Beams last, so they sit over the stems they join. */}
      {beams.map((group, gi) => {
        const first = pattern.events[group[0]];
        const x1 = edges[group[0]] + 2.2 + 1.75;
        const x2 = edges[group[group.length - 1]] + 2.2 + 1.75;
        const top = line - 11;
        const colour = colourFor(group[0]);
        // Sixteenths get a second beam below the first.
        const bars = first.duration <= 0.25 ? 2 : 1;
        return (
          <g key={`beam${gi}`}>
            {Array.from({ length: bars }, (_, b) => (
              <line
                key={b}
                x1={x1}
                y1={top + b * 1.6}
                x2={x2}
                y2={top + b * 1.6}
                stroke={colour}
                strokeWidth="1"
                strokeLinecap="butt"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Flag({ x, y, count, colour }: { x: number; y: number; count: number; colour: string }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d={`M${x} ${y + i * 1.9} q2.2 1 2.4 3.2 q-0.9 -1.5 -2.4 -1.9 z`}
          fill={colour}
        />
      ))}
    </g>
  );
}

/**
 * Rests. Whole and half rests are blocks on opposite sides of the line —
 * the standard mnemonic is that a whole rest is the heavier one and hangs.
 */
function Rest({ x, y, beats, colour }: { x: number; y: number; beats: number; colour: string }) {
  if (beats >= 4) return <rect x={x - 1.4} y={y - 1.6} width="2.8" height="1.4" fill={colour} />;
  if (beats >= 2) return <rect x={x - 1.4} y={y + 0.2} width="2.8" height="1.4" fill={colour} />;

  if (beats >= 1) {
    // The quarter rest, as a stroked zigzag with a hook at the foot. Drawn
    // as a line rather than a filled outline: at this size a filled shape
    // collapses into a blob, and the zigzag is the whole recognisable part.
    return (
      <path
        d={`M${x - 0.8} ${y - 3.6} l1.5 1.9 l-1.5 1.7 l1.6 1.8 q-1.6 -0.6 -1.9 0.6`}
        stroke={colour}
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  }

  // Eighth and sixteenth rests: a slanted stroke with one or two hooks.
  const hooks = beats <= 0.25 ? 2 : 1;
  return (
    <g>
      <line x1={x + 0.9} y1={y - 3.2} x2={x - 0.6} y2={y + 1.6} stroke={colour} strokeWidth="0.45" />
      {Array.from({ length: hooks }, (_, i) => (
        <path
          key={i}
          d={`M${x + 0.55} ${y - 2.6 + i * 1.7} q-1.5 -0.5 -1.9 0.9 q0.9 -0.7 1.9 -0.3 z`}
          fill={colour}
        />
      ))}
    </g>
  );
}
