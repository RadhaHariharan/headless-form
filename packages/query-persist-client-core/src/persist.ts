import type { QueryClient } from '@headless-form/query-core'
import type { PersistedClient, Persister, PersisterCallbacks } from './index'

interface PersistQueryClientOptions {
  queryClient: QueryClient
  persister: Persister
  maxAge?: number
  buster?: string
  hydrateOptions?: Parameters<QueryClient['getQueryCache']> extends never ? never : undefined
  dehydrateOptions?: {
    shouldDehydrateMutation?: (mutation: any) => boolean
    shouldDehydrateQuery?: (query: any) => boolean
    serializeData?: (data: unknown) => unknown
  }
}

interface PersistQueryClientRestoreOptions extends PersistQueryClientOptions {
  deserializeData?: (data: unknown) => unknown
}

interface PersistQueryClientSubscribeOptions extends PersistQueryClientOptions {
  onSuccess?: () => Promise<unknown> | unknown
  onError?: (error: unknown) => Promise<unknown> | unknown
}

export async function persistQueryClientRestore({
  queryClient,
  persister,
  maxAge = 1000 * 60 * 60 * 24,
  buster = '',
  hydrateOptions,
  dehydrateOptions,
}: PersistQueryClientRestoreOptions) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const cachedState = await persister.restoreClient()
    if (cachedState) {
      if (cachedState.timestamp) {
        const expired = Date.now() - cachedState.timestamp > maxAge
        const busted = cachedState.buster !== buster
        if (expired || busted) {
          await persister.removeClient()
        } else {
          const { hydrate } = await import('@headless-form/query-core')
          hydrate(queryClient, cachedState.clientState)
        }
      } else {
        await persister.removeClient()
      }
    }
  } catch (_error) {
    if (process.env['NODE_ENV'] !== 'production') {
      console.error(_error)
      console.warn(
        'Encountered an error attempting to restore client cache from persisted location. As a precaution, the persisted cache will be discarded.',
      )
    }
    await persister.removeClient()
  }
}

export async function persistQueryClientSave({
  queryClient,
  persister,
  buster = '',
  dehydrateOptions,
}: Omit<PersistQueryClientOptions, 'maxAge'>) {
  const { dehydrate } = await import('@headless-form/query-core')

  const dehydratedClient = dehydrate(queryClient, dehydrateOptions)

  const persistedClient: PersistedClient = {
    buster,
    timestamp: Date.now(),
    clientState: dehydratedClient,
  }

  await persister.persistClient(persistedClient)
}

export function persistQueryClientSubscribe(
  props: PersistQueryClientSubscribeOptions,
): () => void {
  persistQueryClientRestore(props).then(
    async () => {
      await props.onSuccess?.()
    },
    async (error) => {
      await props.onError?.(error)
    },
  )

  const unsubscribe = props.queryClient
    .getQueryCache()
    .subscribe(() => {
      persistQueryClientSave(props)
    })

  return unsubscribe
}

export async function persistQueryClient(
  opts: PersistQueryClientSubscribeOptions,
): Promise<[() => void, Promise<void>]> {
  let hasUnsubscribed = false
  let unsubscribeFromQueryCache: () => void = () => void 0

  const unsubscribe = () => {
    hasUnsubscribed = true
    unsubscribeFromQueryCache()
  }

  const restorePromise = persistQueryClientRestore(opts)
    .then(async () => {
      if (!hasUnsubscribed) {
        await opts.onSuccess?.()
      }
    })
    .catch(async (error) => {
      if (!hasUnsubscribed) {
        await opts.onError?.(error)
      }
    })
    .then(() => {
      if (!hasUnsubscribed) {
        unsubscribeFromQueryCache = opts.queryClient
          .getQueryCache()
          .subscribe(() => {
            if (!hasUnsubscribed) {
              persistQueryClientSave(opts)
            }
          })
      }
    })

  return [unsubscribe, restorePromise as Promise<void>]
}
