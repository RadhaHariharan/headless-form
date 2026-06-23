import type { Dispatch } from './store'

export interface MiddlewareAPI<D extends Dispatch = Dispatch, S = any> {
  dispatch: D
  getState: () => S
}

export interface Middleware<
  _DispatchExt = {},
  S = any,
  D extends Dispatch = Dispatch
> {
  (
    api: MiddlewareAPI<D, S>
  ): (next: (action: unknown) => unknown) => (action: unknown) => unknown
}
