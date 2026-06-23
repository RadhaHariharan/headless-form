import { useRef, useSyncExternalStore, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createFormStore } from '@headlesskit/forms';
import type { FormMode, UseFormOptions, GetInputPropsResult } from '@headlesskit/forms';

/**
 * Options for {@link useField}.
 *
 * @typeParam Value - The field value type.
 * @typeParam TError - The error type; defaults to `ReactNode`.
 */
export interface UseFieldOptions<Value, TError = ReactNode> {
  /**
   * The initial value for the field.
   */
  initialValue: Value;

  /**
   * A validation rule for this field.
   * Receives the current value; returns an error or `null`/`undefined` when valid.
   *
   * @param value - The current field value.
   * @returns An error or `null`/`undefined`.
   */
  validate?: (value: Value) => TError | null | undefined | Promise<TError | null | undefined>;

  /**
   * When `true`, validates the field on every value change.
   * @defaultValue `false`
   */
  validateOnChange?: boolean;

  /**
   * When `true`, validates the field on blur.
   * @defaultValue `false`
   */
  validateOnBlur?: boolean;

  /**
   * Maps a thrown validation error to the error type.
   *
   * @param error - The thrown value.
   * @returns A `TError` value.
   */
  resolveValidationError?: (error: unknown) => TError;

  /**
   * The input type hint, forwarded to `getInputProps`.
   * @defaultValue `'input'`
   */
  type?: 'input' | 'checkbox' | 'radio';

  /**
   * The form mode.
   * @defaultValue `'controlled'`
   */
  mode?: FormMode;
}

/**
 * The value returned by {@link useField}.
 *
 * @typeParam Value - The field value type.
 * @typeParam TError - The error type.
 */
export interface UseFieldReturnType<Value, TError = ReactNode> {
  /**
   * A stable key string for forcing input remounts (uncontrolled mode).
   */
  key: string;

  /**
   * Returns the latest field value.
   *
   * @returns The current field value.
   */
  getValue(): Value;

  /**
   * Sets the field value.
   *
   * @param value - The new value or an updater function.
   */
  setValue(value: Value | ((current: Value) => Value)): void;

  /**
   * Resets the field to its initial value.
   */
  reset(): void;

  /**
   * Returns input props to spread onto a DOM element.
   *
   * @returns Input props object.
   */
  getInputProps(): GetInputPropsResult<TError>;

  /**
   * The current error for this field, or `null` when valid.
   */
  error: TError | null;

  /**
   * Runs the field's validation rule and updates the error.
   *
   * @returns A promise that resolves to the error (or `null`/`undefined` when valid).
   */
  validate(): Promise<TError | null | undefined>;

  /**
   * Whether the field is currently validating asynchronously.
   */
  isValidating: boolean;

  /**
   * Whether the field's value differs from its initial value.
   */
  isDirty: boolean;

  /**
   * Whether the field has been interacted with.
   */
  isTouched: boolean;

  /**
   * Manually set the field's error.
   *
   * @param error - The error to set.
   */
  setError(error: TError): void;

  /**
   * Clears the field's error.
   */
  clearError(): void;
}

/**
 * A standalone single-field hook, equivalent to a stripped-down `useForm` scoped to one value.
 *
 * @remarks
 * Useful for library authors or components that need field-level validation and state
 * without a full form.
 *
 * @typeParam Value - The field value type.
 * @typeParam TError - The error type; defaults to `ReactNode`.
 *
 * @param options - Field options.
 * @returns A `UseFieldReturnType` object.
 *
 * @example
 * ```tsx
 * const field = useField({
 *   initialValue: '',
 *   validate: (v) => v.trim() ? null : 'Required',
 *   validateOnChange: true,
 * });
 *
 * return <input {...field.getInputProps()} />;
 * ```
 */
export function useField<Value, TError = ReactNode>(
  options: UseFieldOptions<Value, TError>,
): UseFieldReturnType<Value, TError> {
  const {
    initialValue,
    validate: validateFn,
    validateOnChange = false,
    validateOnBlur = false,
    resolveValidationError,
    type = 'input',
    mode = 'controlled',
  } = options;

  type FieldValues = { field: Value };

  const storeOptions: UseFormOptions<FieldValues, FieldValues, TError> = {
    mode,
    initialValues: { field: initialValue },
    validateInputOnChange: validateOnChange,
    validateInputOnBlur: validateOnBlur,
    ...(resolveValidationError !== undefined ? { resolveValidationError } : {}),
    ...(validateFn !== undefined
      ? {
          validate: {
            field: (v: Value) =>
              validateFn(v) as TError | null | undefined | Promise<TError | null | undefined>,
          },
        }
      : {}),
  };

  const storeRef = useRef<ReturnType<typeof createFormStore<FieldValues, FieldValues, TError>> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createFormStore<FieldValues, FieldValues, TError>(storeOptions);
  }
  const store = storeRef.current;

  const snapshot = useSyncExternalStore(
    useCallback((cb) => store.subscribe(cb), [store]),
    () => store.getSnapshot(),
    () => store.getServerSnapshot(),
  );

  const error = (snapshot.errors['field'] ?? null) as TError | null;
  const isValidating = snapshot.fieldValidating['field'] === true;
  const isDirty = store.isDirty('field');
  const isTouched = store.isTouched('field');
  const fieldKey = `${snapshot.formKey}-field-${snapshot.fieldKeys['field'] ?? 0}`;

  return {
    key: fieldKey,
    getValue: () => store.getValues().field,
    setValue: (value) => {
      const resolved = typeof value === 'function'
        ? (value as (c: Value) => Value)(store.getValues().field)
        : value;
      store.setFieldValue('field', resolved as FieldValues['field']);
    },
    reset: () => store.resetField('field'),
    getInputProps: () => store.getInputProps('field', { type }),
    error,
    validate: async () => {
      const result = await Promise.resolve(store.validateField('field'));
      return result.error as TError | null | undefined;
    },
    isValidating,
    isDirty,
    isTouched,
    setError: (e) => store.setFieldError('field', e),
    clearError: () => store.clearFieldError('field'),
  };
}
