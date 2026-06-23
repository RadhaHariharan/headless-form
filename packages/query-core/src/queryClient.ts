import { focusManager } from './focusManager'
import { notifyManager } from './notifyManager'
import { onlineManager } from './onlineManager'
import { QueryCache } from './queryCache'
import { MutationCache } from './mutationCache'
import { hashQueryKeyByOptions, functionalUpdate, noop, partialMatchKey } from './utils'
import type {
  CancelOptions,
  DefaultError,
  DefaultOptions,
  InfiniteData,
  MutationKey,
  MutationObserverOptions,
  MutationOptions,
  QueryClientConfig,
  QueryKey,
  QueryObserverOptions,
  QueryOptions,
  SetDataOptions,
} from './types'
import type { QueryFilters } from './utils'
import type { Query, FetchOptions, QueryState } from './query'
import type { Mutation } from './mutation'

// We re-export these from types since the full types.ts has them inline
type DefaultedQueryObserverOptions_<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> & {
  _defaulted: true
}

export class QueryClient {
  #queryCache: QueryCache
  #mutationCache: MutationCache
  #defaultOptions: DefaultOptions
  #queryDefaults: Map<string, QueryOptions<unknown, any, any, any>>
  #mutationDefaults: Map<string, MutationOptions<unknown, any, any, any>>
  #mountCount: number
  #unsubscribeFocus?: () => void
  #unsubscribeOnline?: () => void

  constructor(config: QueryClientConfig = {}) {
    this.#queryCache = config.queryCache || new QueryCache()
    this.#mutationCache = config.mutationCache || new MutationCache()
    this.#defaultOptions = config.defaultOptions || {}
    this.#queryDefaults = new Map()
    this.#mutationDefaults = new Map()
    this.#mountCount = 0

    this.#queryCache.setQueryClient(this)
  }

  mount(): void {
    this.#mountCount++
    if (this.#mountCount !== 1) return

    this.#unsubscribeFocus = focusManager.subscribe(async (focused) => {
      if (focused) {
        await this.resumePausedMutations()
        this.#queryCache.onFocus()
      }
    })
    this.#unsubscribeOnline = onlineManager.subscribe(async (online) => {
      if (online) {
        await this.resumePausedMutations()
        this.#queryCache.onOnline()
      }
    })
  }

  unmount(): void {
    this.#mountCount--
    if (this.#mountCount !== 0) return

    this.#unsubscribeFocus?.()
    this.#unsubscribeFocus = undefined

    this.#unsubscribeOnline?.()
    this.#unsubscribeOnline = undefined
  }

  isFetching(filters?: QueryFilters): number {
    return this.#queryCache.findAll({ ...filters, fetchStatus: 'fetching' })
      .length
  }

  isMutating(filters?: { status?: 'pending' }): number {
    return this.#mutationCache.findAll({ ...filters, status: 'pending' }).length
  }

  getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined {
    const options = this.defaultQueryOptions({ queryKey })
    return this.#queryCache
      .get<unknown, unknown, TData>(options.queryHash!)
      ?.state.data as TData | undefined
  }

  ensureQueryData<
    TQueryFnData,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: FetchQueryOptions_<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<TData> {
    const cachedData = this.getQueryData<TData>(options.queryKey!)
    if (cachedData !== undefined) return Promise.resolve(cachedData)
    return this.fetchQuery(options)
  }

  getQueriesData<TData = unknown>(
    filters: QueryFilters,
  ): Array<[QueryKey, TData | undefined]> {
    return this.#queryCache.findAll(filters).map(({ queryKey, state }) => {
      const data = state.data as TData | undefined
      return [queryKey, data]
    })
  }

  setQueryData<
    TQueryFnData = unknown,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = TTaggedQueryKey extends {
      __type: infer T
    }
      ? T
      : TQueryFnData,
  >(
    queryKey: TTaggedQueryKey,
    updater: Updater<
      NoInfer<TInferredQueryFnData> | undefined,
      NoInfer<TInferredQueryFnData> | undefined
    >,
    options?: SetDataOptions,
  ): TInferredQueryFnData | undefined {
    const defaultedOptions = this.defaultQueryOptions({ queryKey })
    const query = this.#queryCache.get<
      TInferredQueryFnData,
      DefaultError,
      TInferredQueryFnData
    >(defaultedOptions.queryHash!)

    const prevData = query?.state.data

    const data = functionalUpdate(updater, prevData)

    if (data === undefined) {
      return undefined
    }

    if (query) {
      query.setState({
        data,
        ...options,
        dataUpdatedAt: options?.updatedAt ?? Date.now(),
        status: 'success',
        error: null,
      } as any)
    }

    return data
  }

  setQueriesData<TData>(
    filters: QueryFilters,
    updater: Updater<TData | undefined, TData | undefined>,
    options?: SetDataOptions,
  ): Array<[QueryKey, TData | undefined]> {
    return notifyManager.batch(() =>
      this.#queryCache.findAll(filters).map(({ queryKey }) => [
        queryKey,
        this.setQueryData<TData>(queryKey, updater, options),
      ]),
    )
  }

  getQueryState<
    TData = unknown,
    TError = DefaultError,
  >(queryKey: QueryKey): QueryState<TData, TError> | undefined {
    const options = this.defaultQueryOptions({ queryKey })
    return this.#queryCache
      .get<unknown, TError, TData>(options.queryHash!)
      ?.state as QueryState<TData, TError> | undefined
  }

  removeQueries(filters?: QueryFilters): void {
    const queryCache = this.#queryCache
    notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        queryCache.remove(query)
      })
    })
  }

  resetQueries(
    filters?: QueryFilters,
    options?: ResetOptions,
  ): Promise<void> {
    const queryCache = this.#queryCache

    const refetchFilters: QueryFilters = {
      type: 'active',
      ...filters,
    }

    return notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        query.setState(query.initialState)
      })
      return this.refetchQueries(refetchFilters, options)
    })
  }

  cancelQueries(
    filters?: QueryFilters,
    cancelOptions: CancelOptions = {},
  ): Promise<void> {
    const defaultedCancelOptions: CancelOptions = {
      revert: true,
      ...cancelOptions,
    }

    const promises = notifyManager.batch(() =>
      this.#queryCache
        .findAll(filters)
        .map((query) => query.cancel(defaultedCancelOptions)),
    )

    return Promise.all(promises).then(noop).catch(noop)
  }

  invalidateQueries(
    filters: InvalidateQueryFilters = {},
    options: InvalidateOptions = {},
  ): Promise<void> {
    return notifyManager.batch(() => {
      this.#queryCache.findAll(filters).forEach((query) => {
        query.invalidate()
      })

      if (filters.refetchType === 'none') {
        return Promise.resolve()
      }

      const refetchFilters: QueryFilters = {
        ...filters,
        type: filters.refetchType ?? filters.type ?? 'active',
      }
      return this.refetchQueries(refetchFilters, options)
    })
  }

  refetchQueries(
    filters: QueryFilters = {},
    options?: RefetchOptions_,
  ): Promise<void> {
    const fetchOptions: RefetchOptions_ = {
      cancelRefetch: true,
      ...options,
    }

    const promises = notifyManager.batch(() =>
      this.#queryCache
        .findAll(filters)
        .filter((query) => !query.isDisabled())
        .map((query) => {
          let promise = query.fetch(undefined, fetchOptions as any)
          if (!fetchOptions.throwOnError) {
            promise = promise.catch(noop)
          }
          return query.state.fetchStatus === 'paused'
            ? Promise.resolve()
            : promise
        }),
    )

    return Promise.all(promises).then(noop)
  }

  fetchQuery<
    TQueryFnData,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = never,
  >(
    options: FetchQueryOptions_<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<TData> {
    const defaultedOptions = this.defaultQueryOptions(options)

    if (defaultedOptions.retry === undefined) {
      defaultedOptions.retry = false
    }

    const query = this.#queryCache.build(this, defaultedOptions)

    return query.isStaleByTime(
      resolveStaleTime_(defaultedOptions.staleTime, query),
    )
      ? query.fetch(defaultedOptions)
      : Promise.resolve(query.state.data as TData)
  }

  prefetchQuery<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: FetchQueryOptions_<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<void> {
    return this.fetchQuery(options).then(noop).catch(noop)
  }

  fetchInfiniteQuery<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: InfiniteQueryOptions_<TQueryFnData, TError, TData, TQueryFnData, TQueryKey, TPageParam>,
  ): Promise<TData> {
    options.behavior = infiniteQueryBehavior(options.maxPages) as any
    return this.fetchQuery(options as any)
  }

  prefetchInfiniteQuery<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: InfiniteQueryOptions_<TQueryFnData, TError, TData, TQueryFnData, TQueryKey, TPageParam>,
  ): Promise<void> {
    return this.fetchInfiniteQuery(options).then(noop).catch(noop)
  }

  resumePausedMutations(): Promise<unknown> {
    if (onlineManager.isOnline()) {
      return this.#mutationCache.resumePausedMutations()
    }
    return Promise.resolve()
  }

  getQueryCache(): QueryCache {
    return this.#queryCache
  }

  getMutationCache(): MutationCache {
    return this.#mutationCache
  }

  getDefaultOptions(): DefaultOptions {
    return this.#defaultOptions
  }

  setDefaultOptions(options: DefaultOptions): void {
    this.#defaultOptions = options
  }

  setQueryDefaults(
    queryKey: QueryKey,
    options: Partial<QueryObserverOptions<unknown, any, any, any>>,
  ): void {
    this.#queryDefaults.set(hashQueryKeyByOptions(queryKey), {
      ...(this.#queryDefaults.get(hashQueryKeyByOptions(queryKey)) as any),
      ...options,
      queryKey,
    } as any)
  }

  getQueryDefaults(
    queryKey: QueryKey,
  ): QueryOptions<any, any, any, any> {
    const result: QueryOptions<any, any, any, any> = {}

    this.#queryDefaults.forEach((queryDefault, key) => {
      if (
        partialMatchKey(queryKey, (queryDefault as any).queryKey)
      ) {
        Object.assign(result, queryDefault)
      }
    })

    return result
  }

  setMutationDefaults(
    mutationKey: MutationKey,
    options: MutationObserverOptions<unknown, any, any, any>,
  ): void {
    this.#mutationDefaults.set(hashQueryKeyByOptions(mutationKey), {
      ...(this.#mutationDefaults.get(hashQueryKeyByOptions(mutationKey)) as any),
      ...options,
      mutationKey,
    } as any)
  }

  getMutationDefaults(
    mutationKey: MutationKey,
  ): MutationOptions<any, any, any, any> | undefined {
    const result: MutationOptions<any, any, any, any> = {}

    this.#mutationDefaults.forEach((mutationDefault) => {
      if (
        partialMatchKey(mutationKey, (mutationDefault as any).mutationKey)
      ) {
        Object.assign(result, mutationDefault)
      }
    })

    return Object.keys(result).length > 0 ? result : undefined
  }

  defaultQueryOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = never,
  >(
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey, TPageParam> & {
      _defaulted?: boolean
    },
  ): QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey, TPageParam> & {
    _defaulted: true
    queryHash: string
  } {
    if ((options as any)._defaulted) {
      return options as any
    }

    const defaultedOptions = {
      ...this.#defaultOptions.queries,
      ...(options.queryKey ? this.getQueryDefaults(options.queryKey as QueryKey) : undefined),
      ...options,
      _defaulted: true,
    } as any

    if (!defaultedOptions.queryHash) {
      defaultedOptions.queryHash = hashQueryKeyByOptions(
        defaultedOptions.queryKey!,
        defaultedOptions,
      )
    }

    if (defaultedOptions.refetchOnReconnect === undefined) {
      defaultedOptions.refetchOnReconnect =
        defaultedOptions.networkMode !== 'always'
    }
    if (defaultedOptions.throwOnError === undefined) {
      defaultedOptions.throwOnError = !!defaultedOptions.suspense
    }

    if (
      typeof defaultedOptions.staleTime !== 'number' &&
      typeof defaultedOptions.staleTime !== 'function'
    ) {
      defaultedOptions.staleTime = 0
    }

    return defaultedOptions
  }

  defaultMutationOptions<
    T extends MutationOptions<any, any, any, any>,
  >(options?: T): T {
    if ((options as any)?._defaulted) {
      return options as T
    }

    return {
      ...this.#defaultOptions.mutations,
      ...(options?.mutationKey
        ? this.getMutationDefaults(options.mutationKey)
        : undefined),
      ...options,
      _defaulted: true,
    } as T
  }

  clear(): void {
    this.#queryCache.clear()
    this.#mutationCache.clear()
  }
}

interface FetchQueryOptions_<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> extends QueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  initialPageParam?: unknown
}

interface InfiniteQueryOptions_<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = InfiniteData<TQueryFnData>,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> extends Omit<QueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'getNextPageParam' | 'getPreviousPageParam'> {
  initialPageParam: TPageParam
  getNextPageParam: (
    lastPage: TQueryFnData,
    allPages: Array<TQueryFnData>,
    lastPageParam: TPageParam,
    allPageParams: Array<TPageParam>,
  ) => TPageParam | undefined | null
  getPreviousPageParam?: (
    firstPage: TQueryFnData,
    allPages: Array<TQueryFnData>,
    firstPageParam: TPageParam,
    allPageParams: Array<TPageParam>,
  ) => TPageParam | undefined | null
  maxPages?: number
}

interface InvalidateQueryFilters extends QueryFilters {
  refetchType?: 'active' | 'inactive' | 'all' | 'none'
}

interface InvalidateOptions {
  throwOnError?: boolean
  cancelRefetch?: boolean
}

interface RefetchOptions_ {
  cancelRefetch?: boolean
  throwOnError?: boolean
}

interface ResetOptions {
  throwOnError?: boolean
  cancelRefetch?: boolean
}

type NoInfer<T> = [T][T extends any ? 0 : never]
type Updater<TInput, TOutput> = TOutput | ((input: TInput) => TOutput)

function resolveStaleTime_(
  staleTime: unknown,
  query: Query<any, any, any, any>,
): number {
  return typeof staleTime === 'function' ? staleTime(query) : (staleTime as number) ?? 0
}

function infiniteQueryBehavior(maxPages?: number) {
  return {
    onFetch: (context: any, query: any) => {
      const options = context.options as any
      const direction = context.fetchOptions?.meta?.fetchMore?.direction

      const oldPages = (query.state.data?.pages || []) as unknown[]
      const oldPageParams = (query.state.data?.pageParams || []) as unknown[]
      let pageParam = options.initialPageParam

      const fetchedPages: unknown[] = []
      const fetchedPageParams: unknown[] = []

      const buildNewPages = (pages: unknown[], params: unknown[], data: unknown, fetchMore?: boolean) => {
        return fetchMore
          ? { pages: [...pages, data], pageParams: [...params, pageParam] }
          : { pages: [data], pageParams: [pageParam] }
      }

      context.fetchFn = async () => {
        const queryFn = context.options.queryFn
        if (!queryFn) throw new Error('Missing queryFn')

        if (direction === 'forward' || direction === 'backward') {
          pageParam = direction === 'forward'
            ? options.getNextPageParam?.(
                oldPages[oldPages.length - 1],
                oldPages,
                oldPageParams[oldPageParams.length - 1],
                oldPageParams,
              )
            : options.getPreviousPageParam?.(
                oldPages[0],
                oldPages,
                oldPageParams[0],
                oldPageParams,
              )

          const result = await queryFn({ ...context, pageParam, direction })
          return direction === 'forward'
            ? { pages: [...oldPages, result], pageParams: [...oldPageParams, pageParam] }
            : { pages: [result, ...oldPages], pageParams: [pageParam, ...oldPageParams] }
        }

        const pages: unknown[] = []
        const params: unknown[] = [options.initialPageParam]
        let currentPageParam = options.initialPageParam

        const pagesToFetch = maxPages
          ? Math.min(oldPages.length || 1, maxPages)
          : oldPages.length || 1

        for (let i = 0; i < pagesToFetch; i++) {
          if (i > 0) {
            currentPageParam = options.getNextPageParam?.(
              pages[i - 1],
              pages,
              params[i - 1],
              params,
            )
            if (currentPageParam == null) break
            params[i] = currentPageParam
          }
          const result = await queryFn({ ...context, pageParam: params[i], direction: 'forward' })
          pages[i] = result
        }

        return { pages, pageParams: params }
      }

      ;(query.state as any).__fetchFnResult = context.fetchFn()
    },
  }
}
