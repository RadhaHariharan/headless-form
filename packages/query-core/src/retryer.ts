import { focusManager } from './focusManager'
import { onlineManager } from './onlineManager'
import { pendingThenable } from './thenable'
import { environmentManager } from './environmentManager'
import { sleep } from './utils'
import type { Thenable } from './thenable'
import type { CancelOptions, DefaultError, NetworkMode } from './types'

interface RetryerConfig<TData = unknown, TError = DefaultError> {
  fn: () => TData | Promise<TData>
  initialPromise?: Promise<TData>
  onCancel?: (error: TError) => void
  onFail?: (failureCount: number, error: TError) => void
  onPause?: () => void
  onContinue?: () => void
  retry?: RetryValue<TError>
  retryDelay?: RetryDelayValue<TError>
  networkMode: NetworkMode | undefined
  canRun: () => boolean
}

export interface Retryer<TData = unknown> {
  promise: Promise<TData>
  cancel: (cancelOptions?: CancelOptions) => void
  continue: () => Promise<unknown>
  cancelRetry: () => void
  continueRetry: () => void
  canStart: () => boolean
  start: () => Promise<TData>
  status: () => 'pending' | 'resolved' | 'rejected'
}

export type RetryValue<TError> = boolean | number | ShouldRetryFunction<TError>

type ShouldRetryFunction<TError = DefaultError> = (
  failureCount: number,
  error: TError,
) => boolean

export type RetryDelayValue<TError> = number | RetryDelayFunction<TError>

type RetryDelayFunction<TError = DefaultError> = (
  failureCount: number,
  error: TError,
) => number

function defaultRetryDelay(failureCount: number) {
  return Math.min(1000 * 2 ** failureCount, 30000)
}

export function canFetch(networkMode: NetworkMode | undefined): boolean {
  return (networkMode ?? 'online') === 'online'
    ? onlineManager.isOnline()
    : true
}

export class CancelledError extends Error {
  revert?: boolean
  silent?: boolean
  constructor(options?: CancelOptions) {
    super('CancelledError')
    this.revert = options?.revert
    this.silent = options?.silent
  }
}

/** @deprecated Use instanceof `CancelledError` instead. */
export function isCancelledError(value: any): value is CancelledError {
  return value instanceof CancelledError
}

export function createRetryer<TData = unknown, TError = DefaultError>(
  config: RetryerConfig<TData, TError>,
): Retryer<TData> {
  let isRetryCancelled = false
  let failureCount = 0
  let continueFn: ((value?: unknown) => void) | undefined

  const thenable = pendingThenable<TData>()

  const isResolved = () =>
    (thenable.status as Thenable<TData>['status']) !== 'pending'

  const cancel = (cancelOptions?: CancelOptions): void => {
    if (!isResolved()) {
      const error = new CancelledError(cancelOptions) as TError
      reject(error)
      config.onCancel?.(error)
    }
  }

  const cancelRetry = () => {
    isRetryCancelled = true
  }

  const continueRetry = () => {
    isRetryCancelled = false
  }

  const canContinue = () =>
    focusManager.isFocused() &&
    (config.networkMode === 'always' || onlineManager.isOnline()) &&
    config.canRun()

  const canStart = () => canFetch(config.networkMode) && config.canRun()

  const resolve = (value: any) => {
    if (!isResolved()) {
      continueFn?.()
      thenable.resolve(value)
    }
  }

  const reject = (value: any) => {
    if (!isResolved()) {
      continueFn?.()
      thenable.reject(value)
    }
  }

  const pause = () => {
    return new Promise((continueResolve) => {
      continueFn = (value) => {
        if (isResolved() || canContinue()) {
          continueResolve(value)
        }
      }
      config.onPause?.()
    }).then(() => {
      continueFn = undefined
      if (!isResolved()) {
        config.onContinue?.()
      }
    })
  }

  const run = () => {
    if (isResolved()) {
      return
    }

    let promiseOrValue: any

    const initialPromise =
      failureCount === 0 ? config.initialPromise : undefined

    try {
      promiseOrValue = initialPromise ?? config.fn()
    } catch (error) {
      promiseOrValue = Promise.reject(error)
    }

    Promise.resolve(promiseOrValue)
      .then(resolve)
      .catch((error) => {
        if (isResolved()) {
          return
        }

        const retry = config.retry ?? (environmentManager.isServer() ? 0 : 3)
        const retryDelay = config.retryDelay ?? defaultRetryDelay
        const delay =
          typeof retryDelay === 'function'
            ? retryDelay(failureCount, error)
            : retryDelay
        const shouldRetry =
          retry === true ||
          (typeof retry === 'number' && failureCount < retry) ||
          (typeof retry === 'function' && retry(failureCount, error))

        if (isRetryCancelled || !shouldRetry) {
          reject(error)
          return
        }

        failureCount++

        config.onFail?.(failureCount, error)

        sleep(delay)
          .then(() => {
            return canContinue() ? undefined : pause()
          })
          .then(() => {
            if (isRetryCancelled) {
              reject(error)
            } else {
              run()
            }
          })
      })
  }

  return {
    promise: thenable,
    status: () => thenable.status,
    cancel,
    continue: () => {
      continueFn?.()
      return thenable
    },
    cancelRetry,
    continueRetry,
    canStart,
    start: () => {
      if (canStart()) {
        run()
      } else {
        pause().then(run)
      }
      return thenable
    },
  }
}
