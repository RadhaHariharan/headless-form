"use client"

import { create } from "@headlesskit/state-management-simplify-react";
import CodePreview from "./components/CodePreview";
import Details from "./components/Details";
import "./zustand-demo.css";

interface CounterStore {
  count: number;
  inc: () => void;
}

// Ported from Zustand's demo (https://zustand-demo.pmnd.rs/) using
// @headlesskit/state-management-simplify-react in place of zustand itself —
// see /NOTICE.md for attribution. The original 3D parallax bear scene was
// dropped (pure decoration, no state-management logic in it); everything
// here demonstrates the package: this Counter, and CodePreview's own store.
const useStore = create<CounterStore>()((set) => ({
  count: 1,
  inc: () => set((state) => ({ count: state.count + 1 })),
}));

function Counter() {
  const { count, inc } = useStore();
  return (
    <div className="counter">
      <span>{count}</span>
      <button onClick={inc}>one up</button>
    </div>
  );
}

export default function ZustandDemo() {
  return (
    <div className="zustandDemoPage">
      <div className="main">
        <div className="code">
          <div className="code-container">
            <CodePreview />
            <Counter />
          </div>
        </div>
        <Details />
      </div>
    </div>
  );
}
