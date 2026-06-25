import type { ValidationRule } from '../types/validation.types.js';
import { createStringValidator } from '../field-validators/string-validator.js';
import { createArrayValidator } from '../field-validators/array-validator.js';

/**
 * String/array "is it empty" checks, delegated to the field-validator toolkit's own
 * `required` gate so the trimming/length-counting rules have one implementation.
 */
const requiredString = createStringValidator({ required: true });
const requiredArray = createArrayValidator({ required: true });

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
  const fail = () => error ?? (null as TError | null);
  return (value) => {
    if (value === null || value === undefined || value === false) {
      return fail();
    }
    if (typeof value === 'string') {
      return requiredString(value, 'Value') === null ? null : fail();
    }
    if (Array.isArray(value)) {
      return requiredArray(value, 'Value') === null ? null : fail();
    }
    return null;
  };
}
