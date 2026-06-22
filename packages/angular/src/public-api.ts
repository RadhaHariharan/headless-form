/**
 * @headless-form/angular — Angular bindings for the headless-form core engine.
 *
 * @remarks
 * Re-exports all public Angular-specific APIs. Import from `@headless-form/angular`.
 *
 * @packageDocumentation
 */

export {
  injectForm,
  type FormApi,
} from './inject-form.js';

export {
  injectField,
  type InjectFieldOptions,
  type InjectFieldReturnType,
} from './inject-field.js';

export {
  HfFieldDirective,
} from './form-field.directive.js';

export {
  provideForm,
  injectFormContext,
} from './form-context.js';

export {
  FORM_CONTEXT_TOKEN,
} from './form-context.token.js';

// Re-export core so Angular users can import everything from a single package.
export {
  createFormStore,
  createFormActions,
  formRootRule,
  schemaResolver,
  // Form-rule validators
  isNotEmpty,
  isEmail,
  matches,
  matchesField,
  isInRange,
  hasLength,
  isJSONString,
  isNotEmptyHTML,
  // Field-validator toolkit ("build your own")
  createStringValidator,
  createNumberValidator,
  createArrayValidator,
  createCheckboxValidator,
  createDateValidator,
  parseLocalDate,
  formatLocalDate,
  toValidationRule,
  humanizeFieldName,
  // Utils (advanced)
  getPath,
  setPath,
  clone,
  deepEqual,
  getInputOnChange,
  shouldValidateOnChange,
} from '@headless-form/core';

export type {
  DeepKeys,
  DeepValue,
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
  IsInRangeSpec,
  HasLengthRangeSpec,
  // Field-validator toolkit types
  FieldValidatorFunction,
  StringValidationRule,
  NumberValidationRule,
  ArrayValidationRule,
  BooleanValidationRule,
  DateValidationRule,
  StandardSchema,
  StandardSchemaResult,
  StandardSchemaIssue,
  SchemaResolverOptions,
} from '@headless-form/core';
