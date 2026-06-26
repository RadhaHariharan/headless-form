# @headlesskit/state-management-devtools

A full time-travel dev-tools connector for headlesskit state-management stores — records the
complete action history in memory and lets a UI jump, skip, sweep, commit, or replay it, no
browser extension required.

## Install

```bash
npm install @headlesskit/state-management-devtools
# or
pnpm add @headlesskit/state-management-devtools
# or
yarn add @headlesskit/state-management-devtools
```

## Why this exists

`@headlesskit/state-management-toolkit`'s `configureStore` and `@headlesskit/state-management-simplify`'s
`devtools` middleware both look for a connector on `window.__HEADLESSKIT_DEVTOOLS_EXTENSION__`
(and, for the toolkit, `window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__`) — but neither package
ships a connector itself. This package is that connector: call `installDevtools()` once, before
any store is created, and every subsequent `configureStore`/`devtools(...)` call automatically
connects to the same time-travel-capable history.

It's framework-agnostic — no React, no UI. For an actual panel to render the history, see
[`@headlesskit/state-management-devtools-react`](../state-management-devtools-react).

### True time-travel, not just a log

For a `configureStore` (reducer-based) store, the connector "lifts" the store: it replays the
recorded action history through the real reducer to compute state at any point, the same
technique real Redux DevTools time-travel uses — so jumping to a previous action changes what the
live store's `getState()` returns, not a disconnected copy. For a `state-management-simplify`
(zustand-style) store, there's no reducer to replay — the connector instead replays a shallow
key-level patch derived from each recorded state transition, and pushes the result back into the
live store via that package's `devtools` middleware (which already implements the receiving end
of this protocol).

## Quick start

Call `installDevtools()` once, **before** any store is created — `configureStore`/`devtools(...)`
read the connector globals at store-creation time, so installing the connector afterward means
that store never connects.

```typescript
// devtools-setup.ts — import this before creating any store
import { installDevtools } from '@headlesskit/state-management-devtools';

export const { inspectorStore, dockStore } = installDevtools();
```

```typescript
// store.ts
import './devtools-setup'; // must run first
import { configureStore } from '@headlesskit/state-management-toolkit';

export const store = configureStore({ reducer: rootReducer });
// store.dispatch(...) now records into inspectorStore automatically
```

Render it with [`@headlesskit/state-management-devtools-react`](../state-management-devtools-react)'s
`<DevtoolsPanel inspectorStore={inspectorStore} dockStore={dockStore} />`, or read
`inspectorStore.getSnapshot()`/`dockStore.getSnapshot()` directly to build your own UI.

## API

| Export | Description |
|--------|--------------|
| `installDevtools(options?)` | Populates both connector globals and returns `{ inspectorStore, dockStore }`. Call once, before any store is created. |
| `createInspectorStore(maxActionsPerConnection?)` | Builds a standalone inspector store, if you want to wire the connector up yourself instead of using `installDevtools`. |
| `createDockStore(options?)` | Builds a standalone dock UI-state store (open/closed, position, size). |
| `createDevtoolsExtension(inspectorStore)` | Builds the raw `{ extension, compose }` connector pair from an inspector store. |
| `applyLiftedAction`, `recomputeStates`, `createInitialLiftedState`, `getEffectiveState`, `diffShallowPatch`, `patchStep`, `capLiftedState` | The lifted-state engine's pure functions — useful for building a custom UI or tooling on top of the same history model. |

`InspectorStore` (returned by `createInspectorStore`/`installDevtools`) exposes one method per
time-travel command: `jumpToState`, `jumpToAction`, `toggleAction`, `sweep`, `commit`, `reset`,
`rollback`, `revert`, `pause`, `lock`, `importState`, plus `getSnapshot`/`subscribe`/`clear`.

See [the full docs](../../docs/state-management-devtools/01-overview.mdx) for the connector
contract, the lifted-state model, and SSR notes.

## Common pitfalls

- **Install before creating any store.** `configureStore`/`devtools(...)` read the connector
  globals once, at store-creation time — installing the connector afterward means that store
  never connects.
- **`state-management-simplify` time-travel is patch-based, not reducer-based.** Skipping or
  reverting an action recomputes state by re-merging the shallow patches of every other action —
  exact for the common "set a few top-level fields" pattern, but a reducer-less store has no way
  to "undo" an update expressed as a relative change (e.g. `count: prev.count + 1`) the way a real
  reducer replay can.
- **The history is in-memory only** — it resets on page reload, and staged actions are capped per
  connection (`maxActionsPerConnection`, default 200); past the cap, the oldest actions are folded
  into the committed baseline rather than dropped, so the current state stays correct.

## License

MIT — see [LICENSE](../../LICENSE) for details.
