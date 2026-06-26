import type { CSSProperties, JSX } from 'react';
import { useState } from 'react';
import { monoFont, theme } from './theme.js';

/** Props for `JsonTree`. */
export interface JsonTreeProps {
  /** The value to render as a collapsible tree. */
  value: unknown;
  /** A label shown for the root node (e.g. the field name this tree is rooted at). */
  label?: string | undefined;
  /** Whether the root node starts expanded. Defaults to `true`. */
  defaultExpanded?: boolean;
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isExpandable(value: unknown): boolean {
  return (typeOf(value) === 'object' || typeOf(value) === 'array') && value !== null;
}

function primitiveLabel(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (value === undefined) return 'undefined';
  return String(value);
}

// Only ever called for expandable values (see isExpandable), so the array/object cases are exhaustive.
function summary(value: unknown): string {
  return Array.isArray(value)
    ? `Array(${value.length.toString()})`
    : `Object(${Object.keys(value as object).length.toString()})`;
}

function valueColor(value: unknown): string {
  const type = typeOf(value);
  if (type === 'string') return theme.string;
  if (type === 'number') return theme.number;
  if (type === 'boolean') return theme.boolean;
  if (type === 'null' || type === 'undefined') return theme.nullish;
  return theme.text;
}

const rowStyle: CSSProperties = { fontFamily: monoFont, fontSize: 12, lineHeight: 1.6 };
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

function JsonTreeNode({ value, label, defaultExpanded = false }: JsonTreeProps): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandable = isExpandable(value);

  if (!expandable) {
    return (
      <div style={rowStyle}>
        {label !== undefined && <span style={keyStyle}>{label}: </span>}
        <span style={{ color: valueColor(value) }}>{primitiveLabel(value)}</span>
      </div>
    );
  }

  const entries: ReadonlyArray<readonly [string, unknown]> = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div style={rowStyle}>
      <button
        type="button"
        style={toggleStyle}
        onClick={() => {
          setExpanded((current) => !current);
        }}
        aria-expanded={expanded}
      >
        <span style={arrowStyle}>{expanded ? '▾' : '▸'}</span>
        {label !== undefined && <span style={keyStyle}>{label}: </span>}
        <span style={{ color: theme.textMuted }}>{summary(value)}</span>
      </button>
      {expanded && (
        <div style={childrenStyle}>
          {entries.map(([key, child]) => (
            <JsonTreeNode key={key} value={child} label={key} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders an arbitrary JSON-like value as a collapsible, color-coded tree — the "Tree" view mode
 * used by the Action/State/Diff tabs.
 * @param props - The value (and optional root label) to render.
 * @param props.value - The value to render as a collapsible tree.
 * @param props.label - A label shown for the root node.
 * @param props.defaultExpanded - Whether the root node starts expanded.
 * @returns The tree view.
 */
export function JsonTree({ value, label, defaultExpanded = true }: JsonTreeProps): JSX.Element {
  return <JsonTreeNode value={value} label={label} defaultExpanded={defaultExpanded} />;
}
