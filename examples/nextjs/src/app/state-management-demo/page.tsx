"use client";

import { decrement, increment, counterStore } from "./counterStore";
import { useCounterStore } from "./useCounterStore";
import "./state-management-demo.css";

export default function StateManagementDemo() {
  const state = useCounterStore();

  return (
    <div className="stateManagementDemoPage">
      <h1>state-management-toolkit demo</h1>
      <p className="intro">
        Plain <code>configureStore</code> + <code>createSlice</code>, no
        DevTools wiring — just the framework-agnostic store and a{" "}
        <code>useSyncExternalStore</code> hook.
      </p>
      <div className="panel">
        <div className="counter">
          <button onClick={() => counterStore.dispatch(decrement())}>-</button>
          <span>{state.counter.value}</span>
          <button onClick={() => counterStore.dispatch(increment())}>+</button>
        </div>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>
    </div>
  );
}
