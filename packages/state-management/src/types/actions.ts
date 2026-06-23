export type Action<T extends string = string> = {
  type: T
}

export interface UnknownAction extends Action {
  [extraProps: string]: unknown
}

/** @deprecated use Action or UnknownAction instead */
export interface AnyAction extends Action {
  [extraProps: string]: any
}

export interface ActionCreator<A, P extends any[] = any[]> {
  (...args: P): A
}

export interface ActionCreatorsMapObject<A = any, P extends any[] = any[]> {
  [key: string]: ActionCreator<A, P>
}
