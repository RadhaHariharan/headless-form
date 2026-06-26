/** A single recorded action, paired with metadata used to recompute state during time-travel. */
export interface ActionEntry {
  /** Monotonically increasing id, unique within a single connection's history. */
  id: number;
  /** The dispatched action (a plain `{ type, ... }` object, or the `@@INIT` bootstrap entry). */
  action: unknown;
  /** `Date.now()` at the time the entry was recorded. */
  timestamp: number;
  /**
   * Replay metadata for connections with no reducer to re-run (e.g. a `state-management-simplify`
   * store). `patch` is the shallow key-level diff between the previous and resulting state, used
   * to reconstruct "what the state would be" when an earlier action is skipped or reverted.
   */
  meta?: { patch?: Record<string, unknown> };
}

/** The state computed at one point in a connection's action history. */
export interface ComputedState {
  /** The state after replaying every non-skipped action up to and including this one. */
  state: unknown;
  /** Set when replaying the action at this point threw — `state` is the last good value before it. */
  error?: string;
}

/**
 * The full time-travel record for one connection: every dispatched action, which of them are
 * currently active/skipped, and the state computed at each point — the same model real Redux
 * DevTools calls a "lifted store".
 */
export interface LiftedState {
  /** Every recorded action, keyed by id, including ones removed from `stagedActionIds` by a sweep. */
  actionsById: Record<number, ActionEntry>;
  /** Action ids in dispatch order, excluding whatever has already been folded into `committedState`. */
  stagedActionIds: number[];
  /** Ids (from `stagedActionIds`) currently excluded from state computation. */
  skippedActionIds: number[];
  /** The baseline state every replay starts from — advances on `commit`, resets on `reset`/`rollback`. */
  committedState: unknown;
  /** One entry per `stagedActionIds` index — the state after replaying up to that action. */
  computedStates: ComputedState[];
  /** Index into `computedStates` currently being viewed; `-1` means "show `committedState`". */
  currentStateIndex: number;
  /** The id the next recorded action will receive. */
  nextActionId: number;
  /** When `true`, the displayed index no longer auto-follows new actions (set by jumping to history). */
  isLocked: boolean;
  /** When `true`, newly dispatched actions are ignored — recording is paused. */
  isPaused: boolean;
}

/** A snapshot of every connection's lifted state. */
export interface InspectorSnapshot {
  /** Maps a connection name (a store's `name` option, or an auto-generated id) to its lifted state. */
  connections: Readonly<Record<string, LiftedState>>;
}

/** Computes the next state given the previous state and a recorded entry. */
export type StepFn = (state: unknown, entry: ActionEntry) => unknown;

/** A command applied to a connection's `LiftedState`, mirroring the Redux DevTools control actions. */
export type LiftedAction =
  | { type: 'PERFORM_ACTION'; action: unknown; timestamp: number; meta?: ActionEntry['meta'] }
  | { type: 'RESET' }
  | { type: 'COMMIT' }
  | { type: 'ROLLBACK' }
  | { type: 'REVERT' }
  | { type: 'TOGGLE_ACTION'; id: number }
  | { type: 'SWEEP' }
  | { type: 'JUMP_TO_STATE'; index: number }
  | { type: 'JUMP_TO_ACTION'; id: number }
  | { type: 'IMPORT_STATE'; liftedState: LiftedState }
  | { type: 'PAUSE_RECORDING'; paused: boolean }
  | { type: 'LOCK_CHANGES'; locked: boolean };

/** A framework-agnostic store of every connection's lifted state, subscribable for UI rendering. */
export interface InspectorStore {
  /**
   * Returns the current snapshot.
   * @returns The current snapshot of every connection's lifted state.
   */
  getSnapshot: () => InspectorSnapshot;
  /**
   * Registers a listener invoked whenever any connection's lifted state changes.
   * @param listener - Called with no arguments whenever the snapshot changes.
   * @returns A function that removes the listener.
   */
  subscribe: (listener: () => void) => () => void;
  /**
   * Moves the viewed index to a specific computed state.
   * @param connectionName - The connection to act on.
   * @param index - Index into `computedStates`, or `-1` for the committed baseline.
   * @returns Nothing.
   */
  jumpToState: (connectionName: string, index: number) => void;
  /**
   * Moves the viewed index to the state produced by a specific action id.
   * @param connectionName - The connection to act on.
   * @param actionId - The action id to jump to.
   * @returns Nothing.
   */
  jumpToAction: (connectionName: string, actionId: number) => void;
  /**
   * Toggles whether an action id is excluded from state computation.
   * @param connectionName - The connection to act on.
   * @param actionId - The action id to toggle.
   * @returns Nothing.
   */
  toggleAction: (connectionName: string, actionId: number) => void;
  /**
   * Permanently removes every currently-skipped action from history.
   * @param connectionName - The connection to act on.
   * @returns Nothing.
   */
  sweep: (connectionName: string) => void;
  /**
   * Folds the currently viewed state into `committedState` and clears history.
   * @param connectionName - The connection to act on.
   * @returns Nothing.
   */
  commit: (connectionName: string) => void;
  /**
   * Clears history and recomputes from the connection's original initial state.
   * @param connectionName - The connection to act on.
   * @returns Nothing.
   */
  reset: (connectionName: string) => void;
  /**
   * Clears history, keeping the current `committedState`.
   * @param connectionName - The connection to act on.
   * @returns Nothing.
   */
  rollback: (connectionName: string) => void;
  /**
   * Removes the most recently dispatched action from history.
   * @param connectionName - The connection to act on.
   * @returns Nothing.
   */
  revert: (connectionName: string) => void;
  /**
   * Pauses or resumes recording new actions.
   * @param connectionName - The connection to act on.
   * @param paused - Whether recording should be paused.
   * @returns Nothing.
   */
  pause: (connectionName: string, paused: boolean) => void;
  /**
   * Locks or unlocks the viewed index against auto-following new actions.
   * @param connectionName - The connection to act on.
   * @param locked - Whether the view should be locked.
   * @returns Nothing.
   */
  lock: (connectionName: string, locked: boolean) => void;
  /**
   * Replaces a connection's lifted state wholesale (e.g. from an imported file).
   * @param connectionName - The connection to act on.
   * @param liftedState - The lifted state to import.
   * @returns Nothing.
   */
  importState: (connectionName: string, liftedState: LiftedState) => void;
  /**
   * Removes connections entirely.
   * @param connectionName - The connection to remove. Omit to remove every connection.
   * @returns Nothing.
   */
  clear: (connectionName?: string) => void;
}

/** Dock panel position relative to the viewport. */
export type DockPosition = 'bottom' | 'top' | 'left' | 'right';

/** Current dock panel UI state. */
export interface DockStateSnapshot {
  /** Whether the panel is currently visible. */
  isOpen: boolean;
  /** Which edge of the viewport the panel is docked to. */
  position: DockPosition;
  /** Panel thickness in pixels — height when docked top/bottom, width when docked left/right. */
  size: number;
}

/** A framework-agnostic store of dock panel UI state, subscribable for UI rendering. */
export interface DockStore {
  /**
   * Returns the current dock state.
   * @returns The current dock panel state.
   */
  getSnapshot: () => DockStateSnapshot;
  /**
   * Registers a listener invoked whenever the dock state changes.
   * @param listener - Called with no arguments whenever the state changes.
   * @returns A function that removes the listener.
   */
  subscribe: (listener: () => void) => () => void;
  /**
   * Flips `isOpen`.
   * @returns Nothing.
   */
  toggle: () => void;
  /**
   * Sets `isOpen` to `true`.
   * @returns Nothing.
   */
  open: () => void;
  /**
   * Sets `isOpen` to `false`.
   * @returns Nothing.
   */
  close: () => void;
  /**
   * Changes which edge of the viewport the panel is docked to.
   * @param position - The new dock position.
   * @returns Nothing.
   */
  setPosition: (position: DockPosition) => void;
  /**
   * Changes the panel's thickness.
   * @param size - The new size in pixels.
   * @returns Nothing.
   */
  setSize: (size: number) => void;
}

/** Config object a store-level devtools integration passes when connecting. */
export interface DevtoolsExtensionConfig {
  /** The name shown for this connection in the inspector. Defaults to an auto-generated id if omitted. */
  name?: string;
  /** Additional fields accepted for structural compatibility with other devtools-config shapes; ignored by this connector. */
  [key: string]: unknown;
}

/** A message a UI sends back to a connection — used to implement time-travel against a live store. */
export interface DevtoolsMessage {
  /** The message kind, e.g. `'ACTION'` or `'DISPATCH'`. */
  type: string;
  /** The message payload, shape depends on `type`. */
  payload?: unknown;
  /** A serialized state snapshot, present on some message kinds. */
  state?: unknown;
}

/** The connection handle returned by `DevtoolsExtension.connect()`. */
export interface DevtoolsConnection {
  /**
   * Records the connection's initial state.
   * @param state - The store's state at connect time.
   * @returns Nothing.
   */
  init: (state: unknown) => void;
  /**
   * Records a dispatched action and the resulting state.
   * @param action - The dispatched action.
   * @param state - The store's state after the action was applied.
   * @returns Nothing.
   */
  send: (action: unknown, state: unknown) => void;
  /**
   * Registers a listener for messages sent back from a devtools UI — this is the channel
   * time-travel commands (jump/sweep/commit/reset/...) are delivered through.
   * @param listener - Called with each incoming message.
   * @returns A function that removes the listener.
   */
  subscribe: (listener: (message: DevtoolsMessage) => void) => () => void;
  /**
   * Tears down this connection.
   * @returns Nothing.
   */
  unsubscribe: () => void;
}

/** A store, duck-typed against `@headlesskit/state-management`'s store shape without depending on it. */
export interface GenericStore {
  /**
   * Dispatches an action.
   * @param action - The action to dispatch.
   * @returns Whatever the underlying store's dispatch returns.
   */
  dispatch: (action: unknown) => unknown;
  /**
   * Reads the current state.
   * @returns The current state.
   */
  getState: () => unknown;
  /**
   * Subscribes to state changes.
   * @param listener - Called after every dispatched action.
   * @returns A function that removes the listener.
   */
  subscribe: (listener: () => void) => () => void;
}

/** A store creator function, duck-typed against `@headlesskit/state-management`'s `StoreCreator`. */
export type GenericStoreCreator = (
  reducer: unknown,
  preloadedState?: unknown,
  enhancer?: unknown,
) => GenericStore;

/** A store enhancer, duck-typed against `@headlesskit/state-management`'s `StoreEnhancer`. */
export type GenericStoreEnhancer = (next: GenericStoreCreator) => GenericStoreCreator;

/** The `window.__HEADLESSKIT_DEVTOOLS_EXTENSION__` connector contract, read by `@headlesskit/state-management-simplify`'s `devtools` middleware. */
export interface DevtoolsExtension {
  /**
   * The callable form — returns a store enhancer directly, for code that wires up `createStore` by hand.
   * @param config - Connection configuration.
   * @returns A store enhancer that lifts the store into a time-travel-capable one.
   */
  (config?: DevtoolsExtensionConfig): GenericStoreEnhancer;
  /**
   * Opens a named connection.
   * @param config - Connection configuration.
   * @returns The connection handle.
   */
  connect: (config: DevtoolsExtensionConfig) => DevtoolsConnection;
}

/** The `window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__` connector contract, read by `@headlesskit/state-management-toolkit`'s `composeWithDevTools`. */
export interface DevtoolsExtensionCompose {
  /**
   * Called with a config object — returns a `compose`-shaped function that appends the
   * devtools enhancer last (innermost), matching `composeWithDevTools(config)(...enhancers)`.
   * @param config - Connection configuration.
   * @returns A function that composes enhancers with the devtools enhancer innermost.
   */
  (config: DevtoolsExtensionConfig): (...enhancers: GenericStoreEnhancer[]) => GenericStoreEnhancer;
  /**
   * Called directly with enhancers — uses default connection configuration.
   * @param enhancers - Store enhancers to compose, outermost first.
   * @returns The composed enhancer.
   */
  (...enhancers: GenericStoreEnhancer[]): GenericStoreEnhancer;
}
