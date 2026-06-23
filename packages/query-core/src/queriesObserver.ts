import { notifyManager } from './notifyManager'
import { QueryObserver } from './queryObserver'
import { Subscribable } from './subscribable'
import { replaceEqualDeep } from './utils'
import type {
  DefaultError,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from './types'
import type { QueryClient } from './queryClient'
import type { NotifyOptions } from './queryObserver'

function difference<T>(array1: Array<T>, array2: Array<T>): Array<T> {
  return array1.filter((x) => !array2.includes(x))
}

function replaceAt<T>(array: Array<T>, index: number, value: T): Array<T> {
  const copy = array.slice(0)
  copy[index] = value
  return copy
}

type QueriesObserverListener = (result: Array<QueryObserverResult>) => void

export interface QueriesObserverOptions<
  TCombinedResult = Array<QueryObserverResult>,
> {
  combine?: (result: Array<QueryObserverResult>) => TCombinedResult
}

export class QueriesObserver<TCombinedResult = Array<QueryObserverResult>>
  extends Subscribable<QueriesObserverListener>
{
  #client: QueryClient
  #result!: Array<QueryObserverResult>
  #queries: Array<QueryObserverOptions>
  #observers: Array<QueryObserver>
  #options?: QueriesObserverOptions<TCombinedResult>
  #combinedResult?: TCombinedResult

  constructor(
    client: QueryClient,
    queries: Array<QueryObserverOptions>,
    options?: QueriesObserverOptions<TCombinedResult>,
  ) {
    super()

    this.#client = client
    this.#queries = []
    this.#observers = []

    this.setQueries(queries, options)
  }

  protected onSubscribe(): void {
    if (this.listeners.size === 1) {
      this.#observers.forEach((observer) => {
        observer.subscribe((result) => {
          this.#onUpdate(observer, result)
        })
      })
    }
  }

  protected onUnsubscribe(): void {
    if (!this.hasListeners()) {
      this.destroy()
    }
  }

  destroy(): void {
    this.listeners = new Set()
    this.#observers.forEach((observer) => {
      observer.destroy()
    })
  }

  setQueries(
    queries: Array<QueryObserverOptions>,
    options?: QueriesObserverOptions<TCombinedResult>,
    notifyOptions?: NotifyOptions,
  ): void {
    this.#queries = queries
    this.#options = options

    notifyManager.batch(() => {
      const prevObservers = this.#observers

      const newObserverMatches = this.#findMatchingObservers(this.#queries)

      newObserverMatches.forEach((match) =>
        match.observer.setOptions(match.defaultedQueryOptions, notifyOptions),
      )

      const newObservers = newObserverMatches.map((match) => match.observer)
      const newResult = newObservers.map((observer) =>
        observer.getCurrentResult(),
      )

      const hasIndexChange = newObservers.some(
        (observer, index) => observer !== prevObservers[index],
      )
      if (prevObservers.length === newObservers.length && !hasIndexChange) {
        return
      }

      this.#observers = newObservers
      this.#result = newResult

      if (!this.hasListeners()) {
        return
      }

      difference(prevObservers, newObservers).forEach((observer) => {
        observer.destroy()
      })

      difference(newObservers, prevObservers).forEach((observer) => {
        observer.subscribe((result) => {
          this.#onUpdate(observer, result)
        })
      })

      this.#notify()
    })
  }

  #findMatchingObservers(
    queries: Array<QueryObserverOptions>,
  ): Array<{ defaultedQueryOptions: QueryObserverOptions; observer: QueryObserver }> {
    const prevObservers = this.#observers
    const defaultedQueryOptions = queries.map((options) =>
      this.#client.defaultQueryOptions(options),
    )

    const matchingObservers: Map<QueryObserver, QueryObserverOptions> =
      new Map()

    const unmatchedObservers = prevObservers.slice()

    defaultedQueryOptions.forEach((defaultedOptions) => {
      const matchIndex = unmatchedObservers.findIndex(
        (observer) => observer.options.queryHash === defaultedOptions.queryHash,
      )

      if (matchIndex !== -1) {
        const match = unmatchedObservers[matchIndex]!
        matchingObservers.set(match, defaultedOptions)
        unmatchedObservers.splice(matchIndex, 1)
      }
    })

    const outstandingObservers: Array<QueryObserver> = unmatchedObservers

    return defaultedQueryOptions.map((defaultedOptions) => {
      const matchingObserver = prevObservers.find(
        (observer) =>
          observer.options.queryHash === defaultedOptions.queryHash &&
          matchingObservers.has(observer),
      )

      if (matchingObserver) {
        return { defaultedQueryOptions: defaultedOptions, observer: matchingObserver }
      }

      const recycled = outstandingObservers.shift()
      if (recycled) {
        return { defaultedQueryOptions: defaultedOptions, observer: recycled }
      }

      return {
        defaultedQueryOptions: defaultedOptions,
        observer: new QueryObserver(this.#client, defaultedOptions),
      }
    })
  }

  #onUpdate(observer: QueryObserver, result: QueryObserverResult): void {
    const index = this.#observers.indexOf(observer)
    if (index !== -1) {
      this.#result = replaceAt(this.#result, index, result)
      this.#notify()
    }
  }

  #notify(): void {
    const combinedResult = this.#combineResult(this.#result)
    if (!replaceEqualDeep(this.#combinedResult, combinedResult)) {
      return
    }

    this.#combinedResult = combinedResult

    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(this.#result)
      })
    })
  }

  #combineResult(result: Array<QueryObserverResult>): TCombinedResult {
    const combine = this.#options?.combine
    if (combine) {
      return combine(result)
    }
    return result as unknown as TCombinedResult
  }

  getOptimisticResult(
    queries: Array<QueryObserverOptions>,
  ): [
    rawResult: Array<QueryObserverResult>,
    combineResult: (r?: Array<QueryObserverResult>) => TCombinedResult,
    trackResult: () => Array<QueryObserverResult>,
  ] {
    const matches = this.#findMatchingObservers(queries)
    const result = matches.map(({ observer, defaultedQueryOptions }) =>
      observer.getOptimisticResult(defaultedQueryOptions),
    )

    return [
      result,
      (r?: Array<QueryObserverResult>) => {
        return this.#combineResult(r ?? result)
      },
      () => {
        return matches.map(({ observer }, i) => {
          return observer.trackResult(result[i]!, (accessedProp) => {
            observer.trackProp(accessedProp as keyof QueryObserverResult)
          })
        })
      },
    ]
  }

  getCurrentResult(): Array<QueryObserverResult> {
    return this.#result
  }
}
