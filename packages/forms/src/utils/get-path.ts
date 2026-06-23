import { pathToArray } from './path-to-array.js';

/**
 * Reads the value at a dot-notation `path` from an object `obj`.
 *
 * @param obj - The root object to traverse.
 * @param path - A dot-notation path string, e.g. `'user.0.name'`.
 * @returns The value at the path, or `undefined` if any segment is missing.
 *
 * @example
 * ```ts
 * getPath({ user: { name: 'Jane' } }, 'user.name'); // 'Jane'
 * getPath({ items: [{ id: 1 }] }, 'items.0.id');    // 1
 * getPath({}, 'missing.key');                         // undefined
 * ```
 */
export function getPath(obj: unknown, path: string): unknown {
  const segments = pathToArray(path);
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
