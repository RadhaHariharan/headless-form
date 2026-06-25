export {
  createStore,
  type StoreApi,
  type ExtractState,
  type Mutate,
  type StateCreator,
  type StoreMutators,
  type StoreMutatorIdentifier,
} from './vanilla.js'

export { shallow } from './shallow.js'

export {
  redux,
  devtools,
  type DevtoolsOptions,
  type NamedSet,
  subscribeWithSelector,
  combine,
  persist,
  createJSONStorage,
  type StateStorage,
  type StorageValue,
  type PersistStorage,
  type PersistOptions,
  unstable_ssrSafe,
} from './middleware.js'

export { immer } from './middleware/immer.js'
