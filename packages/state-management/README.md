# @headlesskit/state-management

A predictable state container for JavaScript apps — API-compatible with **Redux v5**.

## Install

```bash
npm install @headlesskit/state-management
# or
pnpm add @headlesskit/state-management
# or
yarn add @headlesskit/state-management
```

## Why this exists

This package is the low-level store primitive that `@headlesskit/state-management-toolkit` builds on. It's included as its own published package so you can:

- **Drop in for Redux v5** — same `createStore`/`combineReducers`/`applyMiddleware`/`compose`/`bindActionCreators` API surface, so existing Redux knowledge and most Redux-ecosystem middleware transfer directly.
- **Use it standalone** when you want the raw store with zero opinions, or when learning how Redux's core actually works underneath the toolkit's sugar.
- **Get zero runtime dependencies** — it's a pure TypeScript package with full type definitions.
- **Rely on the same store contract** — single source of truth, read-only state, pure reducers — enforced with the same validation and error messages as upstream Redux.

In most real applications you'll want `@headlesskit/state-management-toolkit`'s `configureStore` instead of calling `createStore` directly — it wires up thunk middleware, dev-mode invariant checks, and DevTools automatically, plus adds `createSlice` so you don't hand-write switch statements or action-type strings. Reach for this package directly for the raw primitives, custom store setups, or non-toolkit use cases.

## Quick start

```typescript
import { createStore, combineReducers, applyMiddleware } from '@headlesskit/state-management';

// 1. Reducers — pure functions, one per state slice
function counterReducer(state = { value: 0 }, action) {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 };
    case 'counter/decrement': return { value: state.value - 1 };
    default: return state;
  }
}

// 2. Combine slices into one root reducer
const rootReducer = combineReducers({ counter: counterReducer });

// 3. Optional: middleware (e.g. logging) via applyMiddleware
const logger = (store) => (next) => (action) => {
  console.log('dispatching', action);
  return next(action);
};

// 4. Build the store
const store = createStore(rootReducer, applyMiddleware(logger));

// 5. Subscribe to changes
store.subscribe(() => console.log('state is now', store.getState()));

// 6. Dispatch actions — the only way to change state
store.dispatch({ type: 'counter/increment' });
// logs: "dispatching { type: 'counter/increment' }"
// logs: "state is now { counter: { value: 1 } }"
```

## Key API surface

| Export | Description |
|--------|--------------|
| `createStore(reducer, [preloadedState], [enhancer])` | Creates the store. Returns `getState`, `dispatch`, `subscribe`, `replaceReducer`, and a `Symbol.observable` implementation. |
| `legacy_createStore` | Identical to `createStore`; avoids the Redux DevTools deprecation notice nudging you toward `configureStore`. |
| `combineReducers(reducersMap)` | Merges multiple slice reducers into one root reducer. |
| `applyMiddleware(...middleware)` | Store enhancer that wires up middleware (e.g. thunks, loggers) around `dispatch`. |
| `compose(...functions)` | Right-to-left function composition, used to chain multiple store enhancers together. |
| `bindActionCreators(actionCreators, dispatch)` | Wraps action creators so they dispatch automatically when called. |
| `isAction`, `isPlainObject` | Runtime validation utilities used internally and useful in your own middleware/tests. |

Full type definitions (`Action`, `Reducer`, `Store`, `Middleware`, `StoreEnhancer`, and more) are exported from the package and documented in depth below.

## Documentation

In-depth docs, including every parameter, thrown-error condition, and advanced usage pattern (SSR hydration, code-splitting with `replaceReducer`, DevTools composition, the Observable interface):

- [Overview](../../docs/state-management/01-overview.mdx)
- [createStore](../../docs/state-management/02-create-store.mdx)
- [combineReducers](../../docs/state-management/03-combine-reducers.mdx)
- [applyMiddleware](../../docs/state-management/04-apply-middleware.mdx)
- [compose](../../docs/state-management/05-compose.mdx)
- [bindActionCreators](../../docs/state-management/06-bind-action-creators.mdx)
- Types: [actions](../../docs/state-management/types/01-actions.mdx) · [middleware](../../docs/state-management/types/02-middleware.mdx) · [reducers](../../docs/state-management/types/03-reducers.mdx) · [store](../../docs/state-management/types/04-store.mdx)
- Utils: [actionTypes](../../docs/state-management/utils/01-action-types.mdx) · [isAction](../../docs/state-management/utils/02-is-action.mdx) · [isPlainObject](../../docs/state-management/utils/03-is-plain-object.mdx) · [kindOf](../../docs/state-management/utils/04-kind-of.mdx) · [formatProdErrorMessage](../../docs/state-management/utils/05-format-prod-error-message.mdx) · [Symbol.observable](../../docs/state-management/utils/06-symbol-observable.mdx) · [warning](../../docs/state-management/utils/07-warning.mdx)

## License

MIT — see [LICENSE](../../LICENSE) for details.
