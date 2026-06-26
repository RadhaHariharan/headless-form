import type { StateCreator, StoreMutatorIdentifier } from '../vanilla.js'
import type { NamedSet } from './devtools.js'

type Write<T, U> = Omit<T, keyof U> & U

type Action = { type: string }

type StoreReducerMutator<A> = {
  dispatch: (a: A) => A
  dispatchFromDevtools: true
}

type ReducerState<A> = {
  dispatch: StoreReducerMutator<A>['dispatch']
}

type WithReducer<S, A> = Write<S, StoreReducerMutator<A>>

type ReducerMiddleware = <
  T,
  A extends Action,
  Cms extends [StoreMutatorIdentifier, unknown][] = [],
>(
  reducer: (state: T, action: A) => T,
  initialState: T,
) => StateCreator<Write<T, ReducerState<A>>, Cms, [['headlesskit/reducer', A]]>

declare module '../vanilla.js' {
  interface StoreMutators<S, A> {
    'headlesskit/reducer': WithReducer<S, A>
  }
}

type ReducerMiddlewareImpl = <T, A extends Action>(
  reducer: (state: T, action: A) => T,
  initialState: T,
) => StateCreator<T & ReducerState<A>, [], []>

const reducerMiddlewareImpl: ReducerMiddlewareImpl = (reducer, initial) => (set, _get, api) => {
  type S = typeof initial
  type A = Parameters<typeof reducer>[1]
  ;(api as any).dispatch = (action: A) => {
    ;(set as NamedSet<S>)((state: S) => reducer(state, action), false, action)
    return action
  }
  ;(api as any).dispatchFromDevtools = true

  return { dispatch: (...args) => (api as any).dispatch(...args), ...initial }
}
export const reducerMiddleware = reducerMiddlewareImpl as unknown as ReducerMiddleware
