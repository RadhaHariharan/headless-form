import type { ValidationRule } from '../types/validation.types.js';
import { createStringValidator } from '../field-validators/string-validator.js';
import { createArrayValidator } from '../field-validators/array-validator.js';

/**
 * Length range specification for {@link hasLength} when an exact count is not desired.
 */
export interface HasLengthRangeSpec {
  /** Inclusive minimum length. When omitted, no lower bound is checked. */
  min?: number;
  /** Inclusive maximum length. When omitted, no upper bound is checked. */
  max?: number;
}

/**
 * Returns a validation rule that fails when the value's length does not satisfy the spec.
 *
 * @remarks
 * Works on strings (trimmed before measuring) and arrays.
 * Pass a plain `number` for an exact length requirement, or `{ min?, max? }` for a range.
 * Non-string / non-array values always fail.
 *
 * The min/max comparison itself is delegated to {@link createStringValidator} /
 * {@link createArrayValidator} (with `required: false`, since `hasLength` — unlike
 * `isNotEmpty` — has no opinion on emptiness by itself); a zero-length value is compared
 * against `min`/`max` directly here, since the field-validator toolkit's `required: false`
 * path short-circuits before reaching its own length checks.
 *
 * @param lengthSpec - An exact length (`number`) or a `{ min?, max? }` range.
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: {
 *   username: hasLength({ min: 3, max: 20 }, 'Must be 3–20 characters'),
 *   pin: hasLength(4, 'PIN must be exactly 4 digits'),
 * }
 * ```
 */
export function hasLength<TError = string>(
  lengthSpec: number | HasLengthRangeSpec,
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  const min = typeof lengthSpec === 'number' ? lengthSpec : lengthSpec.min;
  const max = typeof lengthSpec === 'number' ? lengthSpec : lengthSpec.max;

  const stringValidator = createStringValidator({
    required: false,
    ...(min !== undefined ? { minLength: min } : {}),
    ...(max !== undefined ? { maxLength: max } : {}),
  });
  const arrayValidator = createArrayValidator({
    required: false,
    ...(min !== undefined ? { minItems: min } : {}),
    ...(max !== undefined ? { maxItems: max } : {}),
  });

  const fail = (): TError | null => error ?? (null as TError | null);
  const checkZeroLength = (): TError | null => {
    if (min !== undefined && 0 < min) return fail();
    if (max !== undefined && 0 > max) return fail();
    return null;
  };

  return (value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) return checkZeroLength();
      return stringValidator(value, 'Value') === null ? null : fail();
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return checkZeroLength();
      return arrayValidator(value, 'Value') === null ? null : fail();
    }
    return fail();
  };
}
