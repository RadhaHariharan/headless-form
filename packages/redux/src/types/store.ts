import type { Action, UnknownAction } from './actions'
import type { Reducer } from './reducers'

export interface Dispatch<A extends Action = UnknownAction> {
  <T extends A>(action: T, ...extraArgs: any[]): T
}

export interface Unsubscribe {
  (): void
}

export type ListenerCallback = () => void

declare global {
  interface SymbolConstructor {
    readonly observable: symbol
  }
}

export type Observable<T> = {
  subscribe: (observer: Observer<T>) => { unsubscribe: Unsubscribe }
  [Symbol.observable](): Observable<T>
}

export type Observer<T> = {
  next?(value: T): void
}

export interface Store<
  S = any,
  A extends Action = UnknownAction,
  StateExt extends unknown = unknown
> {
  dispatch: Dispatch<A>
  getState(): S & StateExt
  subscribe(listener: ListenerCallback): Unsubscribe
  replaceReducer(nextReducer: Reducer<S, A>): void
  [Symbol.observable](): Observable<S & StateExt>
}

export type UnknownIfNonSpecific<T> = {} extends T ? unknown : T

export interface StoreCreator {
  <S, A extends Action, Ext extends {} = {}, StateExt extends {} = {}>(
    reducer: Reducer<S, A>,
    enhancer?: StoreEnhancer<Ext, StateExt>
  ): Store<S, A, UnknownIfNonSpecific<StateExt>> & Ext
  <
    S,
    A extends Action,
    Ext extends {} = {},
    StateExt extends {} = {},
    PreloadedState = S
  >(
    reducer: Reducer<S, A, PreloadedState>,
    preloadedState?: PreloadedState | undefined,
    enhancer?: StoreEnhancer<Ext, StateExt>
  ): Store<S, A, UnknownIfNonSpecific<StateExt>> & Ext
}

export type StoreEnhancer<Ext extends {} = {}, StateExt extends {} = {}> = <
  NextExt extends {},
  NextStateExt extends {}
>(
  next: StoreEnhancerStoreCreator<NextExt, NextStateExt>
) => StoreEnhancerStoreCreator<NextExt & Ext, NextStateExt & StateExt>

export type StoreEnhancerStoreCreator<
  Ext extends {} = {},
  StateExt extends {} = {}
> = <S, A extends Action, PreloadedState>(
  reducer: Reducer<S, A, PreloadedState>,
  preloadedState?: PreloadedState | undefined
) => Store<S, A, StateExt> & Ext
