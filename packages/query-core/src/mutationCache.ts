import { notifyManager } from './notifyManager'
import { Mutation } from './mutation'
import { matchMutation } from './utils'
import { Subscribable } from './subscribable'
import type { MutationFilters } from './utils'
import type { DefaultError, MutationKey, MutationOptions, MutationStatus } from './types'
import type { MutationState } from './mutation'
import type { MutationObserver } from './mutationObserver'
import type { QueryClient } from './queryClient'

export interface MutationCacheConfig {
  onError?: (
    error: unknown,
    variables: unknown,
    context: unknown,
    mutation: Mutation<unknown, unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown
  onSuccess?: (
    data: unknown,
    variables: unknown,
    context: unknown,
    mutation: Mutation<unknown, unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown
  onSettled?: (
    data: unknown,
    error: unknown,
    variables: unknown,
    context: unknown,
    mutation: Mutation<unknown, unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown
  onMutate?: (
    variables: unknown,
    mutation: Mutation<unknown, unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown
}

export type MutationCacheNotifyEvent =
  | {
      type: 'updated'
      mutation: Mutation<any, any, any, any>
      action: {
        type: string
        data?: unknown
        error?: unknown
        variables?: unknown
        context?: unknown
      }
    }
  | {
      type: 'added'
      mutation: Mutation<any, any, any, any>
    }
  | {
      type: 'removed'
      mutation: Mutation<any, any, any, any>
    }
  | {
      type: 'observerAdded'
      mutation: Mutation<any, any, any, any>
      observer: MutationObserver<any, any, any, any>
    }
  | {
      type: 'observerRemoved'
      mutation: Mutation<any, any, any, any>
      observer: MutationObserver<any, any, any, any>
    }

type MutationCacheListener = (event: MutationCacheNotifyEvent) => void

export class MutationCache extends Subscribable<MutationCacheListener> {
  #mutations: Array<Mutation<any, any, any, any>>
  #mutationId: number
  #scopes: Map<string, Array<Mutation<any, any, any, any>>>
  config: MutationCacheConfig

  constructor(config?: MutationCacheConfig) {
    super()
    this.config = config || {}
    this.#mutations = []
    this.#mutationId = Date.now()
    this.#scopes = new Map()
  }

  build<TData, TError, TVariables, TContext>(
    client: QueryClient,
    options: MutationOptions<TData, TError, TVariables, TContext>,
    state?: MutationState<TData, TError, TVariables, TContext>,
  ): Mutation<TData, TError, TVariables, TContext> {
    const mutation = new Mutation({
      mutationCache: this,
      mutationId: ++this.#mutationId,
      options: client.defaultMutationOptions(options),
      state,
      defaultOptions: options.mutationKey
        ? client.getMutationDefaults(options.mutationKey)
        : undefined,
    })

    this.add(mutation)
    return mutation
  }

  add(mutation: Mutation<any, any, any, any>): void {
    this.#mutations.push(mutation)
    const scope = scopeFor(mutation)
    if (scope) {
      const scopedMutations = this.#scopes.get(scope)
      if (!scopedMutations) {
        this.#scopes.set(scope, [mutation])
      } else {
        scopedMutations.push(mutation)
      }
    }
    this.notify({ type: 'added', mutation })
    this.runIfAble(mutation)
  }

  remove(mutation: Mutation<any, any, any, any>): void {
    this.#mutations = this.#mutations.filter((x) => x !== mutation)
    const scope = scopeFor(mutation)
    if (scope) {
      const scopedMutations = this.#scopes.get(scope)
      if (scopedMutations) {
        if (scopedMutations.length === 1) {
          this.#scopes.delete(scope)
        } else {
          const index = scopedMutations.indexOf(mutation)
          if (index > -1) {
            scopedMutations.splice(index, 1)
          }
        }
      }
    }
    this.notify({ type: 'removed', mutation })
  }

  canRun(mutation: Mutation<any, any, any, any>): boolean {
    const scope = scopeFor(mutation)
    if (!scope) {
      return true
    }
    const scopedMutations = this.#scopes.get(scope)
    if (!scopedMutations) return true
    const firstPending = scopedMutations.find(
      (m) => m.state.status === 'pending',
    )
    return !firstPending || firstPending === mutation
  }

  runNext(mutation: Mutation<any, any, any, any>): void {
    const scope = scopeFor(mutation)
    if (!scope) return
    const scopedMutations = this.#scopes.get(scope)
    if (!scopedMutations) return
    const nextMutation = scopedMutations.find(
      (m) => m !== mutation && m.state.isPaused,
    )
    nextMutation?.continue()
  }

  runIfAble(mutation: Mutation<any, any, any, any>): void {
    const scope = scopeFor(mutation)
    if (!scope) return
    const scopedMutations = this.#scopes.get(scope)
    if (!scopedMutations) return
    const firstPending = scopedMutations.find(
      (m) => m.state.status === 'pending',
    )
    if (!firstPending) {
      mutation.continue()
    }
  }

  clear(): void {
    notifyManager.batch(() => {
      this.#mutations.forEach((mutation) => {
        this.remove(mutation)
      })
    })
  }

  getAll(): Array<Mutation> {
    return this.#mutations
  }

  find<
    TData = unknown,
    TError = DefaultError,
    TVariables = unknown,
    TContext = unknown,
  >(
    filters: MutationFilters,
  ): Mutation<TData, TError, TVariables, TContext> | undefined {
    const defaultedFilters = { exact: true, ...filters }
    return this.#mutations.find((mutation) =>
      matchMutation(defaultedFilters, mutation),
    ) as Mutation<TData, TError, TVariables, TContext> | undefined
  }

  findAll(filters: MutationFilters = {}): Array<Mutation> {
    return this.#mutations.filter((mutation) =>
      matchMutation(filters, mutation),
    )
  }

  notify(event: MutationCacheNotifyEvent) {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event)
      })
    })
  }

  resumePausedMutations(): Promise<unknown> {
    const pausedMutations = this.#mutations.filter((x) => x.state.isPaused)
    return notifyManager.batch(() =>
      Promise.all(
        pausedMutations.map((mutation) =>
          mutation.continue().catch(noop),
        ),
      ),
    )
  }
}

function scopeFor(mutation: Mutation<any, any, any, any>) {
  return mutation.options.scope?.id
}

function noop() {}
