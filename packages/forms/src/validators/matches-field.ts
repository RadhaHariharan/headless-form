import type { ValidationRule } from '../types/validation.types.js';
import { getPath } from '../utils/get-path.js';

/**
 * Returns a validation rule that fails when the value does not equal another field's value
 * (primitive equality only — suitable for confirm-password patterns).
 *
 * @remarks
 * Uses strict equality (`===`). Only reliable for primitive values (string, number, boolean).
 * Does not perform deep equality on objects or arrays.
 *
 * @param otherFieldPath - Dot-notation path of the field to compare with.
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: {
 *   confirmPassword: matchesField('password', 'Passwords do not match'),
 * }
 * ```
 */
export function matchesField<TError = string>(
  otherFieldPath: string,
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  return (value, values) => {
    const otherValue = getPath(values, otherFieldPath);
    return value === otherValue ? null : (error ?? (null as TError | null));
  };
}
