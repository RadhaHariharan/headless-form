import type { PersistedClient, Persister } from '@headlesskit/query-persist-client-core'

export interface StoragePersisterOptions {
  storage: Storage | null | undefined
  serialize?: (client: PersistedClient) => string
  deserialize?: (cachedString: string) => PersistedClient
  key?: string
  throttleTime?: number
  retry?: (persistedClient: PersistedClient, error: Error) => PersistedClient | undefined
}

export interface Storage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function createSyncStoragePersister({
  storage,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  key = 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime = 1000,
  retry,
}: StoragePersisterOptions): Persister {
  if (!storage) {
    return {
      persistClient: noop,
      restoreClient: async () => undefined,
      removeClient: noop,
    }
  }

  let throttleTimeout: ReturnType<typeof setTimeout> | undefined
  let pendingClient: PersistedClient | undefined

  const storageKey = key

  const trySave = (client: PersistedClient): Error | undefined => {
    try {
      storage.setItem(storageKey, serialize(client))
      return undefined
    } catch (error) {
      return error as Error
    }
  }

  return {
    persistClient: async (persistedClient: PersistedClient) => {
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
      pendingClient = persistedClient
      throttleTimeout = setTimeout(() => {
        if (pendingClient !== undefined) {
          let client: PersistedClient | undefined = pendingClient
          let error = trySave(client)
          if (error && retry) {
            do {
              client = retry(client, error)
              if (!client) break
              error = trySave(client)
            } while (error)
          }
          pendingClient = undefined
        }
      }, throttleTime)
    },
    restoreClient: async () => {
      const cacheString = storage.getItem(storageKey)
      if (!cacheString) {
        return undefined
      }
      return deserialize(cacheString) as PersistedClient
    },
    removeClient: async () => {
      storage.removeItem(storageKey)
    },
  }
}

async function noop(): Promise<void> {}
