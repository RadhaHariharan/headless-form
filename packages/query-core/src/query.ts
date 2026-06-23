import { notifyManager } from './notifyManager'
import { canFetch, createRetryer } from './retryer'
import { Removable } from './removable'
import {
  addConsumeAwareSignal,
  ensureQueryFn,
  hashQueryKeyByOptions,
  replaceData,
  resolveStaleTime,
  timeUntilStale,
} from './utils'
import type {
  DefaultError,
  FetchStatus,
  QueryBehavior,
  QueryFunction,
  QueryKey,
  QueryMeta,
  QueryOptions,
  QueryStatus,
  SetDataOptions,
} from './types'
import type { QueryCache } from './queryCache'
import type { QueryObserver } from './queryObserver'
import type { Retryer } from './retryer'

interface QueryConfig<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> {
  cache: QueryCache
  queryKey: TQueryKey
  queryHash: string
  options?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>
  defaultOptions?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>
  state?: QueryState<TData, TError>
}

export interface QueryState<TData = unknown, TError = DefaultError> {
  data: TData | undefined
  dataUpdateCount: number
  dataUpdatedAt: number
  error: TError | null
  errorUpdateCount: number
  errorUpdatedAt: number
  fetchFailureCount: number
  fetchFailureReason: TError | null
  fetchMeta: FetchMeta | null
  isInvalidated: boolean
  status: QueryStatus
  fetchStatus: FetchStatus
}

export interface FetchMeta {
  fetchMore?: { direction: 'forward' | 'backward'; pageIndex?: number }
  fetchNextPage?: boolean
  fetchPreviousPage?: boolean
}

export interface FetchOptions<TData = unknown> {
  cancelRefetch?: boolean
  initialPromise?: Promise<TData>
  meta?: FetchMeta
}

interface AbortSignalWithConsumed extends AbortSignal {
  consumed?: boolean
}

export type QueryAction<TData, TError> =
  | { type: 'failed'; failureCount: number; error: TError }
  | { type: 'pause' }
  | { type: 'continue' }
  | { type: 'fetch'; meta: FetchMeta | null }
  | { type: 'success'; data: TData; dataUpdatedAt?: number; manual?: boolean }
  | { type: 'error'; error: TError }
  | { type: 'invalidate' }
  | { type: 'setState'; state: Partial<QueryState<TData, TError>>; setStateOptions?: SetDataOptions }

function getDefaultState<TData, TError>(
  options: QueryOptions<TData, TError, any, any>,
): QueryState<TData, TError> {
  const data =
    typeof options.initialData === 'function'
      ? (options.initialData as InitialDataFunction<TData>)()
      : options.initialData

  const hasInitialData = options.initialData !== undefined

  const initialDataUpdatedAt = hasInitialData
    ? typeof options.initialDataUpdatedAt === 'function'
      ? options.initialDataUpdatedAt()
      : options.initialDataUpdatedAt
    : 0

  return {
    data,
    dataUpdateCount: 0,
    dataUpdatedAt: hasInitialData ? (initialDataUpdatedAt ?? Date.now()) : 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    isInvalidated: false,
    status: hasInitialData ? 'success' : 'pending',
    fetchStatus: 'idle',
  }
}

type InitialDataFunction<T> = () => T | undefined

export class Query<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> extends Removable {
  queryKey: TQueryKey
  queryHash: string
  options!: QueryOptions<TQueryFnData, TError, TData, TQueryKey>
  initialState: QueryState<TData, TError>
  revertState?: QueryState<TData, TError>
  state: QueryState<TData, TError>
  isFetchingOptimistic?: boolean

  #initialOptions?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>
  #observers: Array<QueryObserver<any, any, any, any, any>>
  #cache: QueryCache
  #promise?: Promise<TData>
  #retryer?: Retryer<TData>
  #abortSignalConsumed: boolean
  #defaultOptions?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>

  constructor(config: QueryConfig<TQueryFnData, TError, TData, TQueryKey>) {
    super()

    this.#abortSignalConsumed = false
    this.#defaultOptions = config.defaultOptions
    this.#initialOptions = config.options
    this.#observers = []
    this.#cache = config.cache
    this.queryKey = config.queryKey
    this.queryHash = config.queryHash
    this.initialState = (config.state || getDefaultState(this.setOptions(config.options))) as QueryState<TData, TError>
    this.state = this.initialState
    this.scheduleGc()
  }

  get meta(): QueryMeta | undefined {
    return this.options.meta
  }

  get promise(): Promise<TData> | undefined {
    return this.#promise
  }

  private setOptions(
    options?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): QueryOptions<TQueryFnData, TError, TData, TQueryKey> {
    this.options = { ...this.#defaultOptions, ...options }

    this.updateGcTime(this.options.gcTime)

    return this.options
  }

  protected optionalRemove() {
    if (!this.#observers.length && this.state.fetchStatus === 'idle') {
      this.#cache.remove(this)
    }
  }

  setDefaultOptions(
    options?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ) {
    this.#defaultOptions = options
  }

  setInitialData(data: TData, updatedAt?: number) {
    this.#initialOptions = {
      ...this.#initialOptions,
      initialData: data,
      initialDataUpdatedAt: updatedAt,
    }
  }

  isActive(): boolean {
    return this.#observers.some((observer) => {
      const options = observer.options as QueryObserverOptionsWithEnabled
      return resolveQueryEnabled(options.enabled, this as Query<any, any, any, any>) !== false
    })
  }

  isDisabled(): boolean {
    return this.getObserversCount() > 0 && !this.isActive()
  }

  isStale(): boolean {
    if (this.state.isInvalidated) {
      return true
    }
    if (this.getObserversCount() > 0) {
      return this.#observers.some((observer) =>
        observer.getCurrentResult().isStale,
      )
    }
    return this.state.data === undefined
  }

  isStaleByTime(staleTime = 0): boolean {
    return (
      this.state.isInvalidated ||
      this.state.data === undefined ||
      !timeUntilStale(this.state.dataUpdatedAt, staleTime)
    )
  }

  onFocus(): void {
    const observer = this.#observers.find((x) => x.shouldFetchOnWindowFocus())
    observer?.refetch({ cancelRefetch: false })

    this.#retryer?.continue()
  }

  onOnline(): void {
    const observer = this.#observers.find((x) => x.shouldFetchOnReconnect())
    observer?.refetch({ cancelRefetch: false })

    this.#retryer?.continue()
  }

  addObserver(observer: QueryObserver<any, any, any, any, any>): void {
    if (!this.#observers.includes(observer)) {
      this.#observers.push(observer)
      this.clearGcTimeout()
      this.#cache.notify({ type: 'observerAdded', query: this, observer })
    }
  }

  removeObserver(observer: QueryObserver<any, any, any, any, any>): void {
    if (this.#observers.includes(observer)) {
      this.#observers = this.#observers.filter((x) => x !== observer)

      if (!this.#observers.length) {
        if (this.#retryer) {
          if (this.#abortSignalConsumed) {
            this.#retryer.cancel({ revert: (this.options as any).cancelRefetches })
          } else {
            this.#retryer.cancelRetry()
          }
        }
        this.scheduleGc()
      }

      this.#cache.notify({ type: 'observerRemoved', query: this, observer })
    }
  }

  getObserversCount(): number {
    return this.#observers.length
  }

  invalidate(): void {
    if (!this.state.isInvalidated) {
      this.dispatch({ type: 'invalidate' })
    }
  }

  fetch(
    options?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    fetchOptions?: FetchOptions<TData>,
  ): Promise<TData> {
    if (this.state.fetchStatus !== 'idle') {
      if (this.state.data !== undefined && fetchOptions?.cancelRefetch) {
        this.cancel({ silent: true })
      } else if (this.#promise) {
        this.#retryer?.continueRetry()
        return this.#promise
      }
    }

    if (options) {
      this.setOptions(options)
    }

    if (!this.options.queryFn) {
      const observer = this.#observers.find((x) => x.options.queryFn)
      if (observer) {
        this.setOptions(observer.options as unknown as QueryOptions<TQueryFnData, TError, TData, TQueryKey>)
      }
    }

    if (process.env['NODE_ENV'] !== 'production') {
      if (!Array.isArray(this.options.queryKey)) {
        console.error(
          `As of v4, queryKey needs to be an Array. If you are using a string like 'repoData', please change it to an Array, e.g. ['repoData']`,
        )
      }
    }

    const abortController = new AbortController()

    const addSignalProperty = (object: unknown) => {
      addConsumeAwareSignal(
        object,
        () => abortController.signal,
        () => {
          this.#abortSignalConsumed = true
        },
      )
    }

    const fetchFn = () => {
      const queryFn = ensureQueryFn(this.options, fetchOptions as any)
      const queryFnContext: QueryFunctionContext = {
        queryKey: this.queryKey,
        meta: this.meta,
      }

      addSignalProperty(queryFnContext)

      this.#abortSignalConsumed = false
      if (this.options.behavior?.onFetch) {
        this.options.behavior.onFetch(
          {
            fetchOptions,
            options: this.options,
            queryKey: this.queryKey,
            state: this.state as any,
            fetchFn: () => queryFn(queryFnContext as any),
            signal: abortController.signal,
            client: this.#cache.getQueryClient?.() as any,
          },
          this as any,
        )
        return (this.state as any).__fetchFnResult
      }
      return queryFn(queryFnContext as any)
    }

    this.#retryer = createRetryer({
      initialPromise: fetchOptions?.initialPromise as Promise<TData> | undefined,
      fn: fetchFn as () => Promise<TData>,
      onCancel: () => {
        if (!this.#observers.length) return
        this.dispatch({ type: 'cancelled' as any })
      },
      onFail: (failureCount, error) => {
        this.dispatch({ type: 'failed', failureCount, error })
      },
      onPause: () => {
        this.dispatch({ type: 'pause' })
      },
      onContinue: () => {
        this.dispatch({ type: 'continue' })
      },
      retry: this.options.retry,
      retryDelay: this.options.retryDelay,
      networkMode: this.options.networkMode,
      canRun: () => true,
    })

    this.#promise = this.#retryer.start().then(
      (data) => {
        this.dispatch({
          type: 'success',
          data,
        })
        return data
      },
      (error) => {
        this.dispatch({
          type: 'error',
          error: error as TError,
        })
        throw error
      },
    )

    this.dispatch({ type: 'fetch', meta: fetchOptions?.meta ?? null })

    return this.#promise
  }

  private dispatch(action: QueryAction<TData, TError>): void {
    const reducer = (
      state: QueryState<TData, TError>,
    ): QueryState<TData, TError> => {
      switch (action.type) {
        case 'failed':
          return {
            ...state,
            fetchFailureCount: action.failureCount,
            fetchFailureReason: action.error,
          }
        case 'pause':
          return {
            ...state,
            fetchStatus: 'paused',
          }
        case 'continue':
          return {
            ...state,
            fetchStatus: 'fetching',
          }
        case 'fetch':
          return {
            ...state,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: action.meta ?? null,
            ...(state.fetchStatus === 'idle' ? { fetchStatus: 'fetching' } : {}),
            ...(state.status === 'pending' || (state.data !== undefined && canFetch(this.options.networkMode))
              ? { fetchStatus: 'fetching' }
              : { fetchStatus: state.fetchStatus }),
            fetchStatus: canFetch(this.options.networkMode) ? 'fetching' : 'paused',
            isInvalidated: false,
          }
        case 'success':
          return {
            ...state,
            data: replaceData(state.data, action.data, this.options),
            dataUpdateCount: state.dataUpdateCount + 1,
            dataUpdatedAt: action.dataUpdatedAt ?? Date.now(),
            error: null,
            isInvalidated: false,
            status: 'success',
            fetchStatus: 'idle',
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
          }
        case 'error': {
          const error = action.error as unknown

          if (error instanceof Error && error.name === 'AbortError') {
            return { ...state, fetchStatus: 'idle' }
          }

          return {
            ...state,
            error: action.error,
            errorUpdateCount: state.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: state.fetchFailureCount + 1,
            fetchFailureReason: action.error,
            fetchMeta: null,
            fetchStatus: 'idle',
            status: 'error',
          }
        }
        case 'invalidate':
          return {
            ...state,
            isInvalidated: true,
          }
        case 'setState':
          return {
            ...state,
            ...action.state,
          }
        default:
          return state
      }
    }

    this.state = reducer(this.state)

    notifyManager.batch(() => {
      this.#observers.forEach((observer) => {
        observer.onQueryUpdate()
      })

      this.#cache.notify({ type: 'updated', query: this, action })
    })
  }

  cancel(options?: { revert?: boolean; silent?: boolean }): Promise<void> {
    const promise = this.#promise
    this.#retryer?.cancel(options)
    return promise ? promise.then(noop).catch(noop) : Promise.resolve()
  }

  setState(
    state: Partial<QueryState<TData, TError>>,
    setStateOptions?: SetDataOptions,
  ): void {
    this.dispatch({ type: 'setState', state, setStateOptions })
  }

  getObservers(): Array<QueryObserver<any, any, any, any, any>> {
    return this.#observers
  }
}

function noop() {}

interface QueryFunctionContext {
  queryKey: QueryKey
  meta: QueryMeta | undefined
  signal?: AbortSignal
}

interface QueryObserverOptionsWithEnabled {
  enabled?: unknown
}

function resolveQueryEnabled(
  enabled: unknown,
  query: Query<any, any, any, any>,
): boolean | undefined {
  if (typeof enabled === 'function') {
    return (enabled as (query: Query) => boolean)(query)
  }
  return enabled as boolean | undefined
}
