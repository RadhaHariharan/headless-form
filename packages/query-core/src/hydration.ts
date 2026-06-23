import type {
  DehydratedMutation,
  DehydratedQuery,
  DehydratedState,
  DehydrateOptions,
  HydrateOptions,
  MutationOptions,
  QueryKey,
  QueryOptions,
} from './types'
import type { Query } from './query'
import type { Mutation } from './mutation'
import type { QueryClient } from './queryClient'

function dehydrateMutation(mutation: Mutation): DehydratedMutation {
  return {
    mutationKey: mutation.options.mutationKey,
    state: mutation.state,
    ...(mutation.options.scope && { scope: mutation.options.scope }),
    ...(mutation.meta && { meta: mutation.meta }),
  }
}

function dehydrateQuery(
  query: Query,
  serializeData?: (data: unknown) => unknown,
): DehydratedQuery {
  return {
    state: {
      ...query.state,
      ...(serializeData
        ? { data: serializeData(query.state.data) }
        : {}),
    },
    queryKey: query.queryKey,
    queryHash: query.queryHash,
    ...(query.meta && { meta: query.meta }),
    ...(query.promise && {
      promise: query.promise.then((data) =>
        serializeData ? serializeData(data) : data,
      ).catch((error: Error) => {
        if (process.env['NODE_ENV'] !== 'production') {
          console.error(
            `A query that was dehydrated as pending ended up rejecting. [${query.queryHash}]: ${error}; The error will be serialized in production builds`,
          )
        }
        throw error
      }),
    }),
  }
}

export function defaultShouldDehydrateMutation(mutation: Mutation) {
  return mutation.state.status === 'pending'
}

export function defaultShouldDehydrateQuery(query: Query) {
  return query.state.status === 'success'
}

export function dehydrate(
  client: QueryClient,
  options: DehydrateOptions = {},
): DehydratedState {
  const filterMutation =
    options.shouldDehydrateMutation ?? defaultShouldDehydrateMutation

  const mutations = client
    .getMutationCache()
    .getAll()
    .flatMap((mutation) =>
      filterMutation(mutation) ? [dehydrateMutation(mutation)] : [],
    )

  const filterQuery =
    options.shouldDehydrateQuery ?? defaultShouldDehydrateQuery

  const queries = client
    .getQueryCache()
    .getAll()
    .flatMap((query) =>
      filterQuery(query)
        ? [dehydrateQuery(query, options.serializeData)]
        : [],
    )

  return { mutations, queries }
}

export function hydrate(
  client: QueryClient,
  dehydratedState: unknown,
  options?: HydrateOptions,
): void {
  if (typeof dehydratedState !== 'object' || dehydratedState === null) {
    return
  }

  const mutations =
    (dehydratedState as DehydratedState).mutations || []
  const queries = (dehydratedState as DehydratedState).queries || []

  const deserializeData = options?.deserializeData

  mutations.forEach((dehydratedMutation) => {
    const resolveMutationOptions =
      options?.defaultOptions?.dehydratedMutationToMutationOptions ??
      (options?.defaultOptions?.mutations
        ? () => options.defaultOptions!.mutations!
        : undefined)

    const mutationOptions = {
      ...(resolveMutationOptions?.(dehydratedMutation)),
      mutationKey: dehydratedMutation.mutationKey as QueryKey,
      ...(dehydratedMutation.scope && { scope: dehydratedMutation.scope }),
      ...(dehydratedMutation.meta && { meta: dehydratedMutation.meta }),
    } as MutationOptions<unknown, unknown, unknown, unknown>

    const mutation = client.getMutationCache().build(client, mutationOptions)
    mutation.setState(dehydratedMutation.state as any)
  })

  queries.forEach((dehydratedQuery) => {
    const resolveQueryOptions =
      options?.defaultOptions?.dehydratedQueryToQueryOptions ??
      (options?.defaultOptions?.queries
        ? () => options.defaultOptions!.queries!
        : undefined)

    const resolvedQueryOptions = {
      ...(resolveQueryOptions?.(dehydratedQuery)),
      queryKey: dehydratedQuery.queryKey,
      queryHash: dehydratedQuery.queryHash,
      ...(dehydratedQuery.meta && { meta: dehydratedQuery.meta }),
    } as QueryOptions<unknown, unknown, unknown, QueryKey>

    const query = client.getQueryCache().build(client, resolvedQueryOptions)

    if (query.state.dataUpdatedAt < dehydratedQuery.state.dataUpdatedAt) {
      query.setState({
        ...dehydratedQuery.state,
        data: deserializeData
          ? deserializeData(dehydratedQuery.state.data)
          : dehydratedQuery.state.data,
      } as any)
    }

    if (dehydratedQuery.promise) {
      void dehydratedQuery.promise.then(
        (data) => {
          if (query.state.status === 'pending') {
            query.setState({
              status: 'success',
              data: deserializeData ? deserializeData(data) : data,
              dataUpdatedAt: Date.now(),
            } as any)
          }
        },
        (error) => {
          if (query.state.status === 'pending') {
            query.setState({
              status: 'error',
              error,
              errorUpdatedAt: Date.now(),
            } as any)
          }
        },
      )
    }
  })
}
