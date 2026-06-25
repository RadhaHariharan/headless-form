# @headlesskit/state-management-simplify

A small, fast, scalable bare-bones state management solution for JavaScript apps.

This is @headlesskit's port of [Zustand](https://github.com/pmndrs/zustand)'s vanilla core — same API, same behavior, published under the @headlesskit scope alongside this monorepo's other packages. The original work is by Paul Henschel and the pmndrs collective, MIT licensed. Consumers who already know Zustand can use this as a drop-in.

## Install

```bash
npm install @headlesskit/state-management-simplify
# or
pnpm add @headlesskit/state-management-simplify
# or
yarn add @headlesskit/state-management-simplify
```

## Why this exists

`@headlesskit/state-management-simplify` is the framework-agnostic core — no React, no Vue, no dependency on any UI library. It's included as its own published package so you can:

- **Drop in for Zustand's vanilla API** — same `createStore` contract, same `getState`/`setState`/`subscribe`/`getInitialState` surface, so existing Zustand knowledge and most Zustand-ecosystem patterns transfer directly.
- **Use it standalone** outside of React — in plain JS/TS modules, other frameworks, or as the shared store layer behind multiple UI bindings.
- **Compose middleware** the same way you would with Zustand — `combine`, `redux`, `devtools`, `persist`, `subscribeWithSelector`, `immer`, and `unstable_ssrSafe` all stack via the same currying pattern.
- **Get the same equality helpers** — `shallow` for cheap shallow-equality checks when deciding whether to re-render or re-derive.

`@headlesskit/state-management-simplify-react` builds React hook bindings (`create`, `useStore`, `useShallow`, `createWithEqualityFn`) on top of this package. Reach for this package directly when you don't need React, or when building bindings for another framework.

## Quick start

```typescript
import { createStore } from '@headlesskit/state-management-simplify';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const store = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Subscribe to changes
const unsubscribe = store.subscribe((state, prevState) => {
  console.log('count is now', state.count, 'was', prevState.count);
});

// Read state imperatively
console.log(store.getState().count); // 0

// Update state
store.getState().increment();
console.log(store.getState().count); // 1

// Cleanup
unsubscribe();
```

## Middleware

| Middleware | Description |
|------------|--------------|
| `combine` | Merges an initial state object with additional actions/derived state without re-declaring the base shape in the type. |
| `redux` | Drives the store with a Redux-style `(state, action) => state` reducer plus a `dispatch` function, for teams migrating from or familiar with Redux. |
| `devtools` | Connects the store to the Redux DevTools Extension for time-travel debugging and action logging. |
| `persist` | Persists store state to `localStorage`, `sessionStorage`, or any custom storage via `createJSONStorage`/`StateStorage`, with configurable `partialize`, versioning, and migration. |
| `subscribeWithSelector` | Adds selector-based subscriptions — `store.subscribe(selector, listener, options)` — so listeners only fire when the selected slice changes. |
| `immer` | Lets you write `set` callbacks that mutate a draft directly via [Immer](https://immerjs.github.io/immer/). Requires the optional peer dependency `immer` (`>=9.0.6`). |
| `unstable_ssrSafe` | Wraps a store so it's safe to create and read during server-side rendering without leaking state across requests. |

## Documentation

- [Overview](../../docs/state-management-simplify/01-overview.mdx)
- [createStore](../../docs/state-management-simplify/02-create-store.mdx)
- [shallow](../../docs/state-management-simplify/03-shallow.mdx)
- Middleware: [combine](../../docs/state-management-simplify/middleware/01-combine.mdx) · [redux](../../docs/state-management-simplify/middleware/02-redux.mdx) · [devtools](../../docs/state-management-simplify/middleware/03-devtools.mdx) · [persist](../../docs/state-management-simplify/middleware/04-persist.mdx) · [subscribeWithSelector](../../docs/state-management-simplify/middleware/05-subscribe-with-selector.mdx) · [immer](../../docs/state-management-simplify/middleware/06-immer.mdx) · [unstable_ssrSafe](../../docs/state-management-simplify/middleware/07-unstable-ssr-safe.mdx)

## License

MIT — see [LICENSE](../../LICENSE) for details.

This package is a direct port of [Zustand](https://github.com/pmndrs/zustand), copyright Paul Henschel and contributors, also MIT licensed — the original copyright and license terms are preserved per the MIT license's terms.
