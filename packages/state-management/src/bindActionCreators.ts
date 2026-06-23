import type { Dispatch } from './types/store'
import type {
  ActionCreator,
  ActionCreatorsMapObject
} from './types/actions'
import { kindOf } from './utils/kindOf'

function bindActionCreator<A, C extends ActionCreator<A>>(
  actionCreator: C,
  dispatch: Dispatch
) {
  const boundActionCreator = function (this: any, ...args: any[]) {
    return dispatch(actionCreator.apply(this, args) as any)
  }
  const { name } = actionCreator
  Object.defineProperty(boundActionCreator, 'name', {
    value: name ? `bound ${name}` : 'bound ',
    configurable: true
  })
  return boundActionCreator
}

export function bindActionCreators<A, C extends ActionCreator<A>>(
  actionCreators: C,
  dispatch: Dispatch
): C

export function bindActionCreators<
  A extends ActionCreator<any>,
  B extends ActionCreator<any>
>(actionCreators: A, dispatch: Dispatch): B

export function bindActionCreators<
  A,
  M extends ActionCreatorsMapObject<A>
>(actionCreators: M, dispatch: Dispatch): M

export function bindActionCreators<
  M extends ActionCreatorsMapObject,
  N extends ActionCreatorsMapObject
>(actionCreators: M, dispatch: Dispatch): N

export function bindActionCreators(
  actionCreators: ActionCreator<any> | ActionCreatorsMapObject,
  dispatch: Dispatch
) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected a function or an object with action-creator functions, but instead received ${kindOf(actionCreators)}.
Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  const boundActionCreators: ActionCreatorsMapObject = {}
  for (const key in actionCreators) {
    const actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  return boundActionCreators
}
