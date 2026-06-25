# @headlesskit/query-async-storage-persister

A `Persister` for asynchronous storages (React Native `AsyncStorage`, IndexedDB, custom async backends) — vendored in plain JS.

## Install

```bash
npm install @headlesskit/query-async-storage-persister
```

```bash
pnpm add @headlesskit/query-async-storage-persister
```

```bash
yarn add @headlesskit/query-async-storage-persister
```

This package depends on [`@headlesskit/query-core`](../query-core) and [`@headlesskit/query-persist-client-core`](../query-persist-client-core), and is **API-compatible with TanStack Query's async-storage-persister package**.

## Why this exists

`createAsyncStoragePersister` builds a `Persister` (the interface defined by `@headlesskit/query-persist-client-core`) backed by any storage whose `getItem`/`setItem`/`removeItem` return promises. This is the persister to reach for whenever synchronous storage isn't available:

- **React Native** — `@react-native-async-storage/async-storage`
- **IndexedDB** — via wrappers like `idb-keyval`
- **Custom async backends** — a remote cache API, filesystem access, etc.

Key features:

- Implements the standard `Persister` interface (`persistClient`, `restoreClient`, `removeClient`)
- **Async-aware throttling** via the exported `asyncThrottle` helper — writes never overlap, and are rate-limited by `throttleTime` (default 1000ms)
- **Null-safe** — pass `storage: null` (e.g. when a platform API is unavailable) and you get a no-op persister with no errors
- **Custom serialization** — swap in `superjson` or any serializer to handle `Date`, `Map`, `Set`, etc.

## Quick start

This package is not used standalone — pass the persister it creates into `persistQueryClient` from `@headlesskit/query-persist-client-core`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@headlesskit/query-core';
import { persistQueryClient } from '@headlesskit/query-persist-client-core';
import { createAsyncStoragePersister } from '@headlesskit/query-async-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep data alive long enough to persist
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'MY_APP_QUERY_CACHE',
  throttleTime: 2000,
});

const [unsubscribe, restorePromise] = await persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24,
  buster: 'v1',
  onSuccess: () => console.log('Cache restored'),
  onError: (err) => console.warn('Cache restore failed:', err),
});

await restorePromise;
queryClient.mount();

// On teardown
unsubscribe();
```

## Key API

| Export | Description |
|--------|-------------|
| `createAsyncStoragePersister(options)` | Builds a `Persister` backed by an `AsyncStorage`-shaped object. |
| `AsyncStoragePersisterOptions` | `{ storage, serialize?, deserialize?, key?, throttleTime? }` |
| `AsyncStorage` | The storage interface: `getItem`, `setItem`, `removeItem`, all returning promises |
| `asyncThrottle(fn, { interval })` | The internal write-throttling utility, exported for standalone use |

`storage` defaults: `key = 'REACT_QUERY_OFFLINE_CACHE'`, `throttleTime = 1000`, `serialize = JSON.stringify`, `deserialize = JSON.parse`.

## Documentation

In-depth docs — including IndexedDB and custom-backend recipes, `asyncThrottle` internals, and null-safe storage patterns — live in [`docs/query-async-storage-persister/`](../../docs/query-async-storage-persister/01-overview.mdx):

- [Overview](../../docs/query-async-storage-persister/01-overview.mdx)
- [`createAsyncStoragePersister`](../../docs/query-async-storage-persister/02-create-async-storage-persister.mdx)
- [`asyncThrottle`](../../docs/query-async-storage-persister/03-async-throttle.mdx)

## License

MIT — see [LICENSE](../../LICENSE) for details.
