import { notifyManager } from './notifyManager'
import { Query } from './query'
import { hashQueryKeyByOptions, matchQuery } from './utils'
import { Subscribable } from './subscribable'
import type { QueryFilters } from './utils'
import type { QueryKey, QueryOptions, QueryStore } from './types'
import type { QueryAction, QueryState } from './query'
import type { QueryObserver } from './queryObserver'
import type { QueryClient } from './queryClient'

interface QueryCacheConfig {
  onError?: (
    error: unknown,
    query: Query<unknown, unknown, unknown>,
  ) => void
  onSuccess?: (data: unknown, query: Query<unknown, unknown, unknown>) => void
  onSettled?: (
    data: unknown | undefined,
    error: unknown | null,
    query: Query<unknown, unknown, unknown>,
  ) => void
}

export interface QueryCacheNotifyEvent {
  type:
    | 'added'
    | 'removed'
    | 'updated'
    | 'observerAdded'
    | 'observerRemoved'
    | 'observerResultsUpdated'
  query: Query<any, any, any, any>
  observer?: QueryObserver<any, any, any, any, any>
  action?: QueryAction<any, any>
}

type QueryCacheListener = (event: QueryCacheNotifyEvent) => void

export class QueryCache extends Subscribable<QueryCacheListener> {
  #config: QueryCacheConfig
  #queries: QueryStore
  #queryClient?: QueryClient

  constructor(config?: QueryCacheConfig) {
    super()
    this.#config = config || {}
    this.#queries = new Map<string, Query<any, any, any, any>>() as unknown as QueryStore
  }

  getQueryClient() {
    return this.#queryClient
  }

  setQueryClient(queryClient: QueryClient) {
    this.#queryClient = queryClient
  }

  build<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
    client: QueryClient,
    options: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    state?: QueryState<TData, TError>,
  ): Query<TQueryFnData, TError, TData, TQueryKey> {
    const queryKey = options.queryKey!
    const queryHash =
      options.queryHash ?? hashQueryKeyByOptions(queryKey, options)
    let query = this.get<TQueryFnData, TError, TData, TQueryKey>(queryHash)

    if (!query) {
      query = new Query({
        cache: this,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options),
        state,
        defaultOptions: client.getQueryDefaults(queryKey),
      })
      this.add(query)
    }

    return query
  }

  add(query: Query<any, any, any, any>): void {
    if (!this.#queries.has(query.queryHash)) {
      this.#queries.set(query.queryHash, query)

      this.notify({
        type: 'added',
        query,
      })
    }
  }

  remove(query: Query<any, any, any, any>): void {
    const queryInMap = this.#queries.get(query.queryHash)

    if (queryInMap) {
      query.destroy()

      if (queryInMap === query) {
        this.#queries.delete(query.queryHash)
      }

      this.notify({ type: 'removed', query })
    }
  }

  clear(): void {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        this.remove(query)
      })
    })
  }

  get<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    queryHash: string,
  ): Query<TQueryFnData, TError, TData, TQueryKey> | undefined {
    return this.#queries.get(queryHash) as
      | Query<TQueryFnData, TError, TData, TQueryKey>
      | undefined
  }

  getAll(): Array<Query> {
    return [...this.#queries.values()]
  }

  find<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData>(
    filters: QueryFilters & { queryKey: QueryKey },
  ): Query<TQueryFnData, TError, TData> | undefined {
    const defaultedFilters = { exact: true, ...filters }
    return this.getAll().find((query) =>
      matchQuery(defaultedFilters, query),
    ) as Query<TQueryFnData, TError, TData> | undefined
  }

  findAll(filters: QueryFilters = {}): Array<Query> {
    const queries = this.getAll()
    return Object.keys(filters).length > 0
      ? queries.filter((query) => matchQuery(filters, query))
      : queries
  }

  notify(event: QueryCacheNotifyEvent) {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event)
      })
    })
  }

  onFocus(): void {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onFocus()
      })
    })
  }

  onOnline(): void {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onOnline()
      })
    })
  }
}
