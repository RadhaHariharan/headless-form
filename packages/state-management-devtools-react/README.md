# @headlesskit/state-management-devtools-react

An advanced, Redux-DevTools-style Inspector UI for [`@headlesskit/state-management-devtools`](../state-management-devtools).

## Install

```bash
npm install @headlesskit/state-management-devtools-react @headlesskit/state-management-devtools
# or
pnpm add @headlesskit/state-management-devtools-react @headlesskit/state-management-devtools
# or
yarn add @headlesskit/state-management-devtools-react @headlesskit/state-management-devtools
```

> `react` (>=18) is a peer dependency, resolved against whatever version your app already has.

## Why this exists

`@headlesskit/state-management-devtools` is framework-agnostic — it computes the lifted-state
history, but renders nothing. This package is the React rendering layer on top of it: a dockable
panel (`DockMonitor`) containing the full `Inspector` — a connection picker, a command toolbar
(Record/Lock, Reset/Revert/Sweep/Commit, Export/Import/Print), a filterable action list, and an
Action/State/Diff/Test tabbed panel with Tree and Raw view modes — plus the hooks
(`useInspectorSnapshot`, `useDockSnapshot`) and the lower-level pieces (`JsonTree`, `DiffTree`,
`computeDiff`) if you want to build a custom UI against the same stores.

## Quick start

```typescript
// devtools-setup.ts — import this before creating any store
import { installDevtools } from '@headlesskit/state-management-devtools';

export const { inspectorStore, dockStore } = installDevtools();
```

```tsx
// App.tsx
import { DevtoolsPanel } from '@headlesskit/state-management-devtools-react';
import { inspectorStore, dockStore } from './devtools-setup';

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV !== 'production' && (
        <DevtoolsPanel inspectorStore={inspectorStore} dockStore={dockStore} />
      )}
    </>
  );
}
```

This renders a small floating "Devtools" toggle button; clicking it opens a dockable Inspector
panel. Click any action in the list to jump the live store to that point in history; toggle an
action's checkbox to skip it during replay (then **Sweep** to remove skipped actions for good, or
**Commit** to fold everything up to the viewed state into a new baseline).

## Components

| Export | Description |
|--------|--------------|
| `DevtoolsPanel` | The convenience component most apps use — a `DockMonitor` wrapping an `Inspector`. |
| `Inspector` | The full Inspector UI on its own — connection picker, toolbar, action list, and Action/State/Diff/Test tabs. |
| `InspectorToolbar` | The command toolbar on its own — Record/Lock toggles, Reset/Revert/Sweep/Commit, Export/Import/Print/Clear. |
| `ActionList` | The filterable, clickable action list on its own. |
| `JsonTree` | A collapsible, color-coded tree view for any JSON-like value. |
| `DiffTree` | Renders a `computeDiff` result with field-level added/removed/changed annotations. |
| `computeDiff(prev, next)` / `countChanges(nodes)` | The structural diff used by the Diff tab. |
| `exportLiftedState(name, liftedState)` / `importLiftedState(file)` | Download/parse a connection's history as JSON. |
| `DockMonitor` | The dockable panel chrome on its own — toggle button, position switcher (top/right/bottom/left), close button. Takes any `children`. |
| `useInspectorSnapshot(inspectorStore)` | Subscribes to an `InspectorStore`, re-rendering on every change to any connection's lifted state. |
| `useDockSnapshot(dockStore)` | Subscribes to a `DockStore`, re-rendering on every state change. |

See [the full docs](../../docs/state-management-devtools-react/01-overview.mdx) for prop tables and more examples.

## Common pitfalls

- **Mount `DevtoolsPanel` once, outside any component that re-mounts often** — it's a global UI overlay, not per-feature.
- **Gate it behind a dev-only check** (`process.env.NODE_ENV !== 'production'`, a feature flag, etc.) — nothing in this package does that for you automatically.
- **It only renders what `@headlesskit/state-management-devtools` recorded** — if `installDevtools()` ran after a store was already created, that store's actions never reached the inspector.
- **The Test tab is a starting point, not a full test-runner integration** — it prints a `prevState`/`action`/`expect(...).toEqual(...)` snippet for the selected transition; paste it into your own test file.

## License

MIT — see [LICENSE](../../LICENSE) for details.
