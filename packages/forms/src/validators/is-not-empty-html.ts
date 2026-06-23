import type { ValidationRule } from '../types/validation.types.js';

/**
 * A regexp that matches strings containing at least one non-whitespace, non-tag character.
 * Used by {@link isNotEmptyHTML} to detect "real" content.
 */
const HTML_CONTENT_REGEX = /[^\s<>]/;

/**
 * A regexp that strips all HTML tags.
 */
const HTML_TAGS_REGEX = /<[^>]*>/g;

/**
 * Returns a validation rule that fails when the value is an HTML string with no visible content.
 *
 * @remarks
 * A string is considered "empty HTML" when, after stripping all tags, only whitespace remains
 * (or the original string contains no non-tag, non-whitespace characters).
 * Useful for rich-text / WYSIWYG editors that produce `<p><br></p>` for an empty state.
 * Non-string values always fail.
 *
 * @param error - The error to return on failure. When omitted, marks invalid with no message.
 * @returns A `ValidationRule`.
 *
 * @example
 * ```ts
 * validate: { bio: isNotEmptyHTML('Bio cannot be empty') }
 * // '<p><br></p>' → fails
 * // '<p>Hello</p>' → passes
 * ```
 */
export function isNotEmptyHTML<TError = string>(
  error?: TError,
): ValidationRule<unknown, unknown, TError> {
  return (value) => {
    if (typeof value !== 'string') {
      return error ?? (null as TError | null);
    }
    const stripped = value.replace(HTML_TAGS_REGEX, '');
    const isEmpty = !HTML_CONTENT_REGEX.test(stripped);
    return isEmpty ? (error ?? (null as TError | null)) : null;
  };
}
