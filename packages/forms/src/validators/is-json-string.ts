import type { ValidationRule } from '../types/validation.types.js';
import { createStringValidator } from '../field-validators/string-validator.js';

/**
 * `JSON.parse` is plugged in as a {@link createStringValidator} `customValidation` hook, so
 * the field-validator toolkit owns the required/trim handling and this file only supplies
 * the JSON-specific check.
 */
const jsonValidator = createStringValidator({
  required: true,
  customValidation: (trimmed) => {
    try {
      JSON.parse(trimmed);
      return null;
    } catch {
      return 'Invalid JSON';
    }
  },
});

/**
 * Returns a validation rule that fails when the value is not a valid JSON string.
 *
 * @remarks
 * Non-string values always fail.
 *
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: { config: isJSONString('Must be valid JSON') }
 * ```
 */
export function isJSONString<TError = string>(
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  return (value) => {
    if (typeof value !== 'string') {
      return error ?? (null as TError | null);
    }
    return jsonValidator(value, 'Value') === null ? null : (error ?? (null as TError | null));
  };
}
