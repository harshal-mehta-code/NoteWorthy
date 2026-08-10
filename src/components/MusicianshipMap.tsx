import { useState } from 'react';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  NODE_R,
  buildMap,
  mapEdges,
  mapLabel,
  type MapNode,
} from '@/core/mapLayout';
import { retentionLabel } from '@/core/retention';
import type { Memory } from '@/core/retention';

/**
 * The Musicianship Map.
 *
 * Every course, how far up it you are, and — the part no other app does —
 * **how much of it you still have**. Nodes dim as retention decays, so a
 * course you ground through in March and never touched again visibly fades,
 * which is the honest picture and the one that actually prompts a review.
 *
 * Dimming only ever reflects a measured memory. An untouched course is drawn
 * as an outline rather than a dim node: not knowing something and having
 * forgotten it look different here, because they feel different.
 */
export function MusicianshipMap({
  progress,
  memories,
  lessonsDone,
  onPick,
}: {
  progress: Record<string, number>;
  memories: Record<string, Memory>;
  lessonsDone: number;
  onPick: (node: MapNode) => void;
}) {
  const nodes = buildMap(progress, memories, lessonsDone);
  const byId = new Map(nodes.map((n) => [n.course.id, n]));
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        width="100%"
        className="touch-manipulation select-none overflow-visible"
        role="group"
        aria-label="Your musicianship map"
      >
        {/* Edges first, so nodes sit over them. */}
        {mapEdges().map(({ from, to }) => {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) return null;
          const live = a.started && b.started;
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={live ? 'var(--nw-border-str)' : 'var(--nw-border)'}
              strokeWidth={live ? 0.5 : 0.35}
              strokeDasharray={live ? undefined : '1.2 1.4'}
            />
          );
        })}

        {nodes.map((node) => (
          <Node
            key={node.course.id}
            node={node}
            selected={selected === node.course.id}
            onSelect={() => setSelected(node.course.id)}
            onOpen={() => onPick(node)}
          />
        ))}
      </svg>

      <Detail node={nodes.find((n) => n.course.id === selected) ?? null} onOpen={onPick} />
    </div>
  );
}

const R = NODE_R;

function Node({
  node,
  selected,
  onSelect,
  onOpen,
}: {
  node: MapNode;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const planned = node.course.status === 'planned';
  const { retention, progress } = node;

  // Brightness is retention. Three distinct states, because they mean three
  // different things: never touched is an outline, started-but-unmeasurable
  // (the lesson course, which does not decay in any way the app can honestly
  // measure) sits at a fixed middle, and everything drilled is lit by how
  // much of it survives.
  const fillOpacity =
    retention === null ? (node.started ? 0.45 : 0) : 0.1 + retention * 0.75;
  const circumference = 2 * Math.PI * (R + 2.2);

  return (
    <g
      onPointerDown={onSelect}
      onDoubleClick={onOpen}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${node.course.name}${planned ? ', planned' : ''}`}
    >
      {/* Progress ring: how far up the ladder, regardless of freshness. */}
      {!planned && progress > 0 && (
        <circle
          cx={node.x}
          cy={node.y}
          r={R + 2.2}
          fill="none"
          stroke="var(--nw-accent)"
          strokeWidth="0.9"
          strokeOpacity="0.75"
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform={`rotate(-90 ${node.x} ${node.y})`}
        />
      )}

      <circle
        cx={node.x}
        cy={node.y}
        r={R}
        fill="var(--nw-accent)"
        fillOpacity={planned ? 0 : fillOpacity}
        stroke={
          planned
            ? 'var(--nw-border)'
            : node.started
              ? 'var(--nw-accent)'
              : 'var(--nw-border-str)'
        }
        strokeWidth={selected ? 1 : 0.5}
        strokeDasharray={planned ? '1.4 1.4' : undefined}
      />

      {/* Level number inside, name underneath. Names do not fit inside a node
          at any legible size, and shrinking them until they do produces
          labels nobody can read on a phone. */}
      {!planned && node.started && (
        <text
          x={node.x}
          y={node.y + 1.6}
          textAnchor="middle"
          fontSize="4.4"
          fontWeight="700"
          fill={fillOpacity > 0.5 ? 'var(--nw-on-accent)' : 'var(--nw-text)'}
        >
          {node.course.lessons
            ? Math.round(node.progress * node.course.lessons)
            : Math.max(1, Math.round(node.progress * node.course.levels.length))}
        </text>
      )}

      <text
        x={node.x}
        y={node.y + R + 4.4}
        textAnchor="middle"
        fontSize="3.2"
        fontWeight={selected ? 700 : 500}
        fill={planned ? 'var(--nw-text-subtle)' : selected ? 'var(--nw-accent)' : 'var(--nw-text-muted)'}
      >
        {mapLabel(node.course.id, node.course.name)}
      </text>
    </g>
  );
}

function Detail({ node, onOpen }: { node: MapNode | null; onOpen: (n: MapNode) => void }) {
  if (!node) {
    return (
      <p className="mt-4 text-center text-[13px] leading-relaxed text-subtle">
        Brightness is how much of a course you still have — it fades as you go without practising.
        Tap a node to see where you stand.
      </p>
    );
  }

  const planned = node.course.status === 'planned';
  const pct = Math.round(node.progress * 100);

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">{node.course.name}</span>
        <span className="label shrink-0 text-subtle">
          {planned
            ? 'planned'
            : node.retention === null
              ? node.started
                ? 'in progress'
                : 'not started'
              : retentionLabel(node.retention)}
        </span>
      </div>

      <p className="mt-1.5 text-[13.5px] leading-snug text-muted">{node.course.blurb}</p>

      {!planned && (
        <>
          <p className="tnum mt-2.5 font-mono text-[11px] text-subtle">
            {node.course.lessons
              ? `${Math.round(node.progress * node.course.lessons)} of ${node.course.lessons} lessons`
              : `level ${Math.max(1, Math.round(node.progress * node.course.levels.length))} of ${node.course.levels.length}`}
            {pct > 0 && ` · ${pct}% through`}
          </p>
          <button
            onClick={() => onOpen(node)}
            className="mt-3 w-full rounded-xl border border-accent-dim bg-accent-wash py-2.5 text-[14px] font-semibold text-accent transition hover:border-accent"
          >
            {node.started ? 'Practise this' : 'Start this'}
          </button>
        </>
      )}

      {planned && node.course.planNote && (
        <p className="mt-2.5 text-[13px] leading-snug text-subtle">{node.course.planNote}</p>
      )}
    </div>
  );
}
