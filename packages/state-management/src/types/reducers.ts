import type { Action, UnknownAction } from './actions'

export type Reducer<
  S = any,
  A extends Action = UnknownAction,
  PreloadedState = S
> = (state: S | PreloadedState | undefined, action: A) => S

export type ReducersMapObject<
  S = any,
  A extends Action = UnknownAction,
  PreloadedState = S
> = keyof PreloadedState extends keyof S
  ? {
      [K in keyof S]: Reducer<
        S[K],
        A,
        K extends keyof PreloadedState ? PreloadedState[K] : never
      >
    }
  : never

export type StateFromReducersMapObject<M> = M[keyof M] extends
  | Reducer<any, any, any>
  | undefined
  ? {
      [P in keyof M]: M[P] extends Reducer<infer S, any, any> ? S : never
    }
  : never

export type ReducerFromReducersMapObject<M> = M[keyof M] extends
  | Reducer<any, any, any>
  | undefined
  ? M[keyof M]
  : never

export type ActionFromReducer<R> =
  R extends Reducer<any, infer A, any> ? A : never

export type ActionFromReducersMapObject<M> = ActionFromReducer<
  ReducerFromReducersMapObject<M>
>

export type PreloadedStateShapeFromReducersMapObject<M> = M[keyof M] extends
  | Reducer<any, any, any>
  | undefined
  ? {
      [P in keyof M]: M[P] extends (
        inputState: infer InputState,
        action: ActionFromReducersMapObject<M>
      ) => any
        ? InputState
        : never
    }
  : never
