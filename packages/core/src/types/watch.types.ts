/**
 * Types for the form `watch` API.
 *
 * @see https://mantine.dev/form/values/
 */

/**
 * Payload delivered to a `watch` subscriber each time the watched field changes.
 *
 * @typeParam Value - The value type of the watched field.
 */
export interface WatchPayload<Value> {
  /** The field's value before the change. */
  previousValue: Value;
  /** The field's value after the change. */
  value: Value;
  /** Whether the field is currently touched. */
  touched: boolean;
  /** Whether the field is currently dirty. */
  dirty: boolean;
}

/**
 * A function that receives change notifications for a watched field.
 *
 * @typeParam Value - The value type of the watched field.
 *
 * @param payload - The watch payload describing the change.
 *
 * @example
 * ```ts
 * form.watch('email', ({ value, previousValue }) => {
 *   console.log('email changed from', previousValue, 'to', value);
 * });
 * ```
 */
export type WatchHandler<Value> = (payload: WatchPayload<Value>) => void;

/**
 * A function that removes a watch subscription when called.
 *
 * @returns `void`
 */
export type UnsubscribeWatch = () => void;
