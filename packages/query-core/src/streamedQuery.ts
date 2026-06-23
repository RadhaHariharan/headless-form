import type { QueryKey } from './types'
import type { OmitKeyof } from './types'
import type { QueryObserverOptions } from './types'

export interface StreamedQueryOptions<TData = unknown> {
  refetchMode?: 'reset' | 'append'
}

export function experimental_createStreamedQuery<
  TData = unknown,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: StreamedQueryOptions<TData>,
) {
  return {
    behavior: {
      onFetch: (context: any, query: any) => {
        const refetchMode = options.refetchMode ?? 'reset'

        const originalFetchFn = context.fetchFn
        let chunks: Array<TData> = refetchMode === 'append'
          ? ((query.state.data as Array<TData>) ?? []).slice()
          : []

        context.fetchFn = async () => {
          const result = originalFetchFn()
          const isAsyncIterable = (r: unknown): r is AsyncIterable<TData> =>
            r != null &&
            typeof r === 'object' &&
            Symbol.asyncIterator in r

          if (isAsyncIterable(result)) {
            for await (const chunk of result) {
              chunks.push(chunk)
              query.setState({
                data: chunks.slice(),
                status: 'success',
                dataUpdatedAt: Date.now(),
              })
            }
            return chunks.slice()
          }

          return result
        }
      },
    },
  }
}
