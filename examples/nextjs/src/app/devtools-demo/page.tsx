"use client";

import { DevtoolsPanel } from "@headlesskit/state-management-devtools-react";
import { inspectorStore, dockStore } from "./devtools-setup";
import { decrement, increment, toolkitCounterStore } from "./toolkit-counter-store";
import { useToolkitCounterStore } from "./use-toolkit-counter-store";
import { useSimplifyCounterStore } from "./simplify-counter-store";
import "./devtools-demo.css";

export default function DevtoolsDemo() {
  const toolkitState = useToolkitCounterStore();
  const { count, increment: simplifyIncrement, decrement: simplifyDecrement } = useSimplifyCounterStore();

  return (
    <div className="devtoolsDemoPage">
      <h1>state-management-devtools demo</h1>
      <p className="intro">
        Both counters below connect to the same time-travel <code>Inspector</code>{" "}
        (docked on the right — click the floating &ldquo;Devtools&rdquo; button if it&apos;s
        closed). Dispatch a few actions with either counter, then in the panel: click an earlier
        action in the list to jump the <em>live</em> counter back to that value, toggle a
        checkbox to skip an action, or try Sweep / Commit / Reset.
      </p>

      <div className="panels">
        <section className="panel">
          <h2>state-management-toolkit counter</h2>
          <p className="panelNote">
            True reducer replay — skip/jump genuinely re-runs the real reducer through history.
          </p>
          <div className="counter">
            <button onClick={() => toolkitCounterStore.dispatch(decrement())}>-</button>
            <span>{toolkitState.toolkitCounter.value}</span>
            <button onClick={() => toolkitCounterStore.dispatch(increment())}>+</button>
          </div>
        </section>

        <section className="panel">
          <h2>state-management-simplify counter</h2>
          <p className="panelNote">
            Patch-based replay — skip/jump re-merges recorded state patches (no reducer to call).
          </p>
          <div className="counter">
            <button onClick={simplifyDecrement}>-</button>
            <span>{count}</span>
            <button onClick={simplifyIncrement}>+</button>
          </div>
        </section>
      </div>

      <DevtoolsPanel inspectorStore={inspectorStore} dockStore={dockStore} />
    </div>
  );
}
