import { applyLiftedAction, capLiftedState, createInitialLiftedState } from './lifted-state.js';
import type { InspectorSnapshot, InspectorStore, LiftedAction, LiftedState, StepFn } from './types.js';

/** A connection's raw apply/read handle, used internally by the devtools connector. */
export interface InspectorConnectionHandle {
  /**
   * Applies a command directly, without notifying any registered control listener. Used by the
   * connector for forward recording (`PERFORM_ACTION`); UI-driven commands go through
   * `InspectorStoreController`'s public methods instead, which also notify the control listener.
   * @param action - The command to apply.
   * @returns Nothing.
   */
  dispatch: (action: LiftedAction) => void;
  /**
   * Reads this connection's current lifted state.
   * @returns The current lifted state.
   */
  getLiftedState: () => LiftedState;
}

/** An `InspectorStore` plus the registration hooks used internally by the devtools connector. */
export interface InspectorStoreController extends InspectorStore {
  /**
   * Registers a new connection.
   * @param connectionName - The connection's name.
   * @param initialState - The connection's true initial state, used as the first `committedState`.
   * @param step - Computes the next state from the previous state and a recorded entry.
   * @returns A handle for the connector to record actions through.
   */
  registerConnection: (connectionName: string, initialState: unknown, step: StepFn) => InspectorConnectionHandle;
  /**
   * Registers (or clears) a callback invoked after a UI-driven command changes a connection's
   * lifted state — this is the hook a `connect()`-based connection uses to forward time-travel
   * commands into a live store that has no reducer of its own to replay.
   * @param connectionName - The connection to listen on.
   * @param callback - Called with the new lifted state and the command that produced it. Pass
   *   `undefined` to remove a previously registered callback.
   * @returns Nothing.
   */
  setControlListener: (
    connectionName: string,
    callback?: (liftedState: LiftedState, action: LiftedAction) => void,
  ) => void;
}

const DEFAULT_MAX_ACTIONS_PER_CONNECTION = 200;

/**
 * Creates a framework-agnostic store of every connection's lifted (time-travel-capable) state.
 * @param maxActionsPerConnection - How many staged actions to keep per connection before folding
 *   the oldest into the committed baseline. Defaults to 200.
 * @returns An `InspectorStoreController` — an `InspectorStore` for UI consumption, plus the
 *   registration hooks the devtools connector uses to wire up connections.
 */
export function createInspectorStore(
  maxActionsPerConnection: number = DEFAULT_MAX_ACTIONS_PER_CONNECTION,
): InspectorStoreController {
  let connections: Record<string, LiftedState> = {};
  let snapshot: InspectorSnapshot = { connections };
  const listeners = new Set<() => void>();
  const steps = new Map<string, StepFn>();
  const liftedStates = new Map<string, LiftedState>();
  const initialStates = new Map<string, unknown>();
  const controlListeners = new Map<string, (liftedState: LiftedState, action: LiftedAction) => void>();

  function notify(): void {
    listeners.forEach((listener) => {
      listener();
    });
  }

  function setConnectionState(connectionName: string, liftedState: LiftedState): void {
    const capped = capLiftedState(liftedState, maxActionsPerConnection);
    liftedStates.set(connectionName, capped);
    connections = { ...connections, [connectionName]: capped };
    snapshot = { connections };
    notify();
  }

  function registerConnection(
    connectionName: string,
    initialState: unknown,
    step: StepFn,
  ): InspectorConnectionHandle {
    initialStates.set(connectionName, initialState);
    steps.set(connectionName, step);
    setConnectionState(connectionName, createInitialLiftedState(initialState));

    function dispatch(action: LiftedAction): void {
      const current = liftedStates.get(connectionName) ?? createInitialLiftedState(initialState);
      const initial = initialStates.get(connectionName) ?? initialState;
      setConnectionState(connectionName, applyLiftedAction(current, action, step, initial));
    }

    return {
      dispatch,
      getLiftedState: () => liftedStates.get(connectionName) ?? createInitialLiftedState(initialState),
    };
  }

  function dispatchTo(connectionName: string, action: LiftedAction): void {
    const liftedState = liftedStates.get(connectionName);
    const step = steps.get(connectionName);
    const initial = initialStates.get(connectionName);
    if (liftedState === undefined || step === undefined) return;
    const next = applyLiftedAction(liftedState, action, step, initial);
    setConnectionState(connectionName, next);
    controlListeners.get(connectionName)?.(next, action);
  }

  function setControlListener(
    connectionName: string,
    callback?: (liftedState: LiftedState, action: LiftedAction) => void,
  ): void {
    if (callback === undefined) {
      controlListeners.delete(connectionName);
    } else {
      controlListeners.set(connectionName, callback);
    }
  }

  function clear(connectionName?: string): void {
    if (connectionName === undefined) {
      connections = {};
      liftedStates.clear();
      steps.clear();
      initialStates.clear();
      controlListeners.clear();
    } else {
      connections = Object.fromEntries(
        Object.entries(connections).filter(([key]) => key !== connectionName),
      );
      liftedStates.delete(connectionName);
      steps.delete(connectionName);
      initialStates.delete(connectionName);
      controlListeners.delete(connectionName);
    }
    snapshot = { connections };
    notify();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return function unsubscribe(): void {
        listeners.delete(listener);
      };
    },
    jumpToState(connectionName, index): void {
      dispatchTo(connectionName, { type: 'JUMP_TO_STATE', index });
    },
    jumpToAction(connectionName, actionId): void {
      dispatchTo(connectionName, { type: 'JUMP_TO_ACTION', id: actionId });
    },
    toggleAction(connectionName, actionId): void {
      dispatchTo(connectionName, { type: 'TOGGLE_ACTION', id: actionId });
    },
    sweep(connectionName): void {
      dispatchTo(connectionName, { type: 'SWEEP' });
    },
    commit(connectionName): void {
      dispatchTo(connectionName, { type: 'COMMIT' });
    },
    reset(connectionName): void {
      dispatchTo(connectionName, { type: 'RESET' });
    },
    rollback(connectionName): void {
      dispatchTo(connectionName, { type: 'ROLLBACK' });
    },
    revert(connectionName): void {
      dispatchTo(connectionName, { type: 'REVERT' });
    },
    pause(connectionName, paused): void {
      dispatchTo(connectionName, { type: 'PAUSE_RECORDING', paused });
    },
    lock(connectionName, locked): void {
      dispatchTo(connectionName, { type: 'LOCK_CHANGES', locked });
    },
    importState(connectionName, liftedState): void {
      dispatchTo(connectionName, { type: 'IMPORT_STATE', liftedState });
    },
    clear,
    registerConnection,
    setControlListener,
  };
}
