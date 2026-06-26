import type { CSSProperties, JSX } from 'react';
import { useMemo, useState } from 'react';
import type { LiftedState } from '@headlesskit/state-management-devtools';
import { monoFont, theme } from './theme.js';

/** Props for `ActionList`. */
export interface ActionListProps {
  /** The connection's lifted state to list actions from. */
  liftedState: LiftedState;
  /** Called when an action (or the initial baseline, with `index -1`) is selected. */
  onSelectIndex: (index: number) => void;
  /** Called when an action's skip checkbox is toggled. */
  onToggleAction: (actionId: number) => void;
}

interface ActionRow {
  index: number;
  id?: number | undefined;
  label: string;
  timestamp?: number | undefined;
  skipped: boolean;
  hasError: boolean;
}

function actionLabel(action: unknown): string {
  if (typeof action === 'object' && action !== null && 'type' in action) {
    return String((action as { type: unknown }).type);
  }
  return JSON.stringify(action);
}

function buildRows(liftedState: LiftedState): ActionRow[] {
  const rows: ActionRow[] = [{ index: -1, label: '@@INIT', skipped: false, hasError: false }];
  liftedState.stagedActionIds.forEach((id, index) => {
    const entry = liftedState.actionsById[id];
    rows.push({
      index,
      id,
      label: entry ? actionLabel(entry.action) : `#${id.toString()}`,
      timestamp: entry?.timestamp,
      skipped: liftedState.skippedActionIds.includes(id),
      hasError: liftedState.computedStates[index]?.error !== undefined,
    });
  });
  return rows;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRight: `1px solid ${theme.border}`,
  width: 220,
  flexShrink: 0,
};

const filterInputStyle: CSSProperties = {
  margin: 6,
  padding: '4px 6px',
  background: theme.panelBackground,
  border: `1px solid ${theme.border}`,
  borderRadius: 4,
  color: theme.text,
  fontFamily: monoFont,
  fontSize: 12,
};

const listStyle: CSSProperties = { flex: 1, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' };

function rowStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: monoFont,
    fontSize: 12,
    background: active ? theme.buttonBackgroundActive : 'transparent',
    borderBottom: `1px solid ${theme.border}`,
  };
}

/**
 * Renders the filterable, clickable action list — the left-hand sidebar of the Inspector.
 * Clicking a row jumps to that point in history; the checkbox toggles whether the action is
 * skipped during replay.
 * @param props - The lifted state to list, plus selection/toggle callbacks.
 * @param props.liftedState - The connection's lifted state to list actions from.
 * @param props.onSelectIndex - Called when an action (or the initial baseline) is selected.
 * @param props.onToggleAction - Called when an action's skip checkbox is toggled.
 * @returns The action list element.
 */
export function ActionList({ liftedState, onSelectIndex, onToggleAction }: ActionListProps): JSX.Element {
  const [filter, setFilter] = useState('');
  const rows = useMemo(() => buildRows(liftedState), [liftedState]);
  const filtered = filter.trim() === '' ? rows : rows.filter((row) => row.label.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={containerStyle}>
      <input
        type="text"
        placeholder="Filter actions…"
        value={filter}
        onChange={(event) => {
          setFilter(event.target.value);
        }}
        style={filterInputStyle}
        aria-label="Filter actions"
      />
      <ul style={listStyle}>
        {filtered.map((row) => (
          <li
            key={row.index}
            style={rowStyle(row.index === liftedState.currentStateIndex)}
            onClick={() => {
              onSelectIndex(row.index);
            }}
          >
            {row.id !== undefined && (
              <input
                type="checkbox"
                checked={!row.skipped}
                aria-label={`Include ${row.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onChange={() => {
                  onToggleAction(row.id as number);
                }}
              />
            )}
            <span
              style={{
                flex: 1,
                textDecoration: row.skipped ? 'line-through' : 'none',
                color: row.hasError ? theme.removed : theme.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.label}
            </span>
            {row.timestamp !== undefined && (
              <span style={{ color: theme.textFaint, fontSize: 10 }}>
                {new Date(row.timestamp).toLocaleTimeString()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
