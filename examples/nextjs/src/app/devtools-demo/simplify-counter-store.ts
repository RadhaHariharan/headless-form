import "./devtools-setup"; // must run first
import { create } from "@headlesskit/state-management-simplify-react";
import { devtools } from "@headlesskit/state-management-simplify";

interface SimplifyCounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

// devtools() looks for window.__HEADLESSKIT_DEVTOOLS_EXTENSION__, populated by
// devtools-setup.ts above — this connects to the same Inspector as the
// toolkit counter, just via patch-based replay instead of true reducer replay
// (this package has no reducer to call).
export const useSimplifyCounterStore = create<SimplifyCounterStore>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
    }),
    { name: "simplifyCounter" },
  ),
);
