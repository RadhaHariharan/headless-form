import type { ValidationRule } from '../types/validation.types.js';
import type { FieldValidatorFunction } from './types.js';

/**
 * Turn a dot/bracket path into a human-readable field name.
 *
 * @remarks
 * Uses the **last** path segment so nested paths read naturally, strips array indices, and
 * title-cases the result: `'user.email'` → `'Email'`, `'items.0.qty'` → `'Qty'`,
 * `'firstName'` → `'First Name'`.
 *
 * @param path - The field path passed to a `ValidationRule`.
 * @returns A human-readable field name.
 */
export function humanizeFieldName(path: string): string {
  const segments = path.split('.').filter((s) => s !== '' && !/^\d+$/.test(s));
  const last = segments[segments.length - 1] ?? path;
  return last
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Adapt a {@link FieldValidatorFunction} into a {@link ValidationRule} so it can be dropped
 * straight into a form's `validate` rules object.
 *
 * @remarks
 * Field validators have the signature `(value, fieldName) => string | null`, whereas form
 * rules are `(value, values, path) => error | null`. This bridges the two: it forwards the
 * field value and supplies `fieldName` — either the one you pass, or a humanized version of
 * the field's path (see {@link humanizeFieldName}).
 *
 * @typeParam TValue - The field value type.
 * @param validator - A validator produced by any `create*Validator` factory.
 * @param fieldName - Optional explicit field name. When omitted, derived from the field path.
 * @returns A `ValidationRule<TValue, unknown, string>`.
 *
 * @example
 * ```ts
 * import { useForm, createStringValidator, createNumberValidator, toValidationRule } from '@headlesskit/forms-react';
 *
 * const nameRule = createStringValidator({ minLength: 3 });
 * const ageRule = createNumberValidator({ min: 18 });
 *
 * const form = useForm({
 *   initialValues: { name: '', age: '' },
 *   validate: {
 *     name: toValidationRule(nameRule, 'Name'),
 *     age: toValidationRule(ageRule), // fieldName inferred from path → "Age"
 *   },
 * });
 * ```
 */
export function toValidationRule<TValue = unknown>(
  validator: FieldValidatorFunction<TValue>,
  fieldName?: string,
): ValidationRule<TValue, unknown, string> {
  return (value, _values, path) => validator(value, fieldName ?? humanizeFieldName(path));
}
