/**
 * JSON-stringifies a value for display, falling back to `String(value)` for values
 * `JSON.stringify` can't handle (circular references, `BigInt`, etc).
 * @param value - The value to stringify.
 * @returns A pretty-printed JSON string, or a best-effort string representation.
 */
export function safeStringify(value: unknown): string {
  try {
    const result = JSON.stringify(value, null, 2) as string | undefined;
    return result ?? String(value);
  } catch {
    return String(value);
  }
}
