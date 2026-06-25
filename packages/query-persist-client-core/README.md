# @headlesskit/query-persist-client-core

Utilities for persisting and restoring a `QueryClient`'s entire cache to any storage backend — vendored in plain JS.

## Install

```bash
npm install @headlesskit/query-persist-client-core
```

```bash
pnpm add @headlesskit/query-persist-client-core
```

```bash
yarn add @headlesskit/query-persist-client-core
```

This package depends on [`@headlesskit/query-core`](../query-core) and is **API-compatible with TanStack Query's persist-client-core package** — if you've used `persistQueryClient` from the TanStack ecosystem, the API here is the same.

## Why this exists

`@headlesskit/query-persist-client-core` provides the glue between a `QueryClient` and a storage adapter (the `Persister` interface). It does not talk to any storage directly — that's the job of adapter packages like [`@headlesskit/query-sync-storage-persister`](../query-sync-storage-persister) and [`@headlesskit/query-async-storage-persister`](../query-async-storage-persister). This package gives you:

- **`Persister` interface** — the contract any storage adapter implements (`persistClient`, `restoreClient`, `removeClient`)
- **`persistQueryClient`** — full lifecycle: restore on startup, then subscribe to cache changes and persist on every update
- **`persistQueryClientRestore` / `persistQueryClientSave` / `persistQueryClientSubscribe`** — lower-level primitives if you need fine-grained control
- **Cache busting** via a `buster` string and expiry via `maxAge`, so stale or version-mismatched snapshots are discarded automatically
- **`experimental_createPersister`** — an alternative, per-query persister that wraps individual `queryFn`s instead of serializing the whole client
- **Retry strategy helpers** (`defaultRetry`, `defaultRetryDelay`) for persistence-layer retry logic

## Quick start

This package is not used standalone — wire it into a `QueryClient` together with a storage persister:

```typescript
import { QueryClient } from '@headlesskit/query-core';
import { persistQueryClient } from '@headlesskit/query-persist-client-core';
import { createSyncStoragePersister } from '@headlesskit/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep data alive long enough to persist
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'MY_APP_CACHE',
});

// Restore from storage, then persist on every cache change
const [unsubscribe, restorePromise] = await persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24h
  buster: import.meta.env.VITE_BUILD_HASH ?? '',
  onSuccess: () => console.log('Cache restored from storage'),
});

await restorePromise;
queryClient.mount();

// On teardown
unsubscribe();
```

> `gcTime` should be set longer than `maxAge` — a query has to stay in memory long enough to be serialized when the cache changes.

## Key API

| Export | Description |
|--------|-------------|
| `persistQueryClient(options)` | Restore + subscribe in one call. Returns `[unsubscribe, restorePromise]`. |
| `persistQueryClientRestore(options)` | One-shot restore from the persister into the `QueryClient`. |
| `persistQueryClientSave(options)` | One-shot save of current `QueryClient` state to the persister. |
| `persistQueryClientSubscribe(options)` | Restore once, then save on every cache change. Returns `unsubscribe`. |
| `experimental_createPersister(options)` | Per-query persister factory — wraps `queryFn` instead of the whole client. |
| `defaultRetry`, `defaultRetryDelay` | Default retry predicate / backoff for persistence operations. |
| `Persister`, `PersistedClient`, `PersisterCallbacks` | Core types — implement `Persister` to write your own storage adapter. |

## Documentation

Full in-depth documentation, including the `experimental_createPersister` API, the `Persister`/`Storage` interfaces, and retry-strategy details, lives in [`docs/query-persist-client-core/`](../../docs/query-persist-client-core/01-overview.mdx):

- [Overview](../../docs/query-persist-client-core/01-overview.mdx)
- [`experimental_createPersister`](../../docs/query-persist-client-core/02-create-persister.mdx)
- [`persistQueryClient` and friends](../../docs/query-persist-client-core/03-persist.mdx)
- [Retry strategies](../../docs/query-persist-client-core/04-retry-strategies.mdx)

## License

MIT — see [LICENSE](../../LICENSE) for details.
