import type { MutationState } from './mutation'
import type { FetchOptions, Query, QueryState } from './query'
import type { RetryDelayValue, RetryValue } from './retryer'
import type { QueryFilters, SkipToken } from './utils'
import type { QueryCache } from './queryCache'
import type { MutationCache } from './mutationCache'

export type QueryKey = ReadonlyArray<unknown>

export type QueryFunction<
  T = unknown,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = [TPageParam] extends [never]
  ? (context: QueryFunctionContext<TQueryKey>) => T | Promise<T>
  : (
      context: QueryFunctionContext<TQueryKey, TPageParam>,
    ) => T | Promise<T>

export type QueryFunctionContext<
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = [TPageParam] extends [never]
  ? {
      queryKey: TQueryKey
      signal: AbortSignal
      meta: QueryMeta | undefined
      pageParam?: unknown
      direction?: unknown
      client?: unknown
    }
  : {
      queryKey: TQueryKey
      signal: AbortSignal
      pageParam: TPageParam
      direction: 'forward' | 'backward'
      meta: QueryMeta | undefined
      client?: unknown
    }

export type InitialDataFunction<T> = () => T | undefined

export type PlaceholderDataFunction<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = (
  previousData: TData | undefined,
  previousQuery: Query<TQueryFnData, TError, TData, TQueryKey> | undefined,
) => TData | undefined

export type QueriesPlaceholderDataFunction<TQueryData> = (
  previousData: TQueryData | undefined,
  previousQuery: Query | undefined,
) => TQueryData | undefined

export type QueryKeyHashFunction<TQueryKey extends QueryKey> = (
  queryKey: TQueryKey,
) => string

export type StaleTime =
  | number
  | ((query: Query) => number)
  | (((query: Query) => number) & number)

export type StaleTimeFunction<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> =
  | number
  | ((query: Query<TQueryFnData, TError, TData, TQueryKey>) => number)

export type QueryBooleanOption<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> =
  | boolean
  | ((query: Query<TQueryFnData, TError, TData, TQueryKey>) => boolean)

export type GetPreviousPageParamFunction<TPageParam, TQueryFnData = unknown> =
  (
    firstPage: TQueryFnData,
    allPages: Array<TQueryFnData>,
    firstPageParam: TPageParam,
    allPageParams: Array<TPageParam>,
  ) => TPageParam | undefined | null

export type GetNextPageParamFunction<TPageParam, TQueryFnData = unknown> = (
  lastPage: TQueryFnData,
  allPages: Array<TQueryFnData>,
  lastPageParam: TPageParam,
  allPageParams: Array<TPageParam>,
) => TPageParam | undefined | null

export interface InfiniteData<TData, TPageParam = unknown> {
  pages: Array<TData>
  pageParams: Array<TPageParam>
}

export type QueryMeta = Record<string, unknown>

export type NetworkMode = 'online' | 'always' | 'offlineFirst'

export interface QueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> {
  retry?: RetryValue<TError>
  retryDelay?: RetryDelayValue<TError>
  networkMode?: NetworkMode
  gcTime?: number
  queryFn?: QueryFunction<TQueryFnData, TQueryKey, TPageParam> | SkipToken
  queryHash?: string
  queryKey?: TQueryKey
  queryKeyHashFn?: QueryKeyHashFunction<TQueryKey>
  initialData?: TData | InitialDataFunction<TData>
  initialDataUpdatedAt?: number | (() => number | undefined)
  behavior?: QueryBehavior<TQueryFnData, TError, TData, TQueryKey>
  structuralSharing?:
    | boolean
    | ((oldData: TData | undefined, newData: TData) => TData)
  getPreviousPageParam?: GetPreviousPageParamFunction<TPageParam, TQueryFnData>
  getNextPageParam?: GetNextPageParamFunction<TPageParam, TQueryFnData>
  _defaulted?: boolean
  meta?: QueryMeta
  maxPages?: number
  staleTime?: StaleTimeFunction<TQueryFnData, TError, TData, TQueryKey>
}

export interface InitialPageParam<TPageParam = unknown> {
  initialPageParam: TPageParam
}

export interface InfiniteQueryPageParamsOptions<
  TQueryFnData = unknown,
  TPageParam = unknown,
> extends InitialPageParam<TPageParam> {
  getPreviousPageParam?: GetPreviousPageParamFunction<TPageParam, TQueryFnData>
  getNextPageParam: GetNextPageParamFunction<TPageParam, TQueryFnData>
  maxPages?: number
}

export type QueryStatus = 'pending' | 'error' | 'success'
export type FetchStatus = 'fetching' | 'paused' | 'idle'

export interface QueryObserverOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> extends QueryOptions<TQueryFnData, TError, TQueryData, TQueryKey, TPageParam> {
  enabled?: QueryBooleanOption<TQueryFnData, TError, TQueryData, TQueryKey>
  staleTime?: StaleTimeFunction<TQueryFnData, TError, TQueryData, TQueryKey>
  refetchInterval?:
    | number
    | false
    | ((
        query: Query<TQueryFnData, TError, TQueryData, TQueryKey>,
      ) => number | false | undefined)
  refetchIntervalInBackground?: boolean
  refetchOnWindowFocus?: boolean | 'always' | ((query: Query) => boolean | 'always')
  refetchOnReconnect?: boolean | 'always' | ((query: Query) => boolean | 'always')
  refetchOnMount?: boolean | 'always' | ((query: Query) => boolean | 'always')
  retryOnMount?: boolean
  notifyOnChangeProps?: NotifyOnChangeProps
  select?: (data: TQueryData) => TData
  suspense?: boolean
  placeholderData?:
    | TQueryData
    | PlaceholderDataFunction<TQueryFnData, TError, TQueryData, TQueryKey>
  subscribed?: boolean
  throwOnError?: boolean | ((error: TError, query: Query) => boolean)
}

export type NotifyOnChangeProps =
  | Array<keyof InfiniteQueryObserverResult | 'data'>
  | 'all'
  | (() => Array<keyof InfiniteQueryObserverResult | 'data'> | 'all')

export interface InfiniteQueryObserverOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = InfiniteData<TQueryFnData>,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> extends QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    InfiniteData<TQueryData, TPageParam>,
    TQueryKey,
    TPageParam
  > {
  initialPageParam: TPageParam
  getPreviousPageParam?: GetPreviousPageParamFunction<TPageParam, TQueryFnData>
  getNextPageParam: GetNextPageParamFunction<TPageParam, TQueryFnData>
  maxPages?: number
}

export type MutationKey = ReadonlyArray<unknown>

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error'

export type MutationFunction<TData = unknown, TVariables = void> = (
  variables: TVariables,
) => Promise<TData>

export interface MutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> {
  mutationFn?: MutationFunction<TData, TVariables>
  mutationKey?: MutationKey
  onMutate?: (
    variables: TVariables,
  ) => Promise<TContext | undefined> | TContext | undefined
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext,
  ) => Promise<unknown> | unknown
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<unknown> | unknown
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<unknown> | unknown
  retry?: RetryValue<TError>
  retryDelay?: RetryDelayValue<TError>
  networkMode?: NetworkMode
  gcTime?: number
  _defaulted?: boolean
  meta?: MutationMeta
  scope?: MutationScope
  throwOnError?: boolean | ((error: TError) => boolean)
}

export interface MutationMeta extends Record<string, unknown> {}

export interface MutationScope {
  id: string
}

export interface MutationObserverOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> extends MutationOptions<TData, TError, TVariables, TContext> {
  throwOnError?: boolean | ((error: TError) => boolean)
}

export type MutationObserverResult<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> = MutationState<TData, TError, TVariables, TContext> & {
  isIdle: boolean
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  mutate: MutateFunction<TData, TError, TVariables, TContext>
  reset: () => void
}

export type MutateFunction<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> = (
  variables: TVariables,
  options?: MutateOptions<TData, TError, TVariables, TContext>,
) => void

export interface MutateOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> {
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext,
  ) => Promise<unknown> | unknown
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<unknown> | unknown
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<unknown> | unknown
}

export interface QueryClientConfig {
  queryCache?: QueryCache
  mutationCache?: MutationCache
  defaultOptions?: DefaultOptions
}

export interface DefaultOptions<TError = DefaultError> {
  queries?: OmitKeyof<
    QueryObserverOptions<unknown, TError>,
    'suspense'
  >
  mutations?: MutationObserverOptions<unknown, TError, unknown, unknown>
  dehydrate?: DehydrateOptions
  hydrate?: HydrateOptions
}

export interface CancelOptions {
  revert?: boolean
  silent?: boolean
}

export interface SetDataOptions {
  updatedAt?: number
}

export type OmitKeyof<
  T,
  K extends keyof T | (string & {}),
  E extends 'safely' | 'strictly' = 'strictly',
> = E extends 'strictly'
  ? Omit<T, K & keyof T>
  : Omit<T, K extends keyof T ? K : never>

export type Override<A, B> = {
  [K in keyof A]: K extends keyof B ? B[K] : A[K]
}

export interface QueryObserverBaseResult<
  TData = unknown,
  TError = DefaultError,
> {
  data: TData | undefined
  dataUpdatedAt: number
  error: TError | null
  errorUpdatedAt: number
  failureCount: number
  failureReason: TError | null
  errorUpdateCount: number
  isError: boolean
  isFetched: boolean
  isFetchedAfterMount: boolean
  isFetching: boolean
  isLoading: boolean
  isLoadingError: boolean
  isPending: boolean
  isPlaceholderData: boolean
  isRefetchError: boolean
  isRefetching: boolean
  isStale: boolean
  isSuccess: boolean
  refetch: (
    options?: RefetchOptions,
  ) => Promise<QueryObserverResult<TData, TError>>
  status: QueryStatus
  fetchStatus: FetchStatus
  promise: Promise<TData>
}

export interface QueryObserverPendingResult<
  TData = unknown,
  TError = DefaultError,
> extends QueryObserverBaseResult<TData, TError> {
  data: undefined
  error: null
  isError: false
  isPending: true
  isLoadingError: false
  isRefetchError: false
  isSuccess: false
  status: 'pending'
}

export interface QueryObserverLoadingResult<
  TData = unknown,
  TError = DefaultError,
> extends QueryObserverBaseResult<TData, TError> {
  data: undefined
  error: null
  isError: false
  isPending: true
  isLoading: true
  isLoadingError: false
  isRefetchError: false
  isSuccess: false
  status: 'pending'
}

export interface QueryObserverLoadingErrorResult<
  TData = unknown,
  TError = DefaultError,
> extends QueryObserverBaseResult<TData, TError> {
  data: undefined
  error: TError
  isError: true
  isPending: false
  isLoadingError: true
  isRefetchError: false
  isSuccess: false
  status: 'error'
}

export interface QueryObserverRefetchErrorResult<
  TData = unknown,
  TError = DefaultError,
> extends QueryObserverBaseResult<TData, TError> {
  data: TData
  error: TError
  isError: true
  isPending: false
  isLoadingError: false
  isRefetchError: true
  isSuccess: false
  status: 'error'
}

export interface QueryObserverSuccessResult<
  TData = unknown,
  TError = DefaultError,
> extends QueryObserverBaseResult<TData, TError> {
  data: TData
  error: null
  isError: false
  isPending: false
  isLoadingError: false
  isRefetchError: false
  isSuccess: true
  status: 'success'
}

export type QueryObserverResult<TData = unknown, TError = DefaultError> =
  | QueryObserverPendingResult<TData, TError>
  | QueryObserverLoadingErrorResult<TData, TError>
  | QueryObserverRefetchErrorResult<TData, TError>
  | QueryObserverSuccessResult<TData, TError>

export interface InfiniteQueryObserverBaseResult<
  TData = unknown,
  TError = DefaultError,
> extends QueryObserverBaseResult<TData, TError> {
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<TData, TError>>
  fetchPreviousPage: (options?: FetchPreviousPageOptions) => Promise<InfiniteQueryObserverResult<TData, TError>>
  hasNextPage: boolean
  hasPreviousPage: boolean
  isFetchingNextPage: boolean
  isFetchingPreviousPage: boolean
}

export type InfiniteQueryObserverResult<
  TData = unknown,
  TError = DefaultError,
> = InfiniteQueryObserverBaseResult<TData, TError>

export interface RefetchOptions extends Pick<FetchOptions, 'cancelRefetch'> {
  throwOnError?: boolean
}

export interface FetchNextPageOptions extends RefetchOptions {
  pages?: number
}

export interface FetchPreviousPageOptions extends RefetchOptions {
  pages?: number
}

export type DefaultError = Error

export interface QueryBehavior<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> {
  onFetch: (
    context: FetchContext<TQueryFnData, TError, TData, TQueryKey>,
    query: Query,
  ) => void
}

export interface FetchContext<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> {
  fetchFn: () => unknown | Promise<unknown>
  fetchOptions?: FetchOptions
  signal: AbortSignal
  options: QueryOptions<TQueryFnData, TError, TData, TQueryKey>
  queryKey: TQueryKey
  state: QueryState<TData, TError>
  client: QueryClientLike
}

export interface QueryClientLike {
  getQueryData(queryKey: QueryKey): unknown
  setQueryData(queryKey: QueryKey, updater: unknown): unknown
  getQueryCache(): QueryCache
  getMutationCache(): MutationCache
}

export interface QueryStore {
  has: (queryHash: string) => boolean
  set: (queryHash: string, query: Query) => void
  get: (queryHash: string) => Query | undefined
  delete: (queryHash: string) => void
  values: () => IterableIterator<Query>
}

export type DehydratedMutationState = Pick<
  MutationState,
  'context' | 'data' | 'error' | 'failureCount' | 'failureReason' | 'isPaused' | 'status' | 'variables' | 'submittedAt'
>

export interface DehydratedMutation {
  mutationKey?: MutationKey
  state: DehydratedMutationState
  meta?: MutationMeta
  scope?: MutationScope
}

export interface DehydratedQuery {
  queryHash: string
  queryKey: QueryKey
  state: QueryState
  promise?: Promise<unknown>
  meta?: QueryMeta
}

export interface DehydratedState {
  mutations: Array<DehydratedMutation>
  queries: Array<DehydratedQuery>
}

export interface DehydrateOptions {
  shouldDehydrateMutation?: (mutation: import('./mutation').Mutation) => boolean
  shouldDehydrateQuery?: (query: Query) => boolean
  shouldRedactErrors?: (error: unknown) => boolean
  serializeData?: (data: unknown) => unknown
}

export interface HydrateOptions {
  defaultOptions?: {
    queries?: QueryOptions
    mutations?: MutationOptions<unknown, DefaultError, unknown, unknown>
    dehydratedMutationToMutationOptions?: (
      dehydratedMutation: DehydratedMutation,
    ) => MutationOptions<unknown, DefaultError, unknown, unknown> | undefined
    dehydratedQueryToQueryOptions?: (
      dehydratedQuery: DehydratedQuery,
    ) => QueryOptions | undefined
  }
  deserializeData?: (data: unknown) => unknown
}

export interface InfiniteQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = InfiniteData<TQueryFnData>,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> extends Omit<
    QueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
    'queryFn'
  > {
  queryFn?:
    | QueryFunction<TQueryFnData, TQueryKey, TPageParam>
    | SkipToken
  initialPageParam: TPageParam
  getPreviousPageParam?: GetPreviousPageParamFunction<TPageParam, TQueryFnData>
  getNextPageParam: GetNextPageParamFunction<TPageParam, TQueryFnData>
  maxPages?: number
}

export interface Register {
  // defaultError: Error
}

export type RegisteredError = Register extends {
  defaultError: infer TError
}
  ? TError
  : Error
