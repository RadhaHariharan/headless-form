import type { DehydratedState } from '@headlesskit/query-core'

export type { AsyncStorage, SyncStorage, Storage, PersisterOptions, StorageValue } from './createPersister'
export { experimental_createPersister } from './createPersister'

export {
  persistQueryClient,
  persistQueryClientRestore,
  persistQueryClientSave,
  persistQueryClientSubscribe,
} from './persist'

export type { RetryConfig } from './retryStrategies'
export { defaultRetry, defaultRetryDelay } from './retryStrategies'

export interface PersistedClient {
  timestamp: number
  buster: string
  clientState: DehydratedState
}

export interface Persister {
  persistClient(persistedClient: PersistedClient): Promise<void>
  restoreClient(): Promise<PersistedClient | undefined>
  removeClient(): Promise<void>
}

export interface PersisterCallbacks {
  onSuccess?: () => Promise<unknown> | unknown
  onError?: (error: unknown) => Promise<unknown> | unknown
}
