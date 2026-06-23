import type { DeepKeys, FormStoreApi, GetInputPropsOptions } from '@headlesskit/forms';

/**
 * The subset of React Native's `TextInputProps` produced by {@link getTextInputProps}.
 *
 * @typeParam TError - The error type.
 */
export interface GetTextInputPropsResult<TError = unknown> {
  /** Present in controlled mode. */
  value?: string | undefined;
  /** Present in uncontrolled mode. */
  defaultValue?: string | undefined;
  /** Receives the raw string directly — React Native's `onChangeText`, not a change event. */
  onChangeText: (text: string) => void;
  /** Marks the field touched (per `touchTrigger`). */
  onFocus?: (() => void) | undefined;
  /** Triggers validation when `validateInputOnBlur` matches. */
  onBlur?: (() => void) | undefined;
  /** The current error for this field; only present when `withError: true` (the default). */
  error?: TError | undefined;
}

/**
 * Options for {@link getTextInputProps}.
 *
 * @typeParam TError - The error type.
 */
export type GetTextInputPropsOptions<TError = unknown> = Pick<
  GetInputPropsOptions<TError>,
  'withError' | 'withFocus'
>;

/**
 * Like `form.getInputProps`, but shaped for React Native's `<TextInput>` instead of a DOM
 * `<input>` — `onChangeText` receives the raw string directly rather than a change event.
 *
 * @remarks
 * `error` is included for convenience but is not a real `TextInput` prop — destructure it
 * out before spreading the rest onto the component (see example).
 *
 * @param form - A form store (from `useForm` or `createFormStore`).
 * @param path - Dot-notation path of the field.
 * @param options - Optional `withError` / `withFocus` overrides.
 * @returns Props to spread onto a `<TextInput>`.
 *
 * @example
 * ```tsx
 * const { error, ...inputProps } = getTextInputProps(form, 'email');
 *
 * return (
 *   <>
 *     <TextInput key={form.key('email')} {...inputProps} />
 *     {error && <Text>{error}</Text>}
 *   </>
 * );
 * ```
 */
export function getTextInputProps<Values, TransformedValues, TError, K extends DeepKeys<Values>>(
  form: FormStoreApi<Values, TransformedValues, TError>,
  path: K,
  options?: GetTextInputPropsOptions<TError>,
): GetTextInputPropsResult<TError> {
  const { value, defaultValue, onChange, onFocus, onBlur, error } = form.getInputProps(path, options);

  return {
    value: value as string | undefined,
    defaultValue: defaultValue as string | undefined,
    onChangeText: (text: string) => onChange(text),
    onFocus,
    onBlur,
    error,
  };
}
