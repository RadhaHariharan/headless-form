import { useSyncExternalStore } from "react";
import { toolkitCounterStore, type ToolkitRootState } from "./toolkit-counter-store";

export function useToolkitCounterStore(): ToolkitRootState {
  return useSyncExternalStore(
    toolkitCounterStore.subscribe,
    toolkitCounterStore.getState,
    toolkitCounterStore.getState,
  );
}
