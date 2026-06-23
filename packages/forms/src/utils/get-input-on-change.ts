/**
 * Normalises any value that might arrive from an `onChange` handler into a raw value.
 *
 * @remarks
 * Handles three cases:
 * 1. A native DOM `Event` (or React synthetic event) — reads `.target.value` or `.target.checked`.
 * 2. A plain `boolean` — returned as-is (useful for checkbox controlled state).
 * 3. Any other raw value — returned as-is.
 *
 * @param eventOrValue - The raw argument received by an `onChange` handler.
 * @returns The normalised value.
 *
 * @example
 * ```ts
 * getInputOnChange(new Event('change')); // reads event.target.value
 * getInputOnChange(true);                // true
 * getInputOnChange('hello');             // 'hello'
 * ```
 */
export function getInputOnChange(eventOrValue: unknown): unknown {
  if (eventOrValue === null || eventOrValue === undefined) {
    return eventOrValue;
  }

  // Plain boolean (e.g. custom checkbox component)
  if (typeof eventOrValue === 'boolean') {
    return eventOrValue;
  }

  // DOM Event / React SyntheticEvent
  if (
    typeof eventOrValue === 'object' &&
    'target' in (eventOrValue as object) &&
    (eventOrValue as { target: unknown }).target !== null &&
    typeof (eventOrValue as { target: unknown }).target === 'object'
  ) {
    const target = (eventOrValue as { target: Record<string, unknown> }).target;

    if (target['type'] === 'checkbox') {
      return Boolean(target['checked']);
    }

    if ('value' in target) {
      return target['value'];
    }
  }

  return eventOrValue;
}
