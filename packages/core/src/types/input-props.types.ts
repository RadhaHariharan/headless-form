/**
 * Types for the `getInputProps` API.
 *
 * @see https://mantine.dev/form/get-input-props/
 */

/**
 * The input type hint passed to `getInputProps`.
 *
 * @remarks
 * - `'input'` — standard text/number inputs; result includes `value`/`defaultValue`.
 * - `'checkbox'` — checkboxes; result includes `checked`/`defaultChecked`.
 * - `'radio'` — radio buttons; requires `value` in options; result sets `checked`/`defaultChecked`
 *   by equality with the stored value.
 */
export type InputType = 'input' | 'checkbox' | 'radio';

/**
 * Options passed to `getInputProps(path, options)`.
 *
 * @typeParam TError - The error type.
 */
export interface GetInputPropsOptions<TError = unknown> {
  /**
   * The input type; controls whether `value`/`checked` vs `defaultValue`/`defaultChecked` are set.
   * @defaultValue `'input'`
   */
  type?: InputType;

  /**
   * When `true`, the `error` property is included in the result.
   * @defaultValue `true`
   */
  withError?: boolean;

  /**
   * When `true`, `onFocus` and `onBlur` handlers are included.
   * @defaultValue `type !== 'radio'`
   */
  withFocus?: boolean;

  /**
   * For `type: 'radio'`, the value this radio option represents.
   * The `checked`/`defaultChecked` result is `storedValue === value`.
   */
  value?: unknown;

  /**
   * Any additional properties to merge onto the result (forwarded through `enhanceGetInputProps`).
   */
  [key: string]: unknown;
}

/**
 * The object returned by `getInputProps(path, options)`.
 *
 * @typeParam TError - The error type.
 *
 * @remarks
 * In **controlled** mode the result includes `value` / `checked`.
 * In **uncontrolled** mode it includes `defaultValue` / `defaultChecked` instead —
 * this is the key to zero-remount uncontrolled inputs.
 *
 * @see https://mantine.dev/form/get-input-props/
 */
export interface GetInputPropsResult<TError = unknown> {
  /** The `data-path` attribute written to the DOM element, enabling {@link FormStoreApi.getInputNode}. */
  'data-path': string;

  /** Normalised `onChange` handler. Accepts an event, `checked` boolean, or raw value. */
  onChange: (eventOrValue: unknown) => void;

  /** Present in controlled mode for text/number inputs. */
  value?: string | number | readonly string[] | undefined;

  /** Present in uncontrolled mode for text/number inputs. */
  defaultValue?: string | number | readonly string[] | undefined;

  /** Present in controlled mode for checkboxes/radios. */
  checked?: boolean;

  /** Present in uncontrolled mode for checkboxes/radios. */
  defaultChecked?: boolean;

  /** The radio option value (echoed back when `type='radio'`). */
  radioValue?: unknown;

  /** The current error for this field; only present when `withError: true`. */
  error?: TError;

  /** Marks the field touched (fired on focus or change, per `touchTrigger`). */
  onFocus?: () => void;

  /** Triggers validation when `validateInputOnBlur` matches. */
  onBlur?: () => void;
}

/**
 * Payload passed to the `enhanceGetInputProps` callback.
 *
 * @typeParam Values - The form values type.
 * @typeParam TError - The error type.
 */
export interface EnhanceGetInputPropsPayload<Values, TError = unknown> {
  /** The result produced by the default `getInputProps` logic (before enhancement). */
  inputProps: GetInputPropsResult<TError>;
  /** The dot-notation path of the field. */
  field: string;
  /** The options passed to `getInputProps`. */
  options: GetInputPropsOptions<TError>;
  /** The form store API (allows reading values/errors/status inside the enhancer). */
  form: import('./store.types.js').FormStoreApi<Values, Values, unknown>;
}
