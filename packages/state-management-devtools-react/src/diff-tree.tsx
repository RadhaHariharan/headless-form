import type { CSSProperties, JSX } from 'react';
import { useState } from 'react';
import type { DiffNode } from './compute-diff.js';
import { monoFont, theme } from './theme.js';

/** Props for `DiffTree`. */
export interface DiffTreeProps {
  /** The diff nodes to render, as produced by `computeDiff`. */
  nodes: DiffNode[];
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const rowStyle: CSSProperties = { fontFamily: monoFont, fontSize: 12, lineHeight: 1.6 };
const lineStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 6 };
const keyStyle: CSSProperties = { color: theme.key };
const toggleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'none',
  border: 'none',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
  padding: 0,
};
const arrowStyle: CSSProperties = { color: theme.textFaint, width: 10, display: 'inline-block' };
const childrenStyle: CSSProperties = { marginLeft: 14 };

function DiffTreeRow({ node }: { node: DiffNode }): JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children !== undefined && node.children.length > 0;

  return (
    <div style={rowStyle}>
      <div style={lineStyle}>
        {hasChildren ? (
          <button
            type="button"
            style={toggleStyle}
            onClick={() => {
              setExpanded((current) => !current);
            }}
            aria-expanded={expanded}
          >
            <span style={arrowStyle}>{expanded ? '▾' : '▸'}</span>
            <span style={keyStyle}>{node.key}</span>
          </button>
        ) : (
          <span style={keyStyle}>{node.key}</span>
        )}
        {node.status === 'added' && <span style={{ color: theme.added }}>+ {formatValue(node.nextValue)}</span>}
        {node.status === 'removed' && <span style={{ color: theme.removed }}>− {formatValue(node.prevValue)}</span>}
        {node.status === 'changed' && !hasChildren && (
          <span>
            <span style={{ color: theme.changedFrom }}>{formatValue(node.prevValue)}</span>
            <span style={{ color: theme.textFaint }}> ⇒ </span>
            <span style={{ color: theme.changedTo }}>{formatValue(node.nextValue)}</span>
          </span>
        )}
        {node.status === 'unchanged' && !hasChildren && (
          <span style={{ color: theme.unchanged }}>{formatValue(node.nextValue)}</span>
        )}
      </div>
      {hasChildren && expanded && (
        <div style={childrenStyle}>
          {node.children?.map((child) => <DiffTreeRow key={child.key} node={child} />)}
        </div>
      )}
    </div>
  );
}

/**
 * Renders a diff tree (from `computeDiff`) with field-level added/removed/changed annotations —
 * the Diff tab's Tree view. Shows only changed fields when there's at least one, otherwise shows
 * every field (so an action with no effect still renders something).
 * @param props - The diff nodes to render.
 * @param props.nodes - The diff nodes to render, as produced by `computeDiff`.
 * @returns The diff view.
 */
export function DiffTree({ nodes }: DiffTreeProps): JSX.Element {
  const changed = nodes.filter((node) => node.status !== 'unchanged');
  const toRender = changed.length > 0 ? changed : nodes;
  return (
    <div>
      {toRender.map((node) => (
        <DiffTreeRow key={node.key} node={node} />
      ))}
    </div>
  );
}
