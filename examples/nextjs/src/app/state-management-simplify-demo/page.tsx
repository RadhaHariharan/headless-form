"use client"

import { create } from "@headlesskit/state-management-simplify-react";
import CodePreview from "./components/CodePreview";
import Details from "./components/Details";
import "./state-demo.css";

interface CounterStore {
  count: number;
  inc: () => void;
}

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

export default function StateDemo() {
  return (
    <div className="stateDemoPage">
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
