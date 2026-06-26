import type { CSSProperties, JSX } from 'react';
import { useRef, useState } from 'react';
import type { InspectorStore, LiftedState } from '@headlesskit/state-management-devtools';
import { exportLiftedState, importLiftedState } from './export-import.js';
import { monoFont, theme } from './theme.js';

/** Props for `InspectorToolbar`. */
export interface InspectorToolbarProps {
  /** The inspector store to issue commands against. */
  inspectorStore: InspectorStore;
  /** Every connected store's name. */
  connectionNames: string[];
  /** The currently selected connection. */
  activeName: string | undefined;
  /** Called when the user picks a different connection. */
  onSelectConnection: (name: string) => void;
  /** The active connection's lifted state, for toggling Record/Lock button states. */
  liftedState: LiftedState | undefined;
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 8px',
  borderBottom: `1px solid ${theme.border}`,
  fontFamily: monoFont,
  fontSize: 12,
  flexWrap: 'wrap',
};

function buttonStyle(active = false): CSSProperties {
  return {
    background: active ? theme.buttonBackgroundActive : theme.buttonBackground,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: '3px 8px',
    fontFamily: monoFont,
    fontSize: 11,
    cursor: 'pointer',
  };
}

const selectStyle: CSSProperties = {
  background: theme.panelBackground,
  color: theme.text,
  border: `1px solid ${theme.border}`,
  borderRadius: 4,
  fontFamily: monoFont,
  fontSize: 11,
  padding: '3px 4px',
};

const spacerStyle: CSSProperties = { flex: 1 };

/**
 * The Inspector's command toolbar — connection picker, then Record/Lock toggles and the
 * Reset/Revert/Sweep/Commit/Export/Import/Print/Clear actions.
 * @param props - The inspector store, connections, and the active connection's lifted state.
 * @param props.inspectorStore - The inspector store to issue commands against.
 * @param props.connectionNames - Every connected store's name.
 * @param props.activeName - The currently selected connection.
 * @param props.onSelectConnection - Called when the user picks a different connection.
 * @param props.liftedState - The active connection's lifted state, for toggling Record/Lock button states.
 * @returns The toolbar element.
 */
export function InspectorToolbar({
  inspectorStore,
  connectionNames,
  activeName,
  onSelectConnection,
  liftedState,
}: InspectorToolbarProps): JSX.Element {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | undefined>(undefined);

  return (
    <div style={toolbarStyle}>
      {connectionNames.length > 1 && (
        <select
          value={activeName}
          onChange={(event) => {
            onSelectConnection(event.target.value);
          }}
          aria-label="Connection"
          style={selectStyle}
        >
          {connectionNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        style={buttonStyle(liftedState?.isPaused)}
        disabled={activeName === undefined}
        title={liftedState?.isPaused ? 'Resume recording' : 'Pause recording'}
        onClick={() => {
          if (activeName !== undefined) inspectorStore.pause(activeName, !(liftedState?.isPaused ?? false));
        }}
      >
        {liftedState?.isPaused ? '▶ Record' : '⏸ Pause'}
      </button>
      <button
        type="button"
        style={buttonStyle(liftedState?.isLocked)}
        disabled={activeName === undefined}
        title={liftedState?.isLocked ? 'Unlock (auto-follow new actions)' : 'Lock (stay on the viewed state)'}
        onClick={() => {
          if (activeName !== undefined) inspectorStore.lock(activeName, !(liftedState?.isLocked ?? false));
        }}
      >
        {liftedState?.isLocked ? '🔒 Locked' : '🔓 Lock'}
      </button>
      <button
        type="button"
        style={buttonStyle()}
        disabled={activeName === undefined}
        title="Discard history and replay from the original initial state"
        onClick={() => {
          if (activeName !== undefined) inspectorStore.reset(activeName);
        }}
      >
        Reset
      </button>
      <button
        type="button"
        style={buttonStyle()}
        disabled={activeName === undefined || liftedState?.stagedActionIds.length === 0}
        title="Undo the most recently dispatched action"
        onClick={() => {
          if (activeName !== undefined) inspectorStore.revert(activeName);
        }}
      >
        Revert
      </button>
      <button
        type="button"
        style={buttonStyle()}
        disabled={activeName === undefined || liftedState?.skippedActionIds.length === 0}
        title="Permanently remove every skipped action"
        onClick={() => {
          if (activeName !== undefined) inspectorStore.sweep(activeName);
        }}
      >
        Sweep
      </button>
      <button
        type="button"
        style={buttonStyle()}
        disabled={activeName === undefined}
        title="Fold the viewed state into the committed baseline"
        onClick={() => {
          if (activeName !== undefined) inspectorStore.commit(activeName);
        }}
      >
        Commit
      </button>
      <div style={spacerStyle} />
      <button
        type="button"
        style={buttonStyle()}
        disabled={activeName === undefined || liftedState === undefined}
        title="Download this connection's history as JSON"
        onClick={() => {
          if (activeName !== undefined && liftedState !== undefined) exportLiftedState(activeName, liftedState);
        }}
      >
        Export
      </button>
      <button
        type="button"
        style={buttonStyle()}
        disabled={activeName === undefined}
        title="Import a previously exported history"
        onClick={() => {
          importInputRef.current?.click();
        }}
      >
        Import
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file === undefined || activeName === undefined) return;
          importLiftedState(file)
            .then((imported) => {
              inspectorStore.importState(activeName, imported);
              setImportError(undefined);
            })
            .catch(() => {
              setImportError(`"${file.name}" is not a valid exported history file.`);
            });
        }}
      />
      <button
        type="button"
        style={buttonStyle()}
        title="Print this panel"
        onClick={() => {
          window.print();
        }}
      >
        Print
      </button>
      <button
        type="button"
        style={buttonStyle()}
        disabled={activeName === undefined}
        title="Remove this connection from the inspector"
        onClick={() => {
          if (activeName !== undefined) inspectorStore.clear(activeName);
        }}
      >
        Clear
      </button>
      {importError !== undefined && <span style={{ color: theme.removed }}>{importError}</span>}
    </div>
  );
}
