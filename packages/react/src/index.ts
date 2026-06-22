// Main hook
export { useForm } from './hooks/use-form.js';
export type { UseFormReturnType } from './hooks/use-form.js';

// useField
export { useField } from './hooks/use-field.js';
export type { UseFieldOptions, UseFieldReturnType } from './hooks/use-field.js';

// createFormContext
export { createFormContext } from './context/create-form-context.js';
export type { CreateFormContextResult } from './context/create-form-context.js';

// Re-export everything from core so users import from a single package
export {
  createFormStore,
  createFormActions,
  formRootRule,
  schemaResolver,
  isNotEmpty,
  isEmail,
  matches,
  matchesField,
  isInRange,
  hasLength,
  isJSONString,
  isNotEmptyHTML,
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
  StandardSchema,
  StandardSchemaResult,
  StandardSchemaIssue,
  SchemaResolverOptions,
} from '@headless-form/core';
