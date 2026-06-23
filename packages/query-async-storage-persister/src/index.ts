import { asyncThrottle } from './asyncThrottle'
import type { PersistedClient, Persister } from '@headless-form/query-persist-client-core'

export { asyncThrottle }

export interface AsyncStoragePersisterOptions {
  storage: AsyncStorage | undefined | null
  serialize?: (client: PersistedClient) => string
  deserialize?: (cachedString: string) => PersistedClient
  key?: string
  throttleTime?: number
}

export interface AsyncStorage {
  getItem: (key: string) => Promise<string | null | undefined>
  setItem: (key: string, value: string) => Promise<unknown>
  removeItem: (key: string) => Promise<void>
}

export function createAsyncStoragePersister({
  storage,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  key = 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime = 1000,
}: AsyncStoragePersisterOptions): Persister {
  if (!storage) {
    return {
      persistClient: async () => undefined,
      restoreClient: async () => undefined,
      removeClient: async () => undefined,
    }
  }

  const storageKey = key

  const throttledPersist = asyncThrottle(
    async (persistedClient: PersistedClient) => {
      await storage.setItem(storageKey, serialize(persistedClient))
    },
    { interval: throttleTime },
  )

  return {
    persistClient: async (persistedClient: PersistedClient) => {
      throttledPersist(persistedClient)
    },
    restoreClient: async () => {
      const cacheString = await storage.getItem(storageKey)
      if (!cacheString) {
        return undefined
      }
      return deserialize(cacheString) as PersistedClient
    },
    removeClient: async () => {
      await storage.removeItem(storageKey)
    },
  }
}
