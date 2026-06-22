import type { ReorderPayload } from '../types/store.types.js';

/**
 * Returns a new array with `item` inserted at `index`, or appended when `index` is omitted.
 *
 * @param list - The original array.
 * @param item - The item to insert.
 * @param index - Optional insertion index; defaults to append.
 * @returns A new array with the item inserted.
 *
 * @example
 * ```ts
 * insertAt([1, 2, 3], 99, 1); // [1, 99, 2, 3]
 * insertAt([1, 2, 3], 99);    // [1, 2, 3, 99]
 * ```
 */
export function insertAt<T>(list: T[], item: T, index?: number): T[] {
  if (index === undefined || index >= list.length) {
    return [...list, item];
  }
  const next = [...list];
  next.splice(index, 0, item);
  return next;
}

/**
 * Returns a new array with the item at `index` removed.
 *
 * @param list - The original array.
 * @param index - Index of the item to remove.
 * @returns A new array without the item.
 *
 * @example
 * ```ts
 * removeAt([1, 2, 3], 1); // [1, 3]
 * ```
 */
export function removeAt<T>(list: T[], index: number): T[] {
  const next = [...list];
  next.splice(index, 1);
  return next;
}

/**
 * Returns a new array with the item at `index` replaced by `item`.
 *
 * @param list - The original array.
 * @param index - Index of the item to replace.
 * @param item - The replacement item.
 * @returns A new array with the replacement applied.
 *
 * @example
 * ```ts
 * replaceAt([1, 2, 3], 1, 99); // [1, 99, 3]
 * ```
 */
export function replaceAt<T>(list: T[], index: number, item: T): T[] {
  const next = [...list];
  next[index] = item;
  return next;
}

/**
 * Returns a new array with the item at `from` moved to `to`.
 *
 * @param list - The original array.
 * @param payload - `{ from, to }` indices.
 * @returns A new array with the item reordered.
 *
 * @example
 * ```ts
 * reorder([1, 2, 3], { from: 0, to: 2 }); // [2, 3, 1]
 * ```
 */
export function reorder<T>(list: T[], { from, to }: ReorderPayload): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
}
