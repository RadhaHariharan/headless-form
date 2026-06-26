# @headlesskit/state-management-simplify-react

React bindings for `@headlesskit/state-management-simplify`.

## Install

```bash
npm install @headlesskit/state-management-simplify-react
# or
pnpm add @headlesskit/state-management-simplify-react
# or
yarn add @headlesskit/state-management-simplify-react
```

> `@headlesskit/state-management-simplify` (the underlying vanilla store) is a workspace dependency resolved automatically — you don't need to install it separately, and all of its exports (`createStore`, `shallow`, the middleware, and types) are re-exported from this package.

## Why this exists

`@headlesskit/state-management-simplify-react` wraps `@headlesskit/state-management-simplify`'s vanilla store in React hooks, so you get a store and a hook in one call instead of wiring up `useSyncExternalStore` yourself:

- **`create`** — the primary entry point. Pass a state-creator function and get back a hook (`useBoundStore`) that's also a store (`getState`/`setState`/`subscribe`).
- **`useStore`** — the lower-level hook for subscribing a component to an existing vanilla store created with `createStore`, with an optional selector for slicing state.
- **`useShallow`** — a selector-wrapping hook that memoizes its result with shallow equality, so selecting multiple fields from state doesn't cause extra re-renders.
- **`createWithEqualityFn` / `useStoreWithEqualityFn`** — the same `create`/`useStore` pattern, but accepting a custom equality function per-call instead of relying on `Object.is` reference equality.

## Quick start

```tsx
import { create } from '@headlesskit/state-management-simplify-react';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return <button onClick={increment}>Count: {count}</button>;
}

// Imperative access outside React, with the same store reference
useCounterStore.getState().increment();
const unsubscribe = useCounterStore.subscribe((state) => console.log(state.count));
```

Selecting multiple fields without extra re-renders, via `useShallow`:

```tsx
import { useShallow } from '@headlesskit/state-management-simplify-react';

const { count, increment } = useCounterStore(
  useShallow((state) => ({ count: state.count, increment: state.increment })),
);
```

## Peer dependencies

| Package | Requirement | Notes |
|---------|-------------|-------|
| `react` | `>=18` | Required — hooks rely on `React.useSyncExternalStore`. |
| `use-sync-external-store` | `>=1.2.0` | Optional. Only needed if you're targeting a React version/environment where `useSyncExternalStore` isn't available natively and you want the shim. |

## Documentation

- [Overview](../../docs/state-management-simplify-react/01-overview.mdx)
- [create / useStore](../../docs/state-management-simplify-react/02-create-use-store.mdx)
- [useShallow](../../docs/state-management-simplify-react/03-use-shallow.mdx)
- [createWithEqualityFn / useStoreWithEqualityFn](../../docs/state-management-simplify-react/04-with-equality-fn.mdx)

## License

MIT — see [LICENSE](../../LICENSE) for details.
