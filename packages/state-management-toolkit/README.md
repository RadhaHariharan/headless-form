# @headlesskit/state-management-toolkit

The opinionated, batteries-included toolset for state management — API-compatible with **Redux Toolkit v2**.

## Install

```bash
npm install @headlesskit/state-management-toolkit
# or
pnpm add @headlesskit/state-management-toolkit
# or
yarn add @headlesskit/state-management-toolkit
```

> `@headlesskit/state-management` (the underlying Redux-v5-compatible store) is a workspace dependency resolved automatically — you don't need to install it separately.

## Why this exists

This package re-exports everything from [`@headlesskit/state-management`](../state-management) and adds the productivity layer on top, so users coming from Redux Toolkit can adopt it as a drop-in:

- **`configureStore`** — one call that wires up thunk middleware, dev-mode invariant checks (immutable/serializable state, action creator dispatch), and the Redux DevTools Extension, instead of assembling `createStore` + `applyMiddleware` + `compose` by hand.
- **`createSlice`** — generates a reducer, action creators, and selectors for a slice of state in one call, with Immer-powered "mutating" reducer syntax under the hood.
- **`createAsyncThunk`** — wraps an async function into an action creator that dispatches `pending`/`fulfilled`/`rejected` lifecycle actions automatically.
- **`createEntityAdapter`** — normalized `{ ids, entities }` CRUD operations for collections, without hand-writing `addOne`/`updateOne`/`removeOne` logic yourself.
- **Listener middleware & dynamic middleware** — side-effect handling with cancellation/debouncing/sequencing, and the ability to add middleware to a running store after the fact.
- **A built-in RTK-Query-style data layer** (`createApi` + `fetchBaseQuery`) — declarative, cached, auto-revalidating data fetching with auto-generated actions, selectors, and (with the React module) hooks.

## Quick start

```typescript
import { createSlice, configureStore } from '@headlesskit/state-management-toolkit';

// 1. Define a slice — reducer + action creators in one call
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1; // Immer-powered "mutation" — safely produces a new state
    },
    incrementByAmount(state, action: { payload: number }) {
      state.value += action.payload;
    },
  },
});

export const { increment, incrementByAmount } = counterSlice.actions;

// 2. Build the store — thunk middleware, dev checks, and DevTools wired up automatically
const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

// 3. Dispatch and read state as usual
store.dispatch(increment());
store.dispatch(incrementByAmount(5));
console.log(store.getState()); // { counter: { value: 6 } }
```

## Feature map

This package has a lot of surface area. Rather than cram it all in here, each major feature has its own in-depth doc page:

| Feature | What it does | Docs |
|---------|---------------|------|
| `configureStore` | Wires up thunk middleware, invariant checks, and DevTools in one call | [04-configure-store](../../docs/state-management-toolkit/04-configure-store.mdx) |
| `createSlice` | Generates a reducer + action creators + selectors for one state slice (object or callback `reducers` form, `extraReducers`, inline async thunks) | [05-create-slice](../../docs/state-management-toolkit/05-create-slice.mdx) |
| `createAsyncThunk` | Wraps async logic into a thunk with `pending`/`fulfilled`/`rejected` lifecycle actions | [06-create-async-thunk](../../docs/state-management-toolkit/06-create-async-thunk.mdx) |
| `createEntityAdapter` | Normalized `{ ids, entities }` CRUD adapter + selectors for collections | [16-create-entity-adapter](../../docs/state-management-toolkit/16-create-entity-adapter.mdx) (internals: [entities/01-internals](../../docs/state-management-toolkit/entities/01-internals.mdx)) |
| `createListenerMiddleware` | Side-effect middleware with cancellation, debouncing, `take`/`condition` sequencing, and `fork` for child tasks | [17-create-listener-middleware](../../docs/state-management-toolkit/17-create-listener-middleware.mdx) |
| `createDynamicMiddleware` | Add middleware to a store after it's already created (e.g. for code-split features) | [18-create-dynamic-middleware](../../docs/state-management-toolkit/18-create-dynamic-middleware.mdx) |
| `createApi` / `fetchBaseQuery` | RTK-Query-style data-fetching/caching layer: declarative endpoints, cache tags, auto-revalidation, auto-generated actions/selectors/hooks | [query/01-create-api](../../docs/state-management-toolkit/query/01-create-api.mdx), [query/02-fetch-base-query](../../docs/state-management-toolkit/query/02-fetch-base-query.mdx) |
| `createAction` / `createReducer` | Lower-level building blocks `createSlice` is built from | [01-create-action](../../docs/state-management-toolkit/01-create-action.mdx), [02-create-reducer](../../docs/state-management-toolkit/02-create-reducer.mdx) |
| `combineSlices` | Lazy/runtime slice injection for code-splitting reducers | [08-combine-slices](../../docs/state-management-toolkit/08-combine-slices.mdx) |
| Matchers (`isAnyOf`, `isPending`, etc.) | Predicate helpers for `extraReducers`/listener middleware | [07-matchers](../../docs/state-management-toolkit/07-matchers.mdx) |
| `createDraftSafeSelector` | Memoized selectors safe to call from inside an Immer draft | [03-create-draft-safe-selector](../../docs/state-management-toolkit/03-create-draft-safe-selector.mdx) |

All of `@headlesskit/state-management`'s exports (`createStore`, `combineReducers`, `applyMiddleware`, `compose`, `bindActionCreators`, and types) are also re-exported from this package, alongside `immer` and `reselect` re-exports (`createSelector`, `current`, `Draft`, etc.) used internally.

## Documentation

Full reference docs, one page per API, with parameter tables, common pitfalls, and advanced patterns:

- [Overview](../../docs/state-management-toolkit/01-overview.mdx)
- [createAction](../../docs/state-management-toolkit/01-create-action.mdx) · [createReducer](../../docs/state-management-toolkit/02-create-reducer.mdx) · [createDraftSafeSelector](../../docs/state-management-toolkit/03-create-draft-safe-selector.mdx)
- [configureStore](../../docs/state-management-toolkit/04-configure-store.mdx) · [createSlice](../../docs/state-management-toolkit/05-create-slice.mdx) · [createAsyncThunk](../../docs/state-management-toolkit/06-create-async-thunk.mdx) · [matchers](../../docs/state-management-toolkit/07-matchers.mdx)
- [combineSlices](../../docs/state-management-toolkit/08-combine-slices.mdx) · [autoBatchEnhancer](../../docs/state-management-toolkit/09-auto-batch-enhancer.mdx)
- [getDefaultMiddleware](../../docs/state-management-toolkit/10-get-default-middleware.mdx) · [getDefaultEnhancers](../../docs/state-management-toolkit/11-get-default-enhancers.mdx)
- Invariant middleware: [action creator](../../docs/state-management-toolkit/12-action-creator-invariant-middleware.mdx) · [immutable state](../../docs/state-management-toolkit/13-immutable-state-invariant-middleware.mdx) · [serializable state](../../docs/state-management-toolkit/14-serializable-state-invariant-middleware.mdx)
- [DevTools extension](../../docs/state-management-toolkit/15-devtools-extension.mdx) · [createEntityAdapter](../../docs/state-management-toolkit/16-create-entity-adapter.mdx) · [createListenerMiddleware](../../docs/state-management-toolkit/17-create-listener-middleware.mdx) · [createDynamicMiddleware](../../docs/state-management-toolkit/18-create-dynamic-middleware.mdx)
- Entities internals: [entities/01-internals](../../docs/state-management-toolkit/entities/01-internals.mdx)
- RTK Query: [createApi](../../docs/state-management-toolkit/query/01-create-api.mdx) · [fetchBaseQuery](../../docs/state-management-toolkit/query/02-fetch-base-query.mdx) · [retry](../../docs/state-management-toolkit/query/03-retry.mdx) · [setupListeners](../../docs/state-management-toolkit/query/04-setup-listeners.mdx) · [endpoint definitions](../../docs/state-management-toolkit/query/05-endpoint-definitions.mdx) · [serializeQueryArgs](../../docs/state-management-toolkit/query/06-default-serialize-query-args.mdx) · [fakeBaseQuery](../../docs/state-management-toolkit/query/07-fake-base-query.mdx) · [standard schema](../../docs/state-management-toolkit/query/08-standard-schema.mdx) · [base query types](../../docs/state-management-toolkit/query/09-base-query-types.mdx) · [query status/state shape](../../docs/state-management-toolkit/query/10-query-status-and-state-shape.mdx) · [api util](../../docs/state-management-toolkit/query/11-api-util.mdx) · [core internals](../../docs/state-management-toolkit/query/12-core-internals.mdx) · [query utils](../../docs/state-management-toolkit/query/13-utils.mdx)
- Internal utils: [nanoid](../../docs/state-management-toolkit/utils/01-nanoid.mdx) · [redux imports](../../docs/state-management-toolkit/utils/02-redux-imports.mdx) · [immer imports](../../docs/state-management-toolkit/utils/03-immer-imports.mdx) · [reselect imports](../../docs/state-management-toolkit/utils/04-reselect-imports.mdx) · [formatProdErrorMessage](../../docs/state-management-toolkit/utils/05-format-prod-error-message.mdx) · [utils](../../docs/state-management-toolkit/utils/06-utils.mdx) · [unchecked indexed access](../../docs/state-management-toolkit/utils/07-unchecked-indexed.mdx) · [mapBuilders](../../docs/state-management-toolkit/utils/08-map-builders.mdx) · [ts helpers](../../docs/state-management-toolkit/utils/09-ts-helpers.mdx)

See also the underlying store primitives in [`@headlesskit/state-management`](../state-management/README.md), which this package builds on and re-exports.

## License

MIT — see [LICENSE](../../LICENSE) for details.
