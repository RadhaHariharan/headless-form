# @headlesskit/query-sync-storage-persister

A `Persister` for synchronous storages (`localStorage`, `sessionStorage`, and compatible APIs) — vendored in plain JS.

## Install

```bash
npm install @headlesskit/query-sync-storage-persister
```

```bash
pnpm add @headlesskit/query-sync-storage-persister
```

```bash
yarn add @headlesskit/query-sync-storage-persister
```

This package depends on [`@headlesskit/query-core`](../query-core) and [`@headlesskit/query-persist-client-core`](../query-persist-client-core), and provides a persister backed by a synchronous key-value store (e.g. `localStorage`).

## Why this exists

`createSyncStoragePersister` builds a `Persister` (the interface defined by `@headlesskit/query-persist-client-core`) backed by any storage with synchronous `getItem`/`setItem`/`removeItem` — the canonical case being `window.localStorage` or `window.sessionStorage` in the browser.

Key features:

- Implements the standard `Persister` interface (`persistClient`, `restoreClient`, `removeClient`)
- **Throttled writes** via `setTimeout` (default 1000ms) to avoid hammering storage on every cache update
- **Quota-error recovery** via a `retry` callback — return a trimmed `PersistedClient` to retry the write, or `undefined` to give up
- **Null-safe** — pass `storage: null` (e.g. during SSR where `window` doesn't exist) and you get a no-op persister
- **Custom serialization** — swap in `superjson` or any serializer to handle `Date`, `Map`, `Set`, etc.

## Quick start

This package is not used standalone — pass the persister it creates into `persistQueryClient` from `@headlesskit/query-persist-client-core`:

```typescript
import { QueryClient } from '@headlesskit/query-core';
import { persistQueryClient } from '@headlesskit/query-persist-client-core';
import { createSyncStoragePersister } from '@headlesskit/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep data in memory long enough to persist
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'MY_APP_CACHE',
  throttleTime: 1000,
});

const [unsubscribe, restorePromise] = await persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24h
  buster: import.meta.env.VITE_BUILD_HASH ?? '',
  onSuccess: () => console.log('Cache restored from localStorage'),
});

await restorePromise;
queryClient.mount();

// On teardown
unsubscribe();
```

## Key API

| Export | Description |
|--------|-------------|
| `createSyncStoragePersister(options)` | Builds a `Persister` backed by a `Storage`-shaped object. |
| `StoragePersisterOptions` | `{ storage, serialize?, deserialize?, key?, throttleTime?, retry? }` |
| `Storage` | The storage interface: synchronous `getItem`, `setItem`, `removeItem` |

`storage` defaults: `key = 'REACT_QUERY_OFFLINE_CACHE'`, `throttleTime = 1000`, `serialize = JSON.stringify`, `deserialize = JSON.parse`. The `retry` callback is invoked when `setItem` throws (e.g. `QuotaExceededError`) — see the docs for a worked example that trims the cache to the most recently used queries.

## Documentation

In-depth docs — including quota-exceeded recovery, `sessionStorage` per-tab caching, in-memory storage for tests/SSR, and a sync-vs-async comparison table — live in [`docs/query-sync-storage-persister/`](../../docs/query-sync-storage-persister/01-overview.mdx):

- [Overview](../../docs/query-sync-storage-persister/01-overview.mdx)
- [`createSyncStoragePersister`](../../docs/query-sync-storage-persister/02-create-sync-storage-persister.mdx)

## License

MIT — see [LICENSE](../../LICENSE) for details.
