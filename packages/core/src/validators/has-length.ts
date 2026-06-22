import type { ValidationRule } from '../types/validation.types.js';

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
 * @param lengthSpec - An exact length (`number`) or a `{ min?, max? }` range.
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @see https://mantine.dev/form/validators/
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
  return (value) => {
    const fail = (): TError | null => error ?? (null as TError | null);

    let length: number;

    if (typeof value === 'string') {
      length = value.trim().length;
    } else if (Array.isArray(value)) {
      length = value.length;
    } else {
      return fail();
    }

    if (typeof lengthSpec === 'number') {
      return length === lengthSpec ? null : fail();
    }

    const { min, max } = lengthSpec;
    if (min !== undefined && length < min) return fail();
    if (max !== undefined && length > max) return fail();
    return null;
  };
}
