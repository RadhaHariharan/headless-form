# @headlesskit/query-core

The framework-agnostic async state and cache management engine, with zero UI-framework dependency.

## Install

```bash
npm install @headlesskit/query-core
```

```bash
pnpm add @headlesskit/query-core
```

```bash
yarn add @headlesskit/query-core
```

## Why this exists

`@headlesskit/query-core` is a framework-agnostic async query and cache engine, vendored as plain JS/TS with no peer dependency on React, Vue, Solid, or any other framework. It exposes `QueryClient`, `QueryObserver`, and `MutationObserver` as the building blocks for framework-specific bindings.

Use it directly when you want async state management — caching, deduplication, background refetching, stale-while-revalidate, retries, mutations, and SSR hydration — without pulling in a framework adapter, or when you're building your own adapter on top of `QueryObserver` / `MutationObserver`.

Key features:

- **QueryClient** — central coordinator for fetching, caching, and invalidating queries and mutations
- **Stale-while-revalidate caching** with configurable `staleTime` / `gcTime`
- **Automatic retries** with exponential backoff, network-mode awareness (`online`, `always`, `offlineFirst`)
- **Background refetching** on window focus and network reconnect
- **Infinite/paginated queries** via `InfiniteQueryObserver`
- **Mutations** with optimistic-update hooks (`onMutate`, `onSuccess`, `onError`, `onSettled`)
- **SSR hydration** via `dehydrate` / `hydrate`
- **Pluggable environment hooks** — `FocusManager`, `OnlineManager`, `NotifyManager` — for non-browser runtimes like React Native

## Quick start

```typescript
import { QueryClient, QueryObserver } from '@headlesskit/query-core';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,    // 1 minute
      gcTime: 1000 * 60 * 5,   // 5 minutes
      retry: 3,
    },
  },
});

queryClient.mount();

const observer = new QueryObserver(queryClient, {
  queryKey: ['user', 1],
  queryFn: () => fetch('/api/users/1').then((r) => r.json()),
});

const unsubscribe = observer.subscribe((result) => {
  console.log(result.status, result.data, result.error);
});

// Imperative fetch (throws on error)
const posts = await queryClient.fetchQuery({
  queryKey: ['posts'],
  queryFn: () => fetch('/api/posts').then((r) => r.json()),
});

// Cleanup
unsubscribe();
queryClient.unmount();
```

Framework adapters (React, Vue, etc.) build `useQuery`/`useMutation`-style hooks on top of `QueryObserver` and `MutationObserver` — you can do the same for any framework or use the imperative `QueryClient` API directly.

## API surface

This package has a large surface area. Rather than duplicate it here, use this table as a map into the deep-dive docs:

| Area | Docs |
|------|------|
| Overview & architecture | [`01-overview.mdx`](../../docs/query-core/01-overview.mdx) |
| `QueryClient` | [`02-query-client.mdx`](../../docs/query-core/02-query-client.mdx) |
| `QueryCache` | [`03-query-cache.mdx`](../../docs/query-core/03-query-cache.mdx) |
| `Query` (state machine) | [`04-query.mdx`](../../docs/query-core/04-query.mdx) |
| `QueryObserver` | [`05-query-observer.mdx`](../../docs/query-core/05-query-observer.mdx) |
| `InfiniteQueryObserver` | [`06-infinite-query-observer.mdx`](../../docs/query-core/06-infinite-query-observer.mdx) |
| `infiniteQueryBehavior` | [`07-infinite-query-behavior.mdx`](../../docs/query-core/07-infinite-query-behavior.mdx) |
| `QueriesObserver` (multi-query) | [`08-queries-observer.mdx`](../../docs/query-core/08-queries-observer.mdx) |
| `Mutation` (state machine) | [`09-mutation.mdx`](../../docs/query-core/09-mutation.mdx) |
| `MutationCache` | [`10-mutation-cache.mdx`](../../docs/query-core/10-mutation-cache.mdx) |
| `MutationObserver` | [`11-mutation-observer.mdx`](../../docs/query-core/11-mutation-observer.mdx) |
| `Retryer` / `createRetryer` | [`12-retryer.mdx`](../../docs/query-core/12-retryer.mdx) |
| `dehydrate` / `hydrate` (SSR) | [`13-hydration.mdx`](../../docs/query-core/13-hydration.mdx) |
| `focusManager` | [`14-focus-manager.mdx`](../../docs/query-core/14-focus-manager.mdx) |
| `onlineManager` | [`15-online-manager.mdx`](../../docs/query-core/15-online-manager.mdx) |
| `notifyManager` | [`16-notify-manager.mdx`](../../docs/query-core/16-notify-manager.mdx) |
| `Subscribable` (base class) | [`17-subscribable.mdx`](../../docs/query-core/17-subscribable.mdx) |
| `Removable` (gc base class) | [`18-removable.mdx`](../../docs/query-core/18-removable.mdx) |
| `environmentManager` | [`19-environment-manager.mdx`](../../docs/query-core/19-environment-manager.mdx) |
| `experimental_createStreamedQuery` | [`20-streamed-query.mdx`](../../docs/query-core/20-streamed-query.mdx) |
| Thenable utilities | [`21-thenable.mdx`](../../docs/query-core/21-thenable.mdx) |
| `timeoutManager` | [`22-timeout-manager.mdx`](../../docs/query-core/22-timeout-manager.mdx) |
| Utility functions (`hashKey`, `skipToken`, etc.) | [`23-utils.mdx`](../../docs/query-core/23-utils.mdx) |
| TypeScript types reference | [`24-types.mdx`](../../docs/query-core/24-types.mdx) |

## Documentation

Full in-depth documentation lives in [`docs/query-core/`](../../docs/query-core/01-overview.mdx) — 23 files covering every module in `src/`, with architecture diagrams, full option tables, and runnable examples. Start with the [overview](../../docs/query-core/01-overview.mdx).

## License

MIT — see [LICENSE](../../LICENSE) for details.
