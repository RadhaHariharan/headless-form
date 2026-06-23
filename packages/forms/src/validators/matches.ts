import type { ValidationRule } from '../types/validation.types.js';

/**
 * Returns a validation rule that fails when the value does not match a regular expression.
 *
 * @remarks
 * Non-string values always fail.
 *
 * @param regexp - The regular expression to test against.
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: { phone: matches(/^\d{10}$/, 'Invalid phone number') }
 * ```
 */
export function matches<TError = string>(
  regexp: RegExp,
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  return (value) => {
    if (typeof value !== 'string') {
      return error ?? (null as TError | null);
    }
    return regexp.test(value) ? null : (error ?? (null as TError | null));
  };
}
