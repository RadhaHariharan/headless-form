import { signal, computed, inject, DestroyRef } from '@angular/core';
import type { Signal } from '@angular/core';
import { createFormStore } from '@headless-form/core';
import type { FormMode, GetInputPropsResult, UseFormOptions } from '@headless-form/core';

/**
 * Options for {@link injectField}.
 *
 * @typeParam Value - The field value type.
 * @typeParam TError - The error type.
 */
export interface InjectFieldOptions<Value, TError = unknown> {
  /**
   * The initial value for the field.
   */
  initialValue: Value;

  /**
   * A validation rule for this field.
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
   * The input type hint.
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
 * The value returned by {@link injectField}.
 *
 * @typeParam Value - The field value type.
 * @typeParam TError - The error type.
 */
export interface InjectFieldReturnType<Value, TError = unknown> {
  /**
   * A signal holding the current field error, or `null` when valid.
   */
  readonly error: Signal<TError | null>;

  /**
   * A signal that is `true` when the field is currently validating asynchronously.
   */
  readonly isValidating: Signal<boolean>;

  /**
   * A stable key string for forcing input remounts.
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
   * Runs the field's validation rule.
   *
   * @returns A promise resolving to the error (or null/undefined when valid).
   */
  validate(): Promise<TError | null | undefined>;

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
 * A standalone single-field injection function, equivalent to React's `useField`.
 * Must be called in an Angular injection context.
 *
 * @remarks
 * Returns an `error` signal and an `isValidating` signal alongside the standard field methods.
 * The field automatically unsubscribes when the injection context is destroyed.
 *
 * @typeParam Value - The field value type.
 * @typeParam TError - The error type; defaults to `unknown`.
 *
 * @param options - Field options.
 * @returns An `InjectFieldReturnType` object.
 *
 * @see https://mantine.dev/form/use-field/
 *
 * @example
 * ```ts
 * export class EmailFieldComponent {
 *   field = injectField({
 *     initialValue: '',
 *     validate: isEmail('Invalid email'),
 *   });
 * }
 * ```
 */
export function injectField<Value, TError = unknown>(
  options: InjectFieldOptions<Value, TError>,
): InjectFieldReturnType<Value, TError> {
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

  const store = createFormStore<FieldValues, FieldValues, TError>(storeOptions);
  const destroyRef = inject(DestroyRef);
  const snapshotSignal = signal(store.getSnapshot());

  const unsubscribe = store.subscribe(() => {
    snapshotSignal.set(store.getSnapshot());
  });

  destroyRef.onDestroy(() => {
    unsubscribe();
  });

  const errorSignal = computed(() => (snapshotSignal().errors['field'] ?? null) as TError | null);
  const isValidatingSignal = computed(() => snapshotSignal().fieldValidating['field'] === true);

  return {
    error: errorSignal,
    isValidating: isValidatingSignal,
    get key() {
      const snap = snapshotSignal();
      return `${snap.formKey}-field-${snap.fieldKeys['field'] ?? 0}`;
    },
    getValue: () => store.getValues().field,
    setValue: (value) => {
      const resolved =
        typeof value === 'function'
          ? (value as (c: Value) => Value)(store.getValues().field)
          : value;
      store.setFieldValue('field', resolved as FieldValues['field']);
    },
    reset: () => store.resetField('field'),
    getInputProps: () => store.getInputProps('field', { type }),
    validate: async () => {
      const result = await Promise.resolve(store.validateField('field'));
      return result.error as TError | null | undefined;
    },
    get isDirty() {
      return store.isDirty('field');
    },
    get isTouched() {
      return store.isTouched('field');
    },
    setError: (e) => store.setFieldError('field', e),
    clearError: () => store.clearFieldError('field'),
  };
}
