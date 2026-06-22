/**
 * Deep path type utilities for form values.
 *
 * @remarks
 * These generics power the type-safe `setFieldValue`, `getInputProps`, `watch`, and similar
 * path-accepting APIs. An invalid path results in a compile error rather than a runtime failure.
 *
 * @see https://mantine.dev/form/use-form/
 *
 * @example
 * ```ts
 * type Values = { user: { name: string; age: number }; tags: string[] };
 * type Keys = DeepKeys<Values>;
 * // 'user' | 'user.name' | 'user.age' | 'tags' | `tags.${number}`
 * ```
 */

/**
 * Primitive types that cannot be traversed further.
 */
type Primitive = string | number | boolean | null | undefined | symbol | bigint | Date | File;

/**
 * Produces a union of all dot-notation key paths into `T`.
 *
 * @typeParam T - The object type to traverse.
 *
 * @example
 * ```ts
 * type Keys = DeepKeys<{ a: { b: string }; c: number[] }>;
 * // 'a' | 'a.b' | 'c' | `c.${number}`
 * ```
 */
export type DeepKeys<T> = T extends Primitive
  ? never
  : T extends ReadonlyArray<infer Item>
    ? `${number}` | `${number}.${DeepKeys<Item>}`
    : T extends object
      ? {
          [K in keyof T & (string | number)]: K extends string | number
            ? T[K] extends Primitive
              ? `${K}`
              : `${K}` | `${K}.${DeepKeys<T[K]>}`
            : never;
        }[keyof T & (string | number)]
      : never;

/**
 * Resolves the value type at a dot-notation `Path` within `T`.
 *
 * @typeParam T - The root object type.
 * @typeParam Path - A valid dot-notation path string.
 *
 * @example
 * ```ts
 * type V = DeepValue<{ user: { name: string } }, 'user.name'>;
 * // string
 * ```
 */
export type DeepValue<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? DeepValue<T[Key], Rest>
    : Key extends `${number}`
      ? T extends ReadonlyArray<infer Item>
        ? DeepValue<Item, Rest>
        : never
      : never
  : Path extends keyof T
    ? T[Path]
    : Path extends `${number}`
      ? T extends ReadonlyArray<infer Item>
        ? Item
        : never
      : never;

/**
 * Utility: extracts all string-keyed paths at depth 1 (non-recursive).
 * Used internally for dirty/touched record keys.
 *
 * @typeParam T - The object type.
 */
export type ShallowKeys<T> = keyof T & string;
