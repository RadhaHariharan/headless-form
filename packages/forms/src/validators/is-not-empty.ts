import type { ValidationRule } from '../types/validation.types.js';

/**
 * Returns a validation rule that fails when the value is empty.
 *
 * @remarks
 * The following values are considered empty:
 * - `null`, `undefined`
 * - `false` (boolean)
 * - An empty string, or a string that is whitespace-only after trimming
 * - An empty array (`length === 0`)
 *
 * @param error - The error to return when the field is empty. When omitted, the field is
 *   marked invalid with no error message (useful for custom error rendering).
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: { name: isNotEmpty('Name is required') }
 * ```
 */
export function isNotEmpty<TError = string>(
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  return (value) => {
    if (value === null || value === undefined || value === false) {
      return error ?? (null as TError | null);
    }
    if (typeof value === 'string' && value.trim().length === 0) {
      return error ?? (null as TError | null);
    }
    if (Array.isArray(value) && value.length === 0) {
      return error ?? (null as TError | null);
    }
    return null;
  };
}
