import { useSyncExternalStore } from "react";
import { counterStore, type RootState } from "./counterStore";

// `configureStore` returns a plain store (no React bindings bundled in
// @headlesskit/state-management-toolkit) — useSyncExternalStore is the
// standard way to subscribe a component to it.
export function useCounterStore(): RootState {
  return useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getState,
    counterStore.getState,
  );
}
