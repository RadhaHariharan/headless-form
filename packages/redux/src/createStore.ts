import type { Action, UnknownAction } from './types/actions'
import type {
  Dispatch,
  Unsubscribe,
  ListenerCallback,
  Observer,
  Store,
  StoreCreator,
  StoreEnhancer
} from './types/store'
import type { Reducer } from './types/reducers'
import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'
import { kindOf } from './utils/kindOf'
import { formatProdErrorMessage } from './utils/formatProdErrorMessage'

export function createStore<
  S,
  A extends Action,
  Ext extends {} = {},
  StateExt extends {} = {}
>(
  reducer: Reducer<S, A>,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> & Ext
export function createStore<
  S,
  A extends Action,
  Ext extends {} = {},
  StateExt extends {} = {},
  PreloadedState = S
>(
  reducer: Reducer<S, A, PreloadedState>,
  preloadedState?: PreloadedState | undefined,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> & Ext
export function createStore<
  S,
  A extends Action,
  Ext extends {} = {},
  StateExt extends {} = {},
  PreloadedState = S
>(
  reducer: Reducer<S, A, PreloadedState>,
  preloadedState?: PreloadedState | StoreEnhancer<Ext, StateExt> | undefined,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> & Ext {
  if (typeof reducer !== 'function') {
    throw new Error(
      process.env['NODE_ENV'] === 'production'
        ? formatProdErrorMessage(2)
        : `Expected the root reducer to be a function. Instead, received: '${kindOf(reducer)}'`
    )
  }

  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      process.env['NODE_ENV'] === 'production'
        ? formatProdErrorMessage(0)
        : 'It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function. See https://redux.js.org/tutorials/fundamentals/part-4-store#creating-a-store-with-enhancers for an example.'
    )
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState as unknown as StoreEnhancer<Ext, StateExt>
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(1)
          : `Expected the enhancer to be a function. Instead, received: '${kindOf(enhancer)}'`
      )
    }
    return enhancer(createStore)(
      reducer,
      preloadedState as PreloadedState | undefined
    ) as Store<S, A> & Ext
  }

  let currentReducer = reducer
  let currentState: S | PreloadedState | undefined = preloadedState as S | PreloadedState | undefined
  let currentListeners: Map<number, ListenerCallback> | null = new Map()
  let nextListeners = currentListeners
  let listenerIdCounter = 0
  let isDispatching = false

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = new Map()
      currentListeners.forEach((listener, key) => {
        nextListeners.set(key, listener)
      })
    }
  }

  function getState(): S {
    if (isDispatching) {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(3)
          : 'You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.'
      )
    }
    return currentState as S
  }

  function subscribe(listener: ListenerCallback): Unsubscribe {
    if (typeof listener !== 'function') {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(4)
          : `Expected the listener to be a function. Instead, received: '${kindOf(listener)}'`
      )
    }

    if (isDispatching) {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(5)
          : 'You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details.'
      )
    }

    let isSubscribed = true
    ensureCanMutateNextListeners()
    const listenerId = listenerIdCounter++
    nextListeners.set(listenerId, listener)

    return function unsubscribe() {
      if (!isSubscribed) return

      if (isDispatching) {
        throw new Error(
          process.env['NODE_ENV'] === 'production'
            ? formatProdErrorMessage(6)
            : 'You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details.'
        )
      }

      isSubscribed = false
      ensureCanMutateNextListeners()
      nextListeners.delete(listenerId)
      currentListeners = null
    }
  }

  function dispatch(action: A) {
    if (!isPlainObject(action)) {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(7)
          : `Actions must be plain objects. Instead, received: '${kindOf(action)}'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.`
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(8)
          : 'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.'
      )
    }

    if (typeof action.type !== 'string') {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(17)
          : `Action "type" property must be a string. Instead, received: '${kindOf(action.type)}' with value: '${action.type}'`
      )
    }

    if (isDispatching) {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(9)
          : 'Reducers may not dispatch actions.'
      )
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState as S, action)
    } finally {
      isDispatching = false
    }

    const listeners = (currentListeners = nextListeners)
    listeners.forEach(listener => {
      listener()
    })

    return action
  }

  function replaceReducer(nextReducer: Reducer<S, A>): void {
    if (typeof nextReducer !== 'function') {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(10)
          : `Expected the nextReducer to be a function. Instead, received: '${kindOf(nextReducer)}'`
      )
    }

    currentReducer = nextReducer as unknown as Reducer<S, A, PreloadedState>
    dispatch({ type: ActionTypes.REPLACE } as A)
  }

  function observable() {
    const outerSubscribe = subscribe
    return {
      subscribe(observer: unknown) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError(
            process.env['NODE_ENV'] === 'production'
              ? formatProdErrorMessage(11)
              : `Expected the observer to be an object. Instead, received: '${kindOf(observer)}'`
          )
        }

        function observeState() {
          const observerAsObserver = observer as Observer<S>
          if (observerAsObserver.next) {
            observerAsObserver.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [Symbol.observable]() {
        return this
      }
    }
  }

  dispatch({ type: ActionTypes.INIT } as A)

  const store = {
    dispatch: dispatch as Dispatch<A>,
    subscribe,
    getState,
    replaceReducer,
    [Symbol.observable]: observable
  } as unknown as Store<S, A> & Ext
  return store
}

export function legacy_createStore<
  S,
  A extends Action,
  Ext extends {} = {},
  StateExt extends {} = {}
>(
  reducer: Reducer<S, A>,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> & Ext
export function legacy_createStore<
  S,
  A extends Action,
  Ext extends {} = {},
  StateExt extends {} = {},
  PreloadedState = S
>(
  reducer: Reducer<S, A, PreloadedState>,
  preloadedState?: PreloadedState | undefined,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> & Ext
export function legacy_createStore<
  S,
  A extends Action,
  Ext extends {} = {},
  StateExt extends {} = {},
  PreloadedState = S
>(
  reducer: Reducer<S, A, PreloadedState>,
  preloadedState?: PreloadedState | StoreEnhancer<Ext, StateExt> | undefined,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> & Ext {
  return createStore(reducer, preloadedState as any, enhancer)
}
