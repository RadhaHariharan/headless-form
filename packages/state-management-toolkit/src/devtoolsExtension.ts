import type { Action, ActionCreator, StoreEnhancer } from '@headlesskit/state-management'
import { compose } from './stateManagementImports'

export interface DevToolsEnhancerOptions {
  /**
   * the instance name to be showed on the monitor page. Default value is `document.title`.
   * If not specified and there's no document title, it will consist of `tabId` and `instanceId`.
   */
  name?: string
  /**
   * action creators functions to be available in the Dispatcher.
   */
  actionCreators?: ActionCreator<any>[] | { [key: string]: ActionCreator<any> }
  /**
   * if more than one action is dispatched in the indicated interval, all new actions will be collected and sent at once.
   * It is the joint between performance and speed. When set to `0`, all actions will be sent instantly.
   * Set it to a higher value when experiencing perf issues (also `maxAge` to a lower value).
   *
   * @default 500 ms.
   */
  latency?: number
  /**
   * (> 1) - maximum allowed actions to be stored in the history tree. The oldest actions are removed once maxAge is reached. It's critical for performance.
   *
   * @default 50
   */
  maxAge?: number
  /**
   * Customizes how actions and state are serialized and deserialized. Can be a boolean or object. If given a boolean, the behavior is the same as if you
   * were to pass an object and specify `options` as a boolean. Giving an object allows fine-grained customization using the `replacer` and `reviver`
   * functions.
   */
  serialize?:
    | boolean
    | {
        options?:
          | undefined
          | boolean
          | {
              date?: true
              regex?: true
              undefined?: true
              error?: true
              symbol?: true
              map?: true
              set?: true
              function?: true | ((fn: (...args: any[]) => any) => string)
            }
        replacer?: (key: string, value: unknown) => any
        reviver?: (key: string, value: unknown) => any
        immutable?: unknown
        refs?: (new (data: any) => unknown)[]
      }
  actionSanitizer?: <A extends Action>(action: A, id: number) => A
  stateSanitizer?: <S>(state: S, index: number) => S
  /** @deprecated Use actionsDenylist instead. */
  actionsBlacklist?: string | string[]
  /** @deprecated Use actionsAllowlist instead. */
  actionsWhitelist?: string | string[]
  actionsDenylist?: string | string[]
  actionsAllowlist?: string | string[]
  predicate?: <S, A extends Action>(state: S, action: A) => boolean
  shouldRecordChanges?: boolean
  pauseActionType?: string
  autoPause?: boolean
  shouldStartLocked?: boolean
  shouldHotReload?: boolean
  shouldCatchErrors?: boolean
  features?: {
    pause?: boolean
    lock?: boolean
    persist?: boolean
    export?: boolean | 'custom'
    import?: boolean | 'custom'
    jump?: boolean
    skip?: boolean
    reorder?: boolean
    dispatch?: boolean
    test?: boolean
  }
  trace?: boolean | (<A extends Action>(action: A) => string)
  traceLimit?: number
}

interface DevtoolsExtensionConfig extends DevToolsEnhancerOptions {
  type?: string
}

interface ConnectResponse {
  init: (state: unknown) => void
  send: (action: Action<string>, state: unknown) => void
}

interface DevtoolsExtension {
  (config?: DevtoolsExtensionConfig): StoreEnhancer
  connect: (preConfig: DevtoolsExtensionConfig) => ConnectResponse
}

type InferComposedStoreExt<StoreEnhancers> = StoreEnhancers extends [
  infer HeadStoreEnhancer,
  ...infer RestStoreEnhancers,
]
  ? HeadStoreEnhancer extends StoreEnhancer<infer StoreExt>
    ? StoreExt & InferComposedStoreExt<RestStoreEnhancers>
    : never
  : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {}

interface DevtoolsExtensionCompose {
  (
    config: DevtoolsExtensionConfig,
  ): <StoreEnhancers extends readonly StoreEnhancer[]>(
    ...funcs: StoreEnhancers
  ) => StoreEnhancer<InferComposedStoreExt<StoreEnhancers>>
  <StoreEnhancers extends readonly StoreEnhancer[]>(
    ...funcs: StoreEnhancers
  ): StoreEnhancer<InferComposedStoreExt<StoreEnhancers>>
}

declare global {
  interface Window {
    __HEADLESSKIT_DEVTOOLS_EXTENSION__?: DevtoolsExtension
    __HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__?: DevtoolsExtensionCompose
  }
}

function extensionComposeStub(
  config: DevtoolsExtensionConfig,
): <StoreEnhancers extends readonly StoreEnhancer[]>(
  ...funcs: StoreEnhancers
) => StoreEnhancer<InferComposedStoreExt<StoreEnhancers>>
function extensionComposeStub<StoreEnhancers extends readonly StoreEnhancer[]>(
  ...funcs: StoreEnhancers
): StoreEnhancer<InferComposedStoreExt<StoreEnhancers>>
function extensionComposeStub(...funcs: [DevtoolsExtensionConfig] | StoreEnhancer[]) {
  if (funcs.length === 0) return undefined
  if (typeof funcs[0] === 'object') return compose
  return compose(...(funcs as StoreEnhancer[]))
}

/**
 * Reads `window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__` directly — this is
 * headlesskit's own DevTools connector global, populated by whatever installs
 * a headlesskit DevTools connector. Falls back to a no-op compose when
 * nothing has populated it (e.g. no connector installed, or non-browser
 * environment), so `configureStore`'s `devTools` option is always safe to
 * leave enabled.
 */
export const composeWithDevTools: DevtoolsExtensionCompose =
  typeof window !== 'undefined' && window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__
    : extensionComposeStub
