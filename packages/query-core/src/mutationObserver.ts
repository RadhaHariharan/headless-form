import { notifyManager } from './notifyManager'
import { Subscribable } from './subscribable'
import { shallowEqualObjects } from './utils'
import type {
  DefaultError,
  MutateFunction,
  MutateOptions,
  MutationObserverOptions,
  MutationObserverResult,
} from './types'
import type { Mutation } from './mutation'
import type { MutationState } from './mutation'
import type { QueryClient } from './queryClient'

type MutationObserverListener<TData, TError, TVariables, TContext> = (
  result: MutationObserverResult<TData, TError, TVariables, TContext>,
) => void

export class MutationObserver<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> extends Subscribable<
  MutationObserverListener<TData, TError, TVariables, TContext>
> {
  options!: MutationObserverOptions<TData, TError, TVariables, TContext>

  #client: QueryClient
  #currentResult!: MutationObserverResult<TData, TError, TVariables, TContext>
  #currentMutation?: Mutation<TData, TError, TVariables, TContext>
  #mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>

  constructor(
    client: QueryClient,
    options: MutationObserverOptions<TData, TError, TVariables, TContext>,
  ) {
    super()
    this.#client = client
    this.setOptions(options)
    this.bindMethods()
    this.#updateResult()
  }

  protected bindMethods(): void {
    this.mutate = this.mutate.bind(this)
    this.reset = this.reset.bind(this)
  }

  setOptions(
    options: MutationObserverOptions<TData, TError, TVariables, TContext>,
  ) {
    const prevOptions = this.options
    this.options = this.#client.defaultMutationOptions(options)
    if (!shallowEqualObjects(prevOptions, this.options)) {
      this.#client.getMutationCache().notify({
        type: 'observerAdded',
        mutation: this.#currentMutation!,
        observer: this as any,
      })
    }
    this.#currentMutation?.setOptions(this.options)
  }

  protected onUnsubscribe(): void {
    if (!this.hasListeners()) {
      this.#currentMutation?.removeObserver(this)
    }
  }

  onMutationUpdate(action: { type: string }): void {
    this.#updateResult()
    this.#notify()
  }

  getCurrentResult(): MutationObserverResult<TData, TError, TVariables, TContext> {
    return this.#currentResult
  }

  reset(): void {
    this.#currentMutation = undefined
    this.#updateResult()
    this.#notify()
  }

  mutate(
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>,
  ): Promise<TData> {
    this.#mutateOptions = options

    this.#currentMutation?.removeObserver(this)
    this.#currentMutation = this.#client
      .getMutationCache()
      .build(this.#client, this.options)
    this.#currentMutation.addObserver(this)

    return this.#currentMutation.execute(variables)
  }

  #updateResult(): void {
    const state = this.#currentMutation?.state ?? {
      context: undefined,
      data: undefined,
      error: null,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      status: 'idle' as const,
      variables: undefined,
      submittedAt: 0,
    }

    this.#currentResult = {
      ...state,
      isIdle: state.status === 'idle',
      isPending: state.status === 'pending',
      isSuccess: state.status === 'success',
      isError: state.status === 'error',
      mutate: this.mutate as MutateFunction<TData, TError, TVariables, TContext>,
      reset: this.reset,
    }
  }

  #notify(): void {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(this.#currentResult)
      })
    })
  }
}
