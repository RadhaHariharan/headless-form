import type { ValidationRule } from '../types/validation.types.js';
import { createStringValidator } from '../field-validators/string-validator.js';

/**
 * Returns a validation rule that fails when the value does not match a regular expression.
 *
 * @remarks
 * Non-string values always fail. Built on the {@link createStringValidator} field-validator
 * toolkit's `customPattern` check, which tests the value after trimming.
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
  const validator = createStringValidator({
    required: true,
    allowedCharacters: 'custom',
    customPattern: regexp,
  });
  return (value) => {
    if (typeof value !== 'string') {
      return error ?? (null as TError | null);
    }
    return validator(value, 'Value') === null ? null : (error ?? (null as TError | null));
  };
}
