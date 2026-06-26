import type { InspectorStoreController } from './create-inspector-store.js';
import { diffShallowPatch, getEffectiveState, patchStep } from './lifted-state.js';
import type {
  DevtoolsConnection,
  DevtoolsExtension,
  DevtoolsExtensionCompose,
  DevtoolsExtensionConfig,
  DevtoolsMessage,
  GenericStoreCreator,
  GenericStoreEnhancer,
  LiftedState,
} from './types.js';

let anonymousConnectionCount = 0;

function connectionName(config: DevtoolsExtensionConfig): string {
  if (config.name !== undefined) return config.name;
  anonymousConnectionCount += 1;
  return `connection-${anonymousConnectionCount.toString()}`;
}

/**
 * Translates a UI-driven lifted-state change into the `{ type: 'DISPATCH', ... }` message format
 * `state-management-simplify`'s `devtools` middleware already parses — that middleware has no
 * reducer to replay against, so every command besides reset/commit/pause resolves to "set the
 * live store to this computed state" rather than a command it needs to interpret itself.
 * @param liftedState - The connection's lifted state after the command was applied.
 * @param controlActionType - The `LiftedAction['type']` that triggered this change.
 * @param listener - The connection's registered message listener to forward into.
 */
function forwardControlMessage(
  liftedState: LiftedState,
  controlActionType: string,
  listener: (message: DevtoolsMessage) => void,
): void {
  if (controlActionType === 'RESET' || controlActionType === 'COMMIT' || controlActionType === 'PAUSE_RECORDING') {
    listener({ type: 'DISPATCH', payload: { type: controlActionType } });
  } else {
    listener({
      type: 'DISPATCH',
      payload: { type: 'JUMP_TO_STATE' },
      state: JSON.stringify(getEffectiveState(liftedState)),
    });
  }
}

function createConnection(inspectorStore: InspectorStoreController, name: string): DevtoolsConnection {
  let handle: ReturnType<InspectorStoreController['registerConnection']> | undefined;

  function ensureHandle(initialState: unknown): ReturnType<InspectorStoreController['registerConnection']> {
    handle ??= inspectorStore.registerConnection(name, initialState, patchStep);
    return handle;
  }

  return {
    init: function init(state: unknown): void {
      ensureHandle(state);
    },
    send: function send(action: unknown, state: unknown): void {
      const connectionHandle = ensureHandle(state);
      const prevState = getEffectiveState(connectionHandle.getLiftedState());
      const patch = diffShallowPatch(prevState, state);
      connectionHandle.dispatch({ type: 'PERFORM_ACTION', action, timestamp: Date.now(), meta: { patch } });
    },
    subscribe: function subscribe(listener: (message: DevtoolsMessage) => void): () => void {
      inspectorStore.setControlListener(name, (liftedState, controlAction) => {
        forwardControlMessage(liftedState, controlAction.type, listener);
      });
      return function unsubscribeListener(): void {
        inspectorStore.setControlListener(name, undefined);
      };
    },
    unsubscribe: function unsubscribe(): void {
      inspectorStore.setControlListener(name, undefined);
    },
  };
}

function composeStoreEnhancers(...enhancers: GenericStoreEnhancer[]): GenericStoreEnhancer {
  return function composed(next: GenericStoreCreator): GenericStoreCreator {
    let wrapped = next;
    for (const enhancer of [...enhancers].reverse()) {
      wrapped = enhancer(wrapped);
    }
    return wrapped;
  };
}

/**
 * Builds the store enhancer used for reducer-based stores (e.g.
 * `@headlesskit/state-management-toolkit`'s `configureStore`). The enhancer reads the store's
 * true initial state once, then hands every subsequent `dispatch`/`getState`/`subscribe` call to
 * the lifted-state engine — the same "lifted store" technique real Redux DevTools time-travel is
 * built on, since a plain reducer-based store has no generic "set state to X" API of its own.
 * @param inspectorStore - The inspector store to register this connection with.
 * @param config - Connection configuration.
 * @returns A store enhancer that lifts the store into a time-travel-capable one.
 */
function buildEnhancer(inspectorStore: InspectorStoreController, config: DevtoolsExtensionConfig): GenericStoreEnhancer {
  const name = connectionName(config);
  return function devtoolsEnhancer(next: GenericStoreCreator): GenericStoreCreator {
    return function createDevtoolsConnectedStore(
      reducer: unknown,
      preloadedState?: unknown,
      enhancer?: unknown,
    ): ReturnType<GenericStoreCreator> {
      const baseStore = next(reducer, preloadedState, enhancer);
      const step = (state: unknown, entry: { action: unknown }): unknown =>
        (reducer as (s: unknown, a: unknown) => unknown)(state, entry.action);
      const handle = inspectorStore.registerConnection(name, baseStore.getState(), step);
      const listeners = new Set<() => void>();

      function notifyApp(): void {
        listeners.forEach((listener) => {
          listener();
        });
      }

      return {
        ...baseStore,
        getState: function getState(): unknown {
          return getEffectiveState(handle.getLiftedState());
        },
        dispatch: function dispatchAndRecord(action: unknown): unknown {
          handle.dispatch({ type: 'PERFORM_ACTION', action, timestamp: Date.now() });
          notifyApp();
          return action;
        },
        subscribe: function subscribe(listener: () => void): () => void {
          listeners.add(listener);
          return function unsubscribeListener(): void {
            listeners.delete(listener);
          };
        },
      };
    };
  };
}

/**
 * Builds the `window.__HEADLESSKIT_DEVTOOLS_EXTENSION__` / `..._COMPOSE__` connector pair, both
 * backed by the given inspector store so connections from `@headlesskit/state-management-toolkit`'s
 * `configureStore` and `@headlesskit/state-management-simplify`'s `devtools` middleware land in
 * the same time-travel-capable log.
 * @param inspectorStore - The inspector store to record connections into.
 * @returns The `extension` object for `window.__HEADLESSKIT_DEVTOOLS_EXTENSION__`, and the
 *   `compose` function for `window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__`.
 */
export function createDevtoolsExtension(inspectorStore: InspectorStoreController): {
  extension: DevtoolsExtension;
  compose: DevtoolsExtensionCompose;
} {
  function connect(config: DevtoolsExtensionConfig = {}): DevtoolsConnection {
    return createConnection(inspectorStore, connectionName(config));
  }

  function extensionCallable(config?: DevtoolsExtensionConfig): GenericStoreEnhancer {
    return buildEnhancer(inspectorStore, config ?? {});
  }

  const extension: DevtoolsExtension = Object.assign(extensionCallable, { connect });

  function compose(...args: unknown[]): unknown {
    const isConfigCall = args.length <= 1 && typeof args[0] !== 'function';
    if (isConfigCall) {
      const config = (args[0] as DevtoolsExtensionConfig | undefined) ?? {};
      return function composeWithConfig(...enhancers: GenericStoreEnhancer[]): GenericStoreEnhancer {
        return composeStoreEnhancers(...enhancers, buildEnhancer(inspectorStore, config));
      };
    }
    return composeStoreEnhancers(...(args as GenericStoreEnhancer[]), buildEnhancer(inspectorStore, {}));
  }

  return { extension, compose: compose as DevtoolsExtensionCompose };
}
