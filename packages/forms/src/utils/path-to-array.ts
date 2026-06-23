/**
 * Splits a dot-notation path string into an array of path segments.
 *
 * @param path - A dot-notation path string, e.g. `'user.0.name'`.
 * @returns An array of string segments, e.g. `['user', '0', 'name']`.
 *
 * @example
 * ```ts
 * pathToArray('user.address.city'); // ['user', 'address', 'city']
 * pathToArray('items.0.name');      // ['items', '0', 'name']
 * pathToArray('name');              // ['name']
 * ```
 */
export function pathToArray(path: string): string[] {
  return path.split('.');
}
