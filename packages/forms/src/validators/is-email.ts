import type { ValidationRule } from '../types/validation.types.js';

/**
 * Email validation regexp.
 * Matches most common valid email addresses.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Returns a validation rule that fails when the value is not a valid email address.
 *
 * @remarks
 * Non-string values always fail.
 *
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: { email: isEmail('Invalid email') }
 * ```
 */
export function isEmail<TError = string>(
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  return (value) => {
    if (typeof value !== 'string') {
      return error ?? (null as TError | null);
    }
    return EMAIL_REGEX.test(value) ? null : (error ?? (null as TError | null));
  };
}
