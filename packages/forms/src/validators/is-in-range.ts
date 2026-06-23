import type { ValidationRule } from '../types/validation.types.js';

/**
 * Numeric range specification for {@link isInRange}.
 */
export interface IsInRangeSpec {
  /** Inclusive minimum. When omitted, no lower bound is checked. */
  min?: number;
  /** Inclusive maximum. When omitted, no upper bound is checked. */
  max?: number;
}

/**
 * Returns a validation rule that fails when the value is not a number within the given range.
 *
 * @remarks
 * Non-numeric values (including strings that are not parseable numbers) always fail.
 * Both `min` and `max` are inclusive.
 *
 * @param spec - An object with optional `min` and/or `max`.
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: { age: isInRange({ min: 0, max: 120 }, 'Age must be 0–120') }
 * ```
 */
export function isInRange<TError = string>(
  spec: IsInRangeSpec,
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  return (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return error ?? (null as TError | null);
    }
    const { min, max } = spec;
    if (min !== undefined && value < min) {
      return error ?? (null as TError | null);
    }
    if (max !== undefined && value > max) {
      return error ?? (null as TError | null);
    }
    return null;
  };
}
