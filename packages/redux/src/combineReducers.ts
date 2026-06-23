import type { Action, UnknownAction } from './types/actions'
import type {
  Reducer,
  ReducersMapObject,
  StateFromReducersMapObject,
  ActionFromReducersMapObject,
  PreloadedStateShapeFromReducersMapObject
} from './types/reducers'
import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'
import warning from './utils/warning'
import { kindOf } from './utils/kindOf'
import { formatProdErrorMessage } from './utils/formatProdErrorMessage'

function getUnexpectedStateShapeWarningMessage(
  inputState: object,
  reducers: ReducersMapObject,
  action: Action,
  unexpectedKeyNames: Set<string>
): string | undefined {
  const reducerKeys = Object.keys(reducers)
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? 'preloadedState argument passed to createStore'
      : 'previous state received by the reducer'

  if (reducerKeys.length === 0) {
    return 'Store does not have a valid reducer. Make sure the argument passed to combineReducers is an object whose values are reducers.'
  }

  if (!isPlainObject(inputState)) {
    return `The ${argumentName} has unexpected type of "${kindOf(
      inputState
    )}". Expected argument to be an object with the following keys: "${reducerKeys.join('", "')}"`
  }

  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyNames.has(key)
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyNames.add(key)
  })

  if (action && action.type === ActionTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return `Unexpected ${
      unexpectedKeys.length > 1 ? 'keys' : 'key'
    } "${unexpectedKeys.join('", "')}" found in ${argumentName}. Expected to find one of the known reducer keys instead: "${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
  }
  return undefined
}

function assertReducerShape(reducers: ReducersMapObject) {
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]
    const initialState = reducer(undefined, { type: ActionTypes.INIT })

    if (typeof initialState === 'undefined') {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(12)
          : `The slice reducer for key "${key}" returned undefined during initialization. If the state passed to the reducer is undefined, you must explicitly return the initial state. The initial state may not be undefined. If you don't want to set a value for this reducer, you can use null instead of undefined.`
      )
    }

    if (
      typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined'
    ) {
      throw new Error(
        process.env['NODE_ENV'] === 'production'
          ? formatProdErrorMessage(13)
          : `The slice reducer for key "${key}" returned undefined when probed with a random type. Don't try to handle '${ActionTypes.INIT}' or other actions in "redux/*" namespace. They are considered private. Instead, you must return the current state for any unknown actions, unless it is undefined, in which case you must return the initial state, regardless of the action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

export function combineReducers<M extends ReducersMapObject>(
  reducers: M
): M extends ReducersMapObject<infer S, infer A, infer PreloadedState>
  ? Reducer<
      StateFromReducersMapObject<M>,
      ActionFromReducersMapObject<M>,
      PreloadedStateShapeFromReducersMapObject<M>
    >
  : never {
  const reducerKeys = Object.keys(reducers)
  const finalReducers: ReducersMapObject = {}
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    if (process.env['NODE_ENV'] !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }

  const finalReducerKeys = Object.keys(finalReducers)
  let unexpectedKeyNames: Set<string> = new Set()

  let shapeAssertionError: unknown
  try {
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }

  return function combination(
    state: StateFromReducersMapObject<M> = {} as StateFromReducersMapObject<M>,
    action: ActionFromReducersMapObject<M>
  ): StateFromReducersMapObject<M> {
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env['NODE_ENV'] !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state as unknown as object,
        finalReducers,
        action,
        unexpectedKeyNames
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    let hasChanged = false
    const nextState: StateFromReducersMapObject<M> =
      {} as StateFromReducersMapObject<M>
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      const previousStateForKey = (state as any)[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      if (typeof nextStateForKey === 'undefined') {
        const actionType = action && action.type
        throw new Error(
          process.env['NODE_ENV'] === 'production'
            ? formatProdErrorMessage(14)
            : `When called with an action of type ${
                actionType ? `"${String(actionType)}"` : '(unknown type)'
              }, the slice reducer for key "${key}" returned undefined. To ignore an action, you must explicitly return the previous state. If you want this reducer to hold no value, you can return null instead of undefined.`
        )
      }
      ;(nextState as any)[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    hasChanged =
      hasChanged || finalReducerKeys.length !== Object.keys(state as object).length
    return hasChanged ? nextState : state
  } as any
}
