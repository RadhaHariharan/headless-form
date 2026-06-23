import { QueryObserver } from './queryObserver'
import { infiniteQueryBehavior } from './infiniteQueryBehavior'
import type {
  DefaultError,
  FetchNextPageOptions,
  FetchPreviousPageOptions,
  InfiniteData,
  InfiniteQueryObserverOptions,
  InfiniteQueryObserverResult,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from './types'
import type { Query } from './query'
import type { QueryClient } from './queryClient'

export class InfiniteQueryObserver<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = InfiniteData<TQueryFnData>,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> extends QueryObserver<
  TQueryFnData,
  TError,
  TData,
  InfiniteData<TQueryData, TPageParam>,
  TQueryKey
> {
  constructor(
    client: QueryClient,
    options: InfiniteQueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey,
      TPageParam
    >,
  ) {
    super(client, options as any)
  }

  protected override bindMethods(): void {
    super.bindMethods()
    this.fetchNextPage = this.fetchNextPage.bind(this)
    this.fetchPreviousPage = this.fetchPreviousPage.bind(this)
  }

  override setOptions(
    options: QueryObserverOptions<TQueryFnData, TError, TData, InfiniteData<TQueryData, TPageParam>, TQueryKey>,
  ): void {
    ;(options as any).behavior = infiniteQueryBehavior(
      (options as unknown as InfiniteQueryObserverOptions<any, any, any, any, any, any>).maxPages,
    )
    super.setOptions(options)
  }

  override createResult(
    query: Query<TQueryFnData, TError, InfiniteData<TQueryData, TPageParam>, TQueryKey>,
    options: QueryObserverOptions<TQueryFnData, TError, TData, InfiniteData<TQueryData, TPageParam>, TQueryKey>,
  ): QueryObserverResult<TData, TError> {
    const result = super.createResult(query, options)
    const { isFetching, isError } = result
    const infiniteOptions = options as unknown as InfiniteQueryObserverOptions<
      TQueryFnData, TError, TData, TQueryData, TQueryKey, TPageParam
    >

    const isFetchingNextPage =
      isFetching &&
      (query.state as any).fetchMeta?.fetchMore?.direction === 'forward'

    const isFetchingPreviousPage =
      isFetching &&
      (query.state as any).fetchMeta?.fetchMore?.direction === 'backward'

    const data = result.data as unknown as InfiniteData<TQueryData, TPageParam> | undefined

    return {
      ...result,
      fetchNextPage: this.fetchNextPage,
      fetchPreviousPage: this.fetchPreviousPage,
      hasNextPage:
        !isError &&
        !!data &&
        infiniteOptions.getNextPageParam != null &&
        infiniteOptions.getNextPageParam(
          data.pages[data.pages.length - 1] as unknown as TQueryFnData,
          data.pages as unknown as Array<TQueryFnData>,
          data.pageParams[data.pageParams.length - 1] as TPageParam,
          data.pageParams,
        ) != null,
      hasPreviousPage:
        !isError &&
        !!data &&
        infiniteOptions.getPreviousPageParam != null &&
        infiniteOptions.getPreviousPageParam(
          data.pages[0] as unknown as TQueryFnData,
          data.pages as unknown as Array<TQueryFnData>,
          data.pageParams[0] as TPageParam,
          data.pageParams,
        ) != null,
      isFetchingNextPage,
      isFetchingPreviousPage,
    } as unknown as QueryObserverResult<TData, TError>
  }

  fetchNextPage(
    options?: FetchNextPageOptions,
  ): Promise<InfiniteQueryObserverResult<TData, TError>> {
    return this.fetch({
      ...options,
      meta: {
        fetchMore: { direction: 'forward' },
      },
    }) as Promise<InfiniteQueryObserverResult<TData, TError>>
  }

  fetchPreviousPage(
    options?: FetchPreviousPageOptions,
  ): Promise<InfiniteQueryObserverResult<TData, TError>> {
    return this.fetch({
      ...options,
      meta: {
        fetchMore: { direction: 'backward' },
      },
    }) as Promise<InfiniteQueryObserverResult<TData, TError>>
  }
}
