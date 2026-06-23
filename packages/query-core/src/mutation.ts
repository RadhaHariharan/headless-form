import { notifyManager } from './notifyManager'
import { canFetch, createRetryer } from './retryer'
import { Removable } from './removable'
import type {
  DefaultError,
  MutationMeta,
  MutationOptions,
  MutationScope,
  MutationStatus,
  NetworkMode,
} from './types'
import type { MutationCache } from './mutationCache'
import type { MutationObserver } from './mutationObserver'
import type { Retryer } from './retryer'

interface MutationConfig<
  TData,
  TError,
  TVariables,
  TContext,
> {
  mutationId: number
  mutationCache: MutationCache
  options: MutationOptions<TData, TError, TVariables, TContext>
  defaultOptions?: MutationOptions<TData, TError, TVariables, TContext>
  state?: MutationState<TData, TError, TVariables, TContext>
}

export interface MutationState<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> {
  context: TContext | undefined
  data: TData | undefined
  error: TError | null
  failureCount: number
  failureReason: TError | null
  isPaused: boolean
  status: MutationStatus
  variables: TVariables | undefined
  submittedAt: number
}

type MutationAction<TData, TError, TVariables, TContext> =
  | { type: 'failed'; failureCount: number; error: TError }
  | { type: 'pause' }
  | { type: 'continue' }
  | {
      type: 'loading'
      variables?: TVariables
      context?: TContext
    }
  | { type: 'success'; data: TData }
  | { type: 'error'; error: TError }
  | { type: 'setState'; state: Partial<MutationState<TData, TError, TVariables, TContext>> }

function getDefaultState<TData, TError, TVariables, TContext>(): MutationState<
  TData,
  TError,
  TVariables,
  TContext
> {
  return {
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    status: 'idle',
    variables: undefined,
    submittedAt: 0,
  }
}

export class Mutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> extends Removable {
  state: MutationState<TData, TError, TVariables, TContext>
  options: MutationOptions<TData, TError, TVariables, TContext>
  readonly mutationId: number

  #observers: Array<MutationObserver<TData, TError, TVariables, TContext>>
  #mutationCache: MutationCache
  #retryer?: Retryer<TData>

  constructor(
    config: MutationConfig<TData, TError, TVariables, TContext>,
  ) {
    super()

    this.mutationId = config.mutationId
    this.#mutationCache = config.mutationCache
    this.#observers = []
    this.state = config.state || getDefaultState<TData, TError, TVariables, TContext>()
    this.options = {
      ...config.defaultOptions,
      ...config.options,
    }

    this.updateGcTime(this.options.gcTime)
  }

  get meta(): MutationMeta | undefined {
    return this.options.meta
  }

  get scope(): MutationScope | undefined {
    return this.options.scope
  }

  protected optionalRemove() {
    if (!this.#observers.length) {
      if (this.state.status === 'pending') {
        return
      }
      this.#mutationCache.remove(this)
    }
  }

  addObserver(observer: MutationObserver<TData, TError, TVariables, TContext>) {
    if (!this.#observers.includes(observer)) {
      this.#observers.push(observer)
      this.clearGcTimeout()
      this.#mutationCache.notify({
        type: 'observerAdded',
        mutation: this,
        observer,
      })
    }
  }

  removeObserver(
    observer: MutationObserver<TData, TError, TVariables, TContext>,
  ) {
    this.#observers = this.#observers.filter((x) => x !== observer)
    this.scheduleGc()

    this.#mutationCache.notify({
      type: 'observerRemoved',
      mutation: this,
      observer,
    })
  }

  setOptions(
    options?: MutationOptions<TData, TError, TVariables, TContext>,
  ) {
    this.options = { ...this.options, ...options }
  }

  setState(
    state: Partial<MutationState<TData, TError, TVariables, TContext>>,
  ) {
    this.dispatch({ type: 'setState', state })
  }

  async execute(variables: TVariables): Promise<TData> {
    this.#retryer = createRetryer<TData, TError>({
      fn: () => {
        if (!this.options.mutationFn) {
          return Promise.reject(new Error('No mutationFn found'))
        }
        return this.options.mutationFn(variables)
      },
      onFail: (failureCount, error) => {
        this.dispatch({ type: 'failed', failureCount, error })
      },
      onPause: () => {
        this.dispatch({ type: 'pause' })
      },
      onContinue: () => {
        this.dispatch({ type: 'continue' })
      },
      retry: this.options.retry ?? 0,
      retryDelay: this.options.retryDelay,
      networkMode: this.options.networkMode,
      canRun: () => this.#mutationCache.canRun(this),
    })

    const restored = this.state.status === 'pending'
    const startPromise = restored
      ? this.#retryer.start()
      : this.#retryer.start()

    if (!restored) {
      this.dispatch({ type: 'loading', variables })
      try {
        const data = await Promise.all([
          this.options.onMutate?.(variables),
          Promise.resolve(),
        ]).then(([context]) => context)
        if (data !== this.state.context) {
          this.dispatch({
            type: 'loading',
            context: data as TContext,
            variables: this.state.variables,
          })
        }
      } catch (error) {
        await this.#mutationCache
          .config
          .onError?.(error, variables, undefined, this as Mutation<any, any, any, any>)
        if (process.env['NODE_ENV'] !== 'production') {
          console.error(error)
        }
        throw error
      }
    }

    try {
      const data = await startPromise

      await this.#mutationCache.config.onSuccess?.(
        data,
        variables,
        this.state.context,
        this as Mutation<any, any, any, any>,
      )

      await this.options.onSuccess?.(data, variables, this.state.context as TContext)
      await this.options.onSettled?.(data, null, variables, this.state.context)
      await this.#mutationCache.config.onSettled?.(
        data,
        null,
        variables,
        this.state.context,
        this as Mutation<any, any, any, any>,
      )

      this.dispatch({ type: 'success', data })
      return data
    } catch (error) {
      try {
        await this.#mutationCache.config.onError?.(
          error,
          variables,
          this.state.context,
          this as Mutation<any, any, any, any>,
        )
        await this.options.onError?.(
          error as TError,
          variables,
          this.state.context,
        )
        await this.options.onSettled?.(
          undefined,
          error as TError,
          variables,
          this.state.context,
        )
        await this.#mutationCache.config.onSettled?.(
          undefined,
          error,
          variables,
          this.state.context,
          this as Mutation<any, any, any, any>,
        )
        throw error
      } finally {
        this.dispatch({ type: 'error', error: error as TError })
      }
    } finally {
      this.#mutationCache.runNext(this)
    }
  }

  continue(): Promise<TData> {
    return this.#retryer?.continue() as Promise<TData> ?? this.execute(this.state.variables as TVariables)
  }

  private dispatch(
    action: MutationAction<TData, TError, TVariables, TContext>,
  ): void {
    const reducer = (
      state: MutationState<TData, TError, TVariables, TContext>,
    ): MutationState<TData, TError, TVariables, TContext> => {
      switch (action.type) {
        case 'failed':
          return {
            ...state,
            failureCount: action.failureCount,
            failureReason: action.error,
          }
        case 'pause':
          return {
            ...state,
            isPaused: true,
          }
        case 'continue':
          return {
            ...state,
            isPaused: false,
          }
        case 'loading':
          return {
            ...state,
            context: action.context,
            data: undefined,
            failureCount: 0,
            failureReason: null,
            error: null,
            isPaused: !canFetch(this.options.networkMode),
            status: 'pending',
            variables: action.variables,
            submittedAt: Date.now(),
          }
        case 'success':
          return {
            ...state,
            data: action.data,
            failureCount: 0,
            failureReason: null,
            error: null,
            status: 'success',
            isPaused: false,
          }
        case 'error':
          return {
            ...state,
            data: undefined,
            error: action.error,
            failureCount: state.failureCount + 1,
            failureReason: action.error,
            isPaused: false,
            status: 'error',
          }
        case 'setState':
          return {
            ...state,
            ...action.state,
          }
        default:
          return state
      }
    }

    this.state = reducer(this.state)

    notifyManager.batch(() => {
      this.#observers.forEach((observer) => {
        observer.onMutationUpdate(action as any)
      })
      this.#mutationCache.notify({
        mutation: this,
        type: 'updated',
        action: action as any,
      })
    })
  }
}
