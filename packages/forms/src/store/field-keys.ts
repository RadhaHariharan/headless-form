/**
 * Per-path key counter used by the uncontrolled remount trick.
 *
 * @remarks
 * Each entry tracks how many times the value at that path has been programmatically set
 * (i.e. `setFieldValue` with `forceUpdate: true`, which is the default).
 * The key string returned by `form.key(path)` incorporates this counter so that React /
 * Angular can remount the bound input, picking up the new `defaultValue`/`defaultChecked`.
 *
 * @see §3.7 of the CLAUDE.md spec
 */

/**
 * Creates and returns a mutable field-key counter record.
 *
 * @returns An initially empty record of `{ [path]: counter }`.
 */
export function createFieldKeys(): Record<string, number> {
  return {};
}

/**
 * Bumps the counter for `path` by one and returns the updated record.
 * Does not mutate the input — returns a new object.
 *
 * @param keys - The current key record.
 * @param path - The dot-notation path whose key counter should be bumped.
 * @returns A new record with the counter incremented.
 */
export function bumpFieldKey(
  keys: Record<string, number>,
  path: string,
): Record<string, number> {
  return { ...keys, [path]: (keys[path] ?? 0) + 1 };
}

/**
 * Builds the stable key string for a field, incorporating the form key and path counter.
 *
 * @param formKey - The form-level counter (bumped on `reset()`).
 * @param path - The dot-notation path.
 * @param fieldKeys - The per-path counter record.
 * @returns A stable key string, e.g. `'0-user.name-3'`.
 */
export function buildFieldKey(
  formKey: number,
  path: string,
  fieldKeys: Record<string, number>,
): string {
  return `${formKey}-${path}-${fieldKeys[path] ?? 0}`;
}
