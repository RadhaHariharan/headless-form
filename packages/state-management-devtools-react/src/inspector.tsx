import type { CSSProperties, JSX } from 'react';
import { useMemo, useState } from 'react';
import type { InspectorStore } from '@headlesskit/state-management-devtools';
import { ActionList } from './action-list.js';
import { computeDiff } from './compute-diff.js';
import { DiffTree } from './diff-tree.js';
import { InspectorToolbar } from './inspector-toolbar.js';
import { JsonTree } from './json-tree.js';
import { safeStringify } from './safe-stringify.js';
import { monoFont, theme } from './theme.js';
import { useInspectorSnapshot } from './use-inspector-snapshot.js';

/** Props for `Inspector`. */
export interface InspectorProps {
  /** The inspector store to render. */
  inspectorStore: InspectorStore;
}

type MainTab = 'action' | 'state' | 'diff' | 'test';
type ViewMode = 'tree' | 'raw';

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  fontFamily: monoFont,
  fontSize: 12,
  color: theme.text,
  background: theme.background,
};

const bodyStyle: CSSProperties = { flex: 1, display: 'flex', minHeight: 0 };

const mainStyle: CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 };

const tabBarStyle: CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: '4px 8px 0',
  borderBottom: `1px solid ${theme.border}`,
};

function tabButtonStyle(active: boolean): CSSProperties {
  return {
    background: active ? theme.panelBackground : 'transparent',
    color: active ? theme.text : theme.textMuted,
    border: 'none',
    borderBottom: active ? `2px solid ${theme.accent}` : '2px solid transparent',
    padding: '6px 12px',
    fontFamily: monoFont,
    fontSize: 12,
    cursor: 'pointer',
  };
}

const viewToggleStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '4px 8px',
  borderBottom: `1px solid ${theme.border}`,
};

function viewButtonStyle(active: boolean): CSSProperties {
  return {
    background: active ? theme.buttonBackgroundActive : theme.buttonBackground,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: '2px 8px',
    fontFamily: monoFont,
    fontSize: 10,
    cursor: 'pointer',
  };
}

const contentStyle: CSSProperties = { flex: 1, overflow: 'auto', padding: 10 };

const emptyStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.textFaint,
};

const errorBannerStyle: CSSProperties = {
  background: '#2a1212',
  color: theme.removed,
  padding: '6px 10px',
  marginBottom: 8,
  borderRadius: 4,
  fontSize: 11,
};

function testSnippet(action: unknown, prevState: unknown, nextState: unknown): string {
  return [
    '// Test tab: a starting point for a regression test against this exact transition.',
    `const prevState = ${safeStringify(prevState)};`,
    `const action = ${safeStringify(action)};`,
    `const nextState = reducer(prevState, action);`,
    '',
    `expect(nextState).toEqual(${safeStringify(nextState)});`,
  ].join('\n');
}

/**
 * The full devtools Inspector — connection picker, command toolbar, a filterable action list,
 * and an Action/State/Diff/Test tabbed panel with Tree/Raw view modes. Clicking an action in the
 * list jumps the live store to that point in history; the toolbar exposes
 * Reset/Revert/Sweep/Commit/Lock/Pause/Export/Import/Print.
 * @param props - The inspector store to render.
 * @param props.inspectorStore - The inspector store to render.
 * @returns The inspector element.
 */
export function Inspector({ inspectorStore }: InspectorProps): JSX.Element {
  const snapshot = useInspectorSnapshot(inspectorStore);
  const connectionNames = useMemo(() => Object.keys(snapshot.connections), [snapshot.connections]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const activeName = selected !== undefined && connectionNames.includes(selected) ? selected : connectionNames[0];
  const liftedState = activeName !== undefined ? snapshot.connections[activeName] : undefined;

  const [tab, setTab] = useState<MainTab>('state');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  if (activeName === undefined || liftedState === undefined) {
    return (
      <div style={containerStyle}>
        <div style={emptyStyle}>No store has connected yet.</div>
      </div>
    );
  }

  const index = liftedState.currentStateIndex;
  const computed = index === -1 ? undefined : liftedState.computedStates[index];
  const currentState = index === -1 ? liftedState.committedState : computed?.state ?? liftedState.committedState;
  const previousState =
    index <= 0 ? liftedState.committedState : liftedState.computedStates[index - 1]?.state ?? liftedState.committedState;
  const actionId = index === -1 ? undefined : liftedState.stagedActionIds[index];
  const currentAction = actionId === undefined ? { type: '@@INIT' } : liftedState.actionsById[actionId]?.action;
  const diffNodes = useMemo(() => computeDiff(previousState, currentState), [previousState, currentState]);

  return (
    <div style={containerStyle}>
      <InspectorToolbar
        inspectorStore={inspectorStore}
        connectionNames={connectionNames}
        activeName={activeName}
        onSelectConnection={setSelected}
        liftedState={liftedState}
      />
      <div style={bodyStyle}>
        <ActionList
          liftedState={liftedState}
          onSelectIndex={(nextIndex) => {
            inspectorStore.jumpToState(activeName, nextIndex);
          }}
          onToggleAction={(actionIdToToggle) => {
            inspectorStore.toggleAction(activeName, actionIdToToggle);
          }}
        />
        <div style={mainStyle}>
          <div style={tabBarStyle}>
            {(['action', 'state', 'diff', 'test'] as const).map((candidate) => (
              <button
                key={candidate}
                type="button"
                style={tabButtonStyle(tab === candidate)}
                onClick={() => {
                  setTab(candidate);
                }}
              >
                {candidate[0]?.toUpperCase()}
                {candidate.slice(1)}
              </button>
            ))}
          </div>
          {tab !== 'test' && (
            <div style={viewToggleStyle}>
              <button
                type="button"
                style={viewButtonStyle(viewMode === 'tree')}
                onClick={() => {
                  setViewMode('tree');
                }}
              >
                Tree
              </button>
              <button
                type="button"
                style={viewButtonStyle(viewMode === 'raw')}
                onClick={() => {
                  setViewMode('raw');
                }}
              >
                Raw
              </button>
            </div>
          )}
          <div style={contentStyle}>
            {computed?.error !== undefined && (
              <div style={errorBannerStyle}>Reducer threw while computing this state: {computed.error}</div>
            )}
            {tab === 'action' &&
              (viewMode === 'tree' ? (
                <JsonTree value={currentAction} />
              ) : (
                <pre style={{ margin: 0 }}>{safeStringify(currentAction)}</pre>
              ))}
            {tab === 'state' &&
              (viewMode === 'tree' ? (
                <JsonTree value={currentState} />
              ) : (
                <pre style={{ margin: 0 }}>{safeStringify(currentState)}</pre>
              ))}
            {tab === 'diff' &&
              (viewMode === 'tree' ? (
                <DiffTree nodes={diffNodes} />
              ) : (
                <pre style={{ margin: 0 }}>{safeStringify(diffNodes)}</pre>
              ))}
            {tab === 'test' && <pre style={{ margin: 0 }}>{testSnippet(currentAction, previousState, currentState)}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}
