import type { FormErrors, FormStoreApi } from '@headlesskit/forms';

/**
 * Like `form.onSubmit`, but returns a zero-argument function suitable for React Native's
 * `onPress` instead of a DOM `FormEventHandler`.
 *
 * @remarks
 * The underlying handler unconditionally calls `event.preventDefault()` by default
 * (`onSubmitPreventDefault: 'always'`). Since there is no native submit event in React
 * Native, this passes a no-op stand-in so that call never throws — callers don't need to
 * pass `undefined` or configure `onSubmitPreventDefault` themselves.
 *
 * @param form - A form store (from `useForm` or `createFormStore`).
 * @param onValid - Called with the transformed values when validation passes.
 * @param onInvalid - Optional; called with errors and raw values when validation fails.
 * @returns A zero-argument handler.
 *
 * @example
 * ```tsx
 * <Button title="Submit" onPress={getSubmitHandler(form, (values) => save(values))} />
 * ```
 */
export function getSubmitHandler<Values, TransformedValues, TError>(
  form: FormStoreApi<Values, TransformedValues, TError>,
  onValid: (values: TransformedValues) => void | Promise<void>,
  onInvalid?: (errors: FormErrors<TError>, values: Values) => void,
): () => void {
  const handler = form.onSubmit(
    (values) => onValid(values),
    (errors, values) => onInvalid?.(errors, values),
  );

  const noopEvent = { preventDefault: () => {} } as unknown as Event;

  return () => {
    handler(noopEvent);
  };
}
