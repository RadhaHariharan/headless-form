import type { CreateDockStoreOptions } from './create-dock-store.js';
import { createDockStore } from './create-dock-store.js';
import { createDevtoolsExtension } from './create-devtools-extension.js';
import { createInspectorStore } from './create-inspector-store.js';
import type { DevtoolsExtension, DevtoolsExtensionCompose, DockStore, InspectorStore } from './types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmenting the global `Window` interface requires `interface`, not `type`
  interface Window {
    /** Populated by `installDevtools` — read by `@headlesskit/state-management-simplify`'s `devtools` middleware. */
    __HEADLESSKIT_DEVTOOLS_EXTENSION__?: DevtoolsExtension;
    /** Populated by `installDevtools` — read by `@headlesskit/state-management-toolkit`'s `composeWithDevTools`. */
    __HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__?: DevtoolsExtensionCompose;
  }
}

/** Options for `installDevtools`. */
export interface InstallDevtoolsOptions {
  /** How many staged actions to keep per connection before folding the oldest into the committed baseline. Defaults to 200. */
  maxActionsPerConnection?: number;
  /** Initial dock panel UI state. */
  dock?: CreateDockStoreOptions;
}

/** The stores returned by `installDevtools`, for a UI (e.g. `@headlesskit/state-management-devtools-react`) to render. */
export interface DevtoolsInstance {
  /** The recorded, time-travel-capable action history, across every connected store. */
  inspectorStore: InspectorStore;
  /** The dock panel's open/closed, position, and size state. */
  dockStore: DockStore;
}

/**
 * Populates `window.__HEADLESSKIT_DEVTOOLS_EXTENSION__` and
 * `window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__` so that
 * `@headlesskit/state-management-toolkit`'s `configureStore` and
 * `@headlesskit/state-management-simplify`'s `devtools` middleware both connect to the same
 * in-memory log, and returns the stores a UI can render.
 *
 * Call this once, before any store is created — the connector globals must already exist when
 * `configureStore`/`devtools(...)` look for them. On the server (no `window`), this is a no-op
 * that still returns usable, empty stores.
 * @param options - History size and initial dock state.
 * @returns The inspector and dock stores to pass to a devtools UI.
 */
export function installDevtools(options: InstallDevtoolsOptions = {}): DevtoolsInstance {
  const inspectorStore = createInspectorStore(options.maxActionsPerConnection);
  const dockStore = createDockStore(options.dock);

  if (typeof window !== 'undefined') {
    const { extension, compose } = createDevtoolsExtension(inspectorStore);
    window.__HEADLESSKIT_DEVTOOLS_EXTENSION__ = extension;
    window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__ = compose;
  }

  return { inspectorStore, dockStore };
}
