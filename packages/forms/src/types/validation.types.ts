import type { DeepKeys, DeepValue } from './path.types.js';

/**
 * A single form error value.
 *
 * @remarks
 * Core keeps this generic (`unknown`) so wrappers can specialise it:
 * React defaults `TError = React.ReactNode`; Angular defaults `TError = unknown`.
 *
 */
export type FormError = unknown;

/**
 * A flat record mapping dot-notation field paths to their current errors.
 *
 * @typeParam TError - The error value type (defaults to `unknown`).
 *
 */
export type FormErrors<TError = FormError> = Partial<Record<string, TError>>;

/**
 * A validation rule function for a single field.
 *
 * @typeParam Value - The field value type.
 * @typeParam Values - The full form values type (available for cross-field rules).
 * @typeParam TError - The error type returned on failure.
 *
 * @param value - The current field value.
 * @param values - The complete form values at the time of validation.
 * @param path - The dot-notation path of the field being validated.
 * @returns `null` or `undefined` when valid; an error value or `Promise` thereof otherwise.
 *
 * @example
 * ```ts
 * const required: ValidationRule<string> = (v) => v.trim() ? null : 'Required';
 * ```
 */
export type ValidationRule<Value, Values = unknown, TError = FormError> = (
  value: Value,
  values: Values,
  path: string,
) => TError | null | undefined | Promise<TError | null | undefined>;

/**
 * A record of per-field validation rules (rules object form of `validate`).
 *
 * @typeParam Values - The form values type.
 * @typeParam TError - The error type.
 *
 * @remarks
 * Keys may use dot-notation for nested fields, or be a first-level key whose value
 * is a nested `FormRulesRecord` for structured grouping.
 *
 * @example
 * ```ts
 * const rules: FormRulesRecord<{ email: string; password: string }> = {
 *   email: isEmail('Invalid email'),
 *   password: hasLength({ min: 8 }, 'Too short'),
 * };
 * ```
 */
export type FormRulesRecord<Values, TError = FormError> = {
  // Only dot-notation (nested) paths — excludes top-level keys to avoid intersection conflicts
  [K in DeepKeys<Values> as K extends keyof Values ? never : K]?: ValidationRule<DeepValue<Values, K>, Values, TError>;
} & {
  // Top-level keys: object fields can be either nested rules records or direct rule functions
  [K in keyof Values & string]?: Values[K] extends object
    ? FormRulesRecord<Values[K], TError> | ValidationRule<Values[K], Values, TError>
    : ValidationRule<Values[K], Values, TError>;
};

/**
 * The `validate` option: either a per-field rules object or a single function.
 *
 * @typeParam Values - The form values type.
 * @typeParam TError - The error type.
 */
export type FormValidateInput<Values, TError = FormError> =
  | FormRulesRecord<Values, TError>
  | ((values: Values) => FormErrors<TError> | Promise<FormErrors<TError>>);

/**
 * Result returned by `validate()`.
 *
 * @typeParam TError - The error type.
 */
export interface FormValidateResult<TError = FormError> {
  /** Whether any errors were found. */
  hasErrors: boolean;
  /** The collected errors keyed by field path. */
  errors: FormErrors<TError>;
}

/**
 * Result returned by `validateField(path)`.
 *
 * @typeParam TError - The error type.
 */
export interface FormValidateFieldResult<TError = FormError> {
  /** Whether the field has an error. */
  hasError: boolean;
  /** The field error value, or `null` if valid. */
  error: TError | null;
}

/**
 * A special Symbol used as a key in `FormRulesRecord` to attach a root-level validator
 * that runs alongside children (e.g. validating the array as a whole).
 *
 * @remarks
 * Using a Symbol prevents collision with any user field named `__root__`.
 *
 * @example
 * ```ts
 * const rules = {
 *   [formRootRule]: (values) => values.items.length === 0 ? 'Add at least one item' : null,
 *   items: { ... },
 * };
 * ```
 */
export const formRootRule: unique symbol = Symbol('headlesskit/formRootRule');

/** Type of the {@link formRootRule} symbol. */
export type FormRootRuleSymbol = typeof formRootRule;
