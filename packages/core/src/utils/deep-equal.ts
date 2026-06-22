/**
 * Returns `true` when `a` and `b` are deeply equal.
 *
 * @remarks
 * Handles primitives, `null`, `undefined`, `Date`, `Array`, and plain objects.
 * Does not handle `Map`, `Set`, `RegExp`, or circular references.
 * Used for dirty-state detection.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if the values are deeply equal.
 *
 * @example
 * ```ts
 * deepEqual({ x: 1 }, { x: 1 }); // true
 * deepEqual([1, 2], [1, 2]);       // true
 * deepEqual({ x: 1 }, { x: 2 }); // false
 * ```
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}
