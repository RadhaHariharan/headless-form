// Types
export type {
  DeepKeys,
  DeepValue,
  ShallowKeys,
  FormError,
  FormErrors,
  ValidationRule,
  FormRulesRecord,
  FormValidateInput,
  FormValidateResult,
  FormValidateFieldResult,
  FormRootRuleSymbol,
  InputType,
  GetInputPropsOptions,
  GetInputPropsResult,
  EnhanceGetInputPropsPayload,
  WatchPayload,
  WatchHandler,
  UnsubscribeWatch,
  FormMode,
  OnSubmitPreventDefault,
  TouchTrigger,
  UseFormOptions,
  SetFieldValueOptions,
  ReorderPayload,
  FormStoreApi,
  FormStoreSnapshot,
  TransformedValues,
} from './types/index.js';
export { formRootRule } from './types/index.js';

// Store
export { createFormStore } from './store/create-form-store.js';
export { createFormActions } from './store/form-store-registry.js';

// Validators
export { isNotEmpty } from './validators/is-not-empty.js';
export { isEmail } from './validators/is-email.js';
export { matches } from './validators/matches.js';
export { matchesField } from './validators/matches-field.js';
export { isInRange } from './validators/is-in-range.js';
export type { IsInRangeSpec } from './validators/is-in-range.js';
export { hasLength } from './validators/has-length.js';
export type { HasLengthRangeSpec } from './validators/has-length.js';
export { isJSONString } from './validators/is-json-string.js';
export { isNotEmptyHTML } from './validators/is-not-empty-html.js';

// Resolvers
export { schemaResolver } from './resolvers/schema-resolver.js';
export type {
  StandardSchema,
  StandardSchemaResult,
  StandardSchemaIssue,
  SchemaResolverOptions,
} from './resolvers/schema-resolver.js';

// Utils (exported for advanced users / wrapper authors)
export { getPath } from './utils/get-path.js';
export { setPath } from './utils/set-path.js';
export { clone } from './utils/clone.js';
export { deepEqual } from './utils/deep-equal.js';
export { getInputOnChange } from './utils/get-input-on-change.js';
export { shouldValidateOnChange } from './utils/should-validate-on-change.js';
