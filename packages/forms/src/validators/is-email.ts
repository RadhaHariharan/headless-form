import type { ValidationRule } from '../types/validation.types.js';
import { createStringValidator } from '../field-validators/string-validator.js';

/**
 * Email validation regexp.
 * Matches most common valid email addresses.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Underlying check, built on the {@link createStringValidator} field-validator toolkit so
 * the pattern-matching logic has a single implementation shared with the configurable
 * `createStringValidator({ allowedCharacters: 'custom', customPattern: ... })` path.
 */
const emailValidator = createStringValidator({
  required: true,
  allowedCharacters: 'custom',
  customPattern: EMAIL_REGEX,
});

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
    return emailValidator(value, 'Email') === null ? null : (error ?? (null as TError | null));
  };
}
