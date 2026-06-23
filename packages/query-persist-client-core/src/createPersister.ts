import type { QueryClient, QueryKey, QueryState } from '@headless-form/query-core'

export type StorageValue = string

export interface AsyncStorage {
  getItem: (key: string) => Promise<StorageValue | null | undefined>
  setItem: (key: string, value: StorageValue) => Promise<unknown>
  removeItem: (key: string) => Promise<void>
}

export interface SyncStorage {
  getItem: (key: string) => StorageValue | null | undefined
  setItem: (key: string, value: StorageValue) => unknown
  removeItem: (key: string) => void
}

export type Storage = AsyncStorage | SyncStorage

export interface PersisterOptions<TStorage extends Storage = Storage> {
  storage: TStorage
  key?: string
  maxAge?: number
  serialize?: (persistedQuery: PersistedQuery) => StorageValue
  deserialize?: (cachedString: StorageValue) => PersistedQuery
  prefix?: string
  buster?: string
}

interface PersistedQuery {
  state: QueryState<unknown, unknown>
  queryKey: QueryKey
  queryHash: string
  buster: string
  timestamp: number
}

export function experimental_createPersister<T = unknown>({
  storage,
  key,
  maxAge = 1000 * 60 * 60 * 24,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  prefix = 'rq',
  buster = '',
}: PersisterOptions) {
  return {
    persisterFn: async (
      queryFn: (context: any) => Promise<T>,
      context: any,
      query: any,
    ): Promise<T> => {
      const storageKey = `${prefix}-${query.queryHash}`

      const storedItem = await storage.getItem(storageKey)

      if (storedItem) {
        try {
          const persistedQuery = deserialize(storedItem)
          const isExpired = Date.now() - persistedQuery.timestamp > maxAge
          const isBusted = persistedQuery.buster !== buster

          if (!isExpired && !isBusted && persistedQuery.state.status === 'success') {
            const queryState = persistedQuery.state
            query.setState(queryState as any)
            return queryState.data as T
          }
        } catch {
          // ignore parse errors
        }
      }

      const data = await queryFn(context)

      const persistedQuery: PersistedQuery = {
        state: {
          ...query.state,
          data,
          status: 'success',
          dataUpdatedAt: Date.now(),
        } as any,
        queryKey: query.queryKey,
        queryHash: query.queryHash,
        buster,
        timestamp: Date.now(),
      }

      try {
        await storage.setItem(storageKey, serialize(persistedQuery))
      } catch {
        // ignore storage errors
      }

      return data
    },
  }
}
