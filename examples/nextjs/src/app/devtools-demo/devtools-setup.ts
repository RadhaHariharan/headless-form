import { installDevtools } from "@headlesskit/state-management-devtools";

// Side-effecting module — must be imported before any store is created, since
// configureStore/devtools(...) read window.__HEADLESSKIT_DEVTOOLS_EXTENSION__
// at store-creation time.
export const { inspectorStore, dockStore } = installDevtools({
  dock: { isOpen: true, position: "right", size: 440 },
});
