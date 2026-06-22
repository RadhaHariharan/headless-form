import { pathToArray } from './path-to-array.js';

/**
 * Returns a new object (shallow clone at each level) with the value at `path` set to `value`.
 * Does not mutate the original object.
 *
 * @param obj - The root object.
 * @param path - A dot-notation path string, e.g. `'user.0.name'`.
 * @param value - The value to set.
 * @returns A new root object with the value set at `path`.
 *
 * @example
 * ```ts
 * setPath({ user: { name: 'Joe' } }, 'user.name', 'Jane');
 * // { user: { name: 'Jane' } }
 *
 * setPath({ items: ['a', 'b'] }, 'items.1', 'c');
 * // { items: ['a', 'c'] }
 * ```
 */
export function setPath(obj: unknown, path: string, value: unknown): unknown {
  const segments = pathToArray(path);

  function set(current: unknown, remainingSegments: string[]): unknown {
    const [head, ...tail] = remainingSegments;

    if (head === undefined) {
      return value;
    }

    if (Array.isArray(current)) {
      const index = Number(head);
      const next = [...current];
      next[index] = set(current[index], tail);
      return next;
    }

    const record = (current !== null && current !== undefined && typeof current === 'object'
      ? current
      : {}) as Record<string, unknown>;

    return {
      ...record,
      [head]: set(record[head], tail),
    };
  }

  return set(obj, segments);
}
