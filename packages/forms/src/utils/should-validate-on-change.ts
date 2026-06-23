/**
 * Returns `true` when the given `option` (a `validateInputOnChange` or `validateInputOnBlur`
 * value) indicates that the field at `path` should be validated.
 *
 * @param option - The option value: `false` disables; `true` enables for all fields; an array
 *   of dot-notation paths enables only those fields.
 * @param path - The dot-notation path of the field being checked.
 * @returns `true` if the field should be validated.
 *
 * @example
 * ```ts
 * shouldValidateOnChange(true, 'email');          // true
 * shouldValidateOnChange(false, 'email');         // false
 * shouldValidateOnChange(['email'], 'email');     // true
 * shouldValidateOnChange(['email'], 'password');  // false
 * ```
 */
export function shouldValidateOnChange(
  option: boolean | string[] | undefined,
  path: string,
): boolean {
  if (option === true) return true;
  if (!option) return false;
  if (typeof option === 'boolean') return false;
  return option.includes(path);
}
