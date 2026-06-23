import type { ValidationRule } from '../types/validation.types.js';

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
    try {
      JSON.parse(value);
      return null;
    } catch {
      return error ?? (null as TError | null);
    }
  };
}
