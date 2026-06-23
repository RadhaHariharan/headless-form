import { addToEnd, addToStart, ensureQueryFn } from './utils'
import type { InfiniteData, QueryBehavior, QueryKey } from './types'
import type { FetchContext } from './types'
import type { InfiniteQueryPageParamsOptions } from './types'

export function infiniteQueryBehavior<
  TQueryFnData,
  TError,
  TData,
  TPageParam,
  TQueryKey extends QueryKey = QueryKey,
>(maxPages?: number): QueryBehavior<TQueryFnData, TError, InfiniteData<TData, TPageParam>, TQueryKey> {
  return {
    onFetch: (
      context: FetchContext<TQueryFnData, TError, InfiniteData<TData, TPageParam>, TQueryKey>,
      query,
    ) => {
      const options = context.options as unknown as InfiniteQueryPageParamsOptions<TQueryFnData, TPageParam>
      const direction = context.fetchOptions?.meta?.fetchMore?.direction
      const oldPages = (context.state.data?.pages || []) as Array<TData>
      const oldPageParams = (context.state.data?.pageParams || []) as Array<TPageParam>
      let previousPageParam: TPageParam | undefined | null = undefined

      const fetchFn = ensureQueryFn(context.options as any, context.fetchOptions as any)

      const buildNewPages = (
        pages: Array<TData>,
        params: Array<TPageParam>,
        page: TData,
        param: TPageParam,
        isFetchingNextPage?: boolean,
      ) => {
        if (isFetchingNextPage) {
          return {
            pages: addToEnd(pages, page, maxPages),
            pageParams: addToEnd(params, param, maxPages),
          }
        }
        return {
          pages: addToStart(pages, page, maxPages),
          pageParams: addToStart(params, param, maxPages),
        }
      }

      if (direction === 'forward') {
        context.fetchFn = async () => {
          const nextPageParam = options.getNextPageParam(
            oldPages[oldPages.length - 1] as unknown as TQueryFnData,
            oldPages as unknown as Array<TQueryFnData>,
            oldPageParams[oldPageParams.length - 1] as TPageParam,
            oldPageParams,
          )

          const newPage = await fetchFn({
            queryKey: context.queryKey,
            pageParam: nextPageParam as TPageParam,
            direction: 'forward',
            meta: context.options.meta,
            signal: context.signal,
          } as any)

          return buildNewPages(
            oldPages,
            oldPageParams,
            newPage as unknown as TData,
            nextPageParam as TPageParam,
            true,
          )
        }
        return
      }

      if (direction === 'backward') {
        context.fetchFn = async () => {
          const prevPageParam = options.getPreviousPageParam?.(
            oldPages[0] as unknown as TQueryFnData,
            oldPages as unknown as Array<TQueryFnData>,
            oldPageParams[0] as TPageParam,
            oldPageParams,
          )

          const newPage = await fetchFn({
            queryKey: context.queryKey,
            pageParam: prevPageParam as TPageParam,
            direction: 'backward',
            meta: context.options.meta,
            signal: context.signal,
          } as any)

          return buildNewPages(
            oldPages,
            oldPageParams,
            newPage as unknown as TData,
            prevPageParam as TPageParam,
            false,
          )
        }
        return
      }

      const refetchPages = context.fetchOptions?.meta?.fetchMore?.pageIndex

      context.fetchFn = async () => {
        const pages: Array<TData> = []
        const pageParams: Array<TPageParam> = []

        let currentPage = 0

        const pagesLength = oldPages.length || 1
        const pagesMaxLength = maxPages
          ? Math.min(pagesLength, maxPages)
          : pagesLength

        while (currentPage < pagesMaxLength) {
          const param =
            currentPage === 0
              ? options.initialPageParam
              : (options.getNextPageParam(
                  pages[currentPage - 1] as unknown as TQueryFnData,
                  pages as unknown as Array<TQueryFnData>,
                  pageParams[currentPage - 1] as TPageParam,
                  pageParams,
                ) ?? undefined)

          if (param == null && currentPage > 0) break

          const fetchedPage = await fetchFn({
            queryKey: context.queryKey,
            pageParam: param,
            direction: 'forward',
            meta: context.options.meta,
            signal: context.signal,
          } as any)

          pages[currentPage] = fetchedPage as unknown as TData
          pageParams[currentPage] = param as TPageParam
          currentPage++
        }

        return { pages, pageParams }
      }
    },
  }
}
