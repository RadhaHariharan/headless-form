import { noop } from './utils'

interface Fulfilled<T> {
  status: 'fulfilled'
  value: T
}
interface Rejected {
  status: 'rejected'
  reason: unknown
}
interface Pending<T> {
  status: 'pending'
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export type FulfilledThenable<T> = Promise<T> & Fulfilled<T>
export type RejectedThenable<T> = Promise<T> & Rejected
export type PendingThenable<T> = Promise<T> & Pending<T>

export type Thenable<T> =
  | FulfilledThenable<T>
  | RejectedThenable<T>
  | PendingThenable<T>

export function pendingThenable<T>(): PendingThenable<T> {
  let resolve: Pending<T>['resolve']
  let reject: Pending<T>['reject']
  const thenable = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  }) as PendingThenable<T>

  thenable.status = 'pending'
  thenable.catch(() => {
    // prevent unhandled rejection errors
  })

  function finalize(data: Fulfilled<T> | Rejected) {
    Object.assign(thenable, data)
    delete (thenable as Partial<PendingThenable<T>>).resolve
    delete (thenable as Partial<PendingThenable<T>>).reject
  }

  thenable.resolve = (value) => {
    finalize({ status: 'fulfilled', value })
    resolve(value)
  }
  thenable.reject = (reason) => {
    finalize({ status: 'rejected', reason })
    reject(reason)
  }

  return thenable
}

export function tryResolveSync(promise: Promise<unknown> | Thenable<unknown>) {
  let data: unknown

  promise
    .then((result) => {
      data = result
      return result
    }, noop)
    ?.catch(noop)

  if (data !== undefined) {
    return { data }
  }

  return undefined
}
