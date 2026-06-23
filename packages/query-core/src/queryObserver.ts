import { focusManager } from './focusManager'
import { notifyManager } from './notifyManager'
import { Subscribable } from './subscribable'
import {
  isServer,
  isValidTimeout,
  noop,
  replaceEqualDeep,
  resolveQueryBoolean,
  resolveStaleTime,
  shallowEqualObjects,
  shouldThrowError,
  timeUntilStale,
} from './utils'
import type { Query, QueryState, FetchOptions } from './query'
import type {
  DefaultError,
  QueryKey,
  QueryObserverBaseResult,
  QueryObserverOptions,
  QueryObserverResult,
  RefetchOptions,
} from './types'
import type { QueryClient } from './queryClient'
import type { ManagedTimerId } from './timeoutManager'

type QueryObserverListener<TData, TError> = (
  result: QueryObserverResult<TData, TError>,
) => void

export interface NotifyOptions {
  listeners?: boolean
}

export interface ObserverFetchOptions extends FetchOptions {
  throwOnError?: boolean
}

export class QueryObserver<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> extends Subscribable<QueryObserverListener<TData, TError>> {
  options: QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >

  #client: QueryClient
  #currentQuery!: Query<TQueryFnData, TError, TQueryData, TQueryKey>
  #currentQueryInitialState!: QueryState<TQueryData, TError>
  #currentResult!: QueryObserverResult<TData, TError>
  #currentResultState?: QueryState<TQueryData, TError>
  #currentResultOptions?: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  #staleTimeoutId?: ManagedTimerId
  #refetchIntervalId?: ManagedTimerId
  #currentRefetchInterval?: number | false
  #trackedProps!: Set<string>

  constructor(
    client: QueryClient,
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  ) {
    super()

    this.#client = client
    this.#trackedProps = new Set()
    this.options = options

    this.bindMethods()
    this.setOptions(options)
  }

  protected bindMethods(): void {
    this.refetch = this.refetch.bind(this)
  }

  protected onSubscribe(): void {
    if (this.listeners.size === 1) {
      this.#currentQuery.addObserver(this)

      if (shouldFetchOnMount(this.#currentQuery, this.options)) {
        this.#executeFetch()
      } else {
        this.updateResult()
      }

      this.#updateTimers()
    }
  }

  protected onUnsubscribe(): void {
    if (!this.hasListeners()) {
      this.destroy()
    }
  }

  shouldFetchOnReconnect(): boolean {
    return shouldFetchOn(
      this.#currentQuery,
      this.options,
      this.options.refetchOnReconnect,
    )
  }

  shouldFetchOnWindowFocus(): boolean {
    return shouldFetchOn(
      this.#currentQuery,
      this.options,
      this.options.refetchOnWindowFocus,
    )
  }

  destroy(): void {
    this.listeners = new Set()
    this.#clearStaleTimeout()
    this.#clearRefetchInterval()
    this.#currentQuery.removeObserver(this)
  }

  setOptions(
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
    notifyOptions?: NotifyOptions,
  ): void {
    const prevOptions = this.options
    const prevQuery = this.#currentQuery

    this.options = this.#client.defaultQueryOptions(options)

    if (
      process.env['NODE_ENV'] !== 'production' &&
      typeof (options as any).isDataEqual !== 'undefined'
    ) {
      console.warn(
        `The isDataEqual option has been deprecated. Please use structuralSharing instead.`,
      )
    }

    this.#updateQuery()
    this.#currentQuery.setDefaultOptions(
      this.#client.getQueryDefaults(this.#currentQuery.queryKey),
    )

    const mounted = this.hasListeners()

    if (
      mounted &&
      shouldFetchOptionally(
        this.#currentQuery,
        prevQuery,
        this.options,
        prevOptions,
      )
    ) {
      this.#executeFetch()
    }

    this.updateResult(notifyOptions)

    if (mounted) {
      if (
        this.#currentQuery !== prevQuery ||
        resolveQueryBoolean(this.options.enabled, this.#currentQuery) !== resolveQueryBoolean(prevOptions.enabled, prevQuery) ||
        resolveStaleTime(this.options.staleTime, this.#currentQuery) !== resolveStaleTime(prevOptions.staleTime, prevQuery)
      ) {
        this.#updateStaleTimeout()
      }

      const currentRefetchInterval = this.#computeRefetchInterval()

      if (
        this.#currentQuery !== prevQuery ||
        resolveQueryBoolean(this.options.enabled, this.#currentQuery) !== resolveQueryBoolean(prevOptions.enabled, prevQuery) ||
        currentRefetchInterval !== this.#currentRefetchInterval
      ) {
        this.#updateRefetchInterval(currentRefetchInterval)
      }
    }
  }

  getOptimisticResult(
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  ): QueryObserverResult<TData, TError> {
    const query = this.#client
      .getQueryCache()
      .build(this.#client, options)

    const result = this.createResult(query, options)

    if (shouldAssignObserverCurrentProperties(this, result)) {
      this.#currentResult = result
      this.#currentResultOptions = this.options
      this.#currentResultState = this.#currentQuery.state
    }

    return result
  }

  getCurrentResult(): QueryObserverResult<TData, TError> {
    return this.#currentResult
  }

  trackResult(
    result: QueryObserverResult<TData, TError>,
    onPropTracked?: (key: string) => void,
  ): QueryObserverResult<TData, TError> {
    const trackedResult = {} as QueryObserverResult<TData, TError>

    Object.keys(result).forEach((key) => {
      Object.defineProperty(trackedResult, key, {
        configurable: true,
        enumerable: true,
        get: () => {
          this.trackProp(key as keyof typeof result)
          onPropTracked?.(key)
          return result[key as keyof typeof result]
        },
      })
    })

    return trackedResult
  }

  trackProp(key: keyof QueryObserverResult) {
    this.#trackedProps.add(key as string)
  }

  getCurrentQuery(): Query<TQueryFnData, TError, TQueryData, TQueryKey> {
    return this.#currentQuery
  }

  refetch({ ...options }: RefetchOptions = {}): Promise<QueryObserverResult<TData, TError>> {
    return this.fetch({
      ...options,
    })
  }

  fetchOptimistic(
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  ): Promise<QueryObserverResult<TData, TError>> {
    const defaultedOptions = this.#client.defaultQueryOptions(options)

    const query = this.#client
      .getQueryCache()
      .build(this.#client, defaultedOptions)
    query.isFetchingOptimistic = true

    return query.fetch().then(() => this.createResult(query, defaultedOptions))
  }

  protected fetch(options: ObserverFetchOptions): Promise<QueryObserverResult<TData, TError>> {
    return this.#executeFetch({
      ...options,
      cancelRefetch: options.cancelRefetch ?? true,
    }).then(() => {
      this.updateResult()
      return this.#currentResult
    })
  }

  #executeFetch(fetchOptions?: ObserverFetchOptions): Promise<TQueryData | undefined> {
    this.#updateQuery()

    let promise: Promise<TQueryData | undefined> = this.#currentQuery.fetch(
      this.options as any,
      fetchOptions as any,
    )

    if (!fetchOptions?.throwOnError) {
      promise = promise.catch(noop)
    }

    return promise
  }

  #updateStaleTimeout(): void {
    this.#clearStaleTimeout()

    const staleTime = resolveStaleTime(
      this.options.staleTime,
      this.#currentQuery,
    )

    if (isServer || this.#currentResult.isStale || !isValidTimeout(staleTime)) {
      return
    }

    const time = timeUntilStale(
      this.#currentResult.dataUpdatedAt,
      staleTime as number,
    )

    const timeout = time + 1

    this.#staleTimeoutId = setTimeout(() => {
      if (!this.#currentResult.isStale) {
        this.updateResult()
      }
    }, timeout) as unknown as ManagedTimerId
  }

  #computeRefetchInterval() {
    return (
      (typeof this.options.refetchInterval === 'function'
        ? this.options.refetchInterval(this.#currentQuery)
        : this.options.refetchInterval) ?? false
    )
  }

  #updateRefetchInterval(nextInterval: number | false): void {
    this.#clearRefetchInterval()

    this.#currentRefetchInterval = nextInterval

    if (
      isServer ||
      resolveQueryBoolean(this.options.enabled, this.#currentQuery) === false ||
      !isValidTimeout(nextInterval) ||
      nextInterval === 0
    ) {
      return
    }

    this.#refetchIntervalId = setInterval(() => {
      if (
        this.options.refetchIntervalInBackground ||
        focusManager.isFocused()
      ) {
        this.#executeFetch()
      }
    }, nextInterval) as unknown as ManagedTimerId
  }

  #updateTimers(): void {
    this.#updateStaleTimeout()
    this.#updateRefetchInterval(this.#computeRefetchInterval())
  }

  #clearStaleTimeout(): void {
    if (this.#staleTimeoutId !== undefined) {
      clearTimeout(this.#staleTimeoutId as unknown as number)
      this.#staleTimeoutId = undefined
    }
  }

  #clearRefetchInterval(): void {
    if (this.#refetchIntervalId !== undefined) {
      clearInterval(this.#refetchIntervalId as unknown as number)
      this.#refetchIntervalId = undefined
    }
  }

  protected createResult(
    query: Query<TQueryFnData, TError, TQueryData, TQueryKey>,
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  ): QueryObserverResult<TData, TError> {
    const prevQuery = this.#currentQuery
    const prevOptions = this.options
    const prevResult = this.#currentResult as QueryObserverResult<TData, TError> | undefined
    const prevResultState = this.#currentResultState
    const prevResultOptions = this.#currentResultOptions
    const queryChange = query !== prevQuery
    const queryInitialState = queryChange
      ? query.state
      : this.#currentQueryInitialState
    const { state } = query

    let { error, errorUpdatedAt, status } = state
    let isPending = status === 'pending'
    let isError = status === 'error'
    let isLoading = isPending && state.fetchStatus === 'fetching'
    let data: TData | undefined

    const dataUpdatedAt = state.dataUpdatedAt
    let isPlaceholderData = false
    let isStale = false

    if (options.select && state.data !== undefined) {
      if (
        prevResult &&
        state.data === prevResultState?.data &&
        options.select === prevResultOptions?.select &&
        !prevResult.isPlaceholderData
      ) {
        data = prevResult.data
      } else {
        try {
          data = options.select(state.data as TQueryData)
        } catch (selectError) {
          error = selectError as TError
          errorUpdatedAt = Date.now()
          status = 'error'
          isError = true
          isPending = false
        }
      }
    } else {
      data = state.data as unknown as TData
    }

    if (
      isPending &&
      options.placeholderData !== undefined
    ) {
      let placeholderData: TData | undefined

      if (
        prevResult?.isPlaceholderData &&
        options.placeholderData === prevResultOptions?.placeholderData
      ) {
        placeholderData = prevResult.data
      } else if (typeof options.placeholderData === 'function') {
        placeholderData = (options.placeholderData as any)(
          prevResult?.data,
          prevResult ? prevQuery : undefined,
        )
      } else {
        placeholderData = options.placeholderData as TData
      }

      if (placeholderData !== undefined) {
        data = options.select ? options.select(placeholderData as unknown as TQueryData) : placeholderData
        status = 'success'
        isPlaceholderData = true
        isPending = false
        isError = false
      }
    }

    if (data !== undefined && resolveStaleTime(options.staleTime, query) !== undefined) {
      isStale = query.isStaleByTime(resolveStaleTime(options.staleTime, query) as number)
    } else {
      isStale = query.isStale()
    }

    const isFetching = state.fetchStatus === 'fetching'
    const isRefetching = isFetching && !isPending
    const isSuccess = status === 'success'

    const result: QueryObserverBaseResult<TData, TError> = {
      status,
      fetchStatus: state.fetchStatus,
      isPending,
      isSuccess,
      isError,
      isLoading,
      data,
      dataUpdatedAt,
      error,
      errorUpdatedAt,
      failureCount: state.fetchFailureCount,
      failureReason: state.fetchFailureReason as TError | null,
      errorUpdateCount: state.errorUpdateCount,
      isFetched: state.dataUpdateCount > 0 || state.errorUpdateCount > 0,
      isFetchedAfterMount:
        state.dataUpdateCount > queryInitialState.dataUpdateCount ||
        state.errorUpdateCount > queryInitialState.errorUpdateCount,
      isFetching,
      isRefetching,
      isLoadingError: isError && !data,
      isPlaceholderData,
      isRefetchError: isError && data !== undefined,
      isStale,
      refetch: this.refetch,
      promise: query.promise as unknown as Promise<TData>,
    }

    return result as QueryObserverResult<TData, TError>
  }

  updateResult(notifyOptions?: NotifyOptions): void {
    const prevResult = this.#currentResult as QueryObserverResult<TData, TError> | undefined

    const nextResult = this.createResult(
      this.#currentQuery,
      this.options,
    )
    this.#currentResultState = this.#currentQuery.state
    this.#currentResultOptions = this.options

    if (shallowEqualObjects(nextResult, prevResult)) {
      return
    }

    this.#currentResult = nextResult

    const defaultNotifyOptions: NotifyOptions = {}

    const shouldNotifyListeners = (): boolean => {
      if (!prevResult) {
        return true
      }

      const { notifyOnChangeProps } = this.options
      const notifyOnChangePropsValue =
        typeof notifyOnChangeProps === 'function'
          ? notifyOnChangeProps()
          : notifyOnChangeProps

      if (
        notifyOnChangePropsValue === 'all' ||
        (!notifyOnChangePropsValue && !this.#trackedProps.size)
      ) {
        return true
      }

      const includedProps = new Set(
        notifyOnChangePropsValue ?? this.#trackedProps,
      )

      if (this.options.throwOnError) {
        includedProps.add('error')
      }

      return Object.keys(this.#currentResult).some((key) => {
        const typedKey = key as keyof QueryObserverResult
        return (
          includedProps.has(typedKey as any) &&
          this.#currentResult[typedKey] !== prevResult[typedKey]
        )
      })
    }

    if (notifyOptions?.listeners !== false && shouldNotifyListeners()) {
      defaultNotifyOptions.listeners = true
    }

    this.#notify({ ...defaultNotifyOptions, ...notifyOptions })
  }

  #updateQuery(): void {
    const query = this.#client.getQueryCache().build(this.#client, this.options)

    if (query === this.#currentQuery) {
      return
    }

    const prevQuery = this.#currentQuery as
      | Query<TQueryFnData, TError, TQueryData, TQueryKey>
      | undefined
    this.#currentQuery = query
    this.#currentQueryInitialState = query.state

    if (this.hasListeners()) {
      prevQuery?.removeObserver(this)
      query.addObserver(this)
    }
  }

  onQueryUpdate(): void {
    this.updateResult()

    if (this.hasListeners()) {
      this.#updateTimers()
    }
  }

  #notify(notifyOptions: NotifyOptions): void {
    notifyManager.batch(() => {
      if (notifyOptions.listeners) {
        this.listeners.forEach((listener) => {
          listener(this.#currentResult)
        })
      }
      this.#client.getQueryCache().notify({
        query: this.#currentQuery,
        type: 'observerResultsUpdated',
      })
    })
  }
}

function shouldAssignObserverCurrentProperties<TData, TError>(
  observer: QueryObserver<any, any, any, any, any>,
  optimisticResult: QueryObserverResult<TData, TError>,
) {
  if (!shallowEqualObjects(observer.getCurrentResult(), optimisticResult)) {
    return true
  }
  return false
}

function shouldFetchOn(
  query: Query<any, any, any, any>,
  options: QueryObserverOptions<any, any, any, any, any>,
  field: typeof options['refetchOnMount'] &
    typeof options['refetchOnWindowFocus'] &
    typeof options['refetchOnReconnect'],
) {
  if (resolveQueryBoolean(options.enabled, query) !== false) {
    const value = typeof field === 'function' ? field(query) : field
    return value === 'always' || (value !== false && query.isStale())
  }
  return false
}

function shouldFetchOnMount(
  query: Query<any, any, any, any>,
  options: QueryObserverOptions<any, any, any, any, any>,
): boolean {
  return (
    shouldFetchOn(query, options, options.refetchOnMount) ||
    (query.state.fetchStatus === 'paused' && resolveQueryBoolean(options.enabled, query) !== false)
  )
}

function shouldFetchOptionally(
  query: Query<any, any, any, any>,
  prevQuery: Query<any, any, any, any>,
  options: QueryObserverOptions<any, any, any, any, any>,
  prevOptions: QueryObserverOptions<any, any, any, any, any>,
): boolean {
  return (
    (query !== prevQuery ||
      resolveQueryBoolean(prevOptions.enabled, prevQuery) === false) &&
    shouldFetchOn(query, options, options.refetchOnMount)
  )
}
