/**
 * Returns a deep clone of `value`.
 *
 * @remarks
 * Uses `structuredClone` when available (Node >= 17, modern browsers).
 * Falls back to `JSON.parse(JSON.stringify(...))` for environments that lack it.
 * Non-serialisable values (functions, symbols, `undefined` map values) are silently dropped
 * by the fallback; they are preserved by `structuredClone`.
 *
 * @param value - The value to clone.
 * @returns A deep clone.
 *
 * @example
 * ```ts
 * const a = { x: { y: 1 } };
 * const b = clone(a);
 * b.x.y = 2;
 * a.x.y; // still 1
 * ```
 */
export function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
