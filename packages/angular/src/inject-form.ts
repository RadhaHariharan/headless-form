import { signal, computed, effect, inject, DestroyRef } from '@angular/core';
import type { Signal } from '@angular/core';
import { createFormStore } from '@headless-form/core';
import type {
  UseFormOptions,
  FormStoreApi,
  FormStoreSnapshot,
  FormErrors,
  DeepKeys,
  DeepValue,
  SetFieldValueOptions,
  ReorderPayload,
  FormValidateResult,
  FormValidateFieldResult,
  GetInputPropsOptions,
  GetInputPropsResult,
  WatchHandler,
  UnsubscribeWatch,
} from '@headless-form/core';

/**
 * The Angular-idiomatic form API returned by {@link injectForm}.
 *
 * @remarks
 * Read state is exposed as Angular `Signal`s so that components with
 * `ChangeDetectionStrategy.OnPush` and zoneless applications can react precisely to
 * the state they consume. Mutating methods are plain functions (identical to the React API).
 *
 * @typeParam Values - The form values type.
 * @typeParam TransformedValues - Output of `transformValues`; defaults to `Values`.
 * @typeParam TError - The error type; defaults to `unknown`.
 *
 * @see https://mantine.dev/form/use-form/
 */
export interface FormApi<Values, TransformedValues = Values, TError = unknown> {
  /**
   * Signal that holds the current form errors.
   * Updates when errors change (setFieldError, validate, etc.).
   */
  readonly errors: Signal<FormErrors<TError>>;

  /**
   * Signal that holds the current touched state.
   */
  readonly touched: Signal<Partial<Record<string, boolean>>>;

  /**
   * Signal that holds the current dirty state.
   */
  readonly dirty: Signal<Partial<Record<string, boolean>>>;

  /**
   * Signal that is `true` while any async validation is pending.
   */
  readonly validating: Signal<boolean>;

  /**
   * Signal that is `true` while an async submit is pending.
   */
  readonly submitting: Signal<boolean>;

  /**
   * Signal that is `true` after `initialize` has been called.
   */
  readonly initialized: Signal<boolean>;

  /**
   * Signal that reflects the current per-field key map (for uncontrolled mode).
   */
  readonly fieldKeys: Signal<Partial<Record<string, number>>>;

  // All mutating methods from the core store — same signatures.

  /**
   * Returns the latest form values.
   *
   * @returns Current form values.
   */
  getValues(): Values;

  /**
   * Returns the current initial-values snapshot.
   *
   * @returns Initial values snapshot.
   */
  getInitialValues(): Partial<Values>;

  /**
   * Replaces the initial-values reference.
   *
   * @param values - New initial values.
   */
  setInitialValues(values: Partial<Values>): void;

  /**
   * Sets values and initial values once (idempotent).
   *
   * @param values - The values to set as both current and initial.
   */
  initialize(values: Values): void;

  /**
   * Shallow-merges the given payload into the current values.
   *
   * @param values - New values or an updater function.
   */
  setValues(values: Partial<Values> | ((current: Values) => Partial<Values>)): void;

  /**
   * Sets the value at `path`.
   *
   * @param path - Dot-notation path.
   * @param value - New value or an updater function.
   * @param options - Optional `{ forceUpdate }`.
   */
  setFieldValue<K extends DeepKeys<Values>>(
    path: K,
    value: DeepValue<Values, K> | ((current: DeepValue<Values, K>) => DeepValue<Values, K>),
    options?: SetFieldValueOptions,
  ): void;

  /**
   * Resets a single field to its initial value.
   *
   * @param path - Dot-notation path.
   */
  resetField(path: DeepKeys<Values>): void;

  /**
   * Resets all values to their initial values.
   */
  reset(): void;

  /**
   * Replaces the entire errors record.
   *
   * @param errors - New errors record.
   */
  setErrors(errors: FormErrors<TError>): void;

  /**
   * Sets the error for a single field.
   *
   * @param path - Dot-notation path.
   * @param error - The error value.
   */
  setFieldError(path: string, error: TError): void;

  /**
   * Clears all errors.
   */
  clearErrors(): void;

  /**
   * Clears the error for a single field.
   *
   * @param path - Dot-notation path.
   */
  clearFieldError(path: string): void;

  /**
   * Returns whether a field (or any field) is touched.
   *
   * @param path - Optional dot-notation path.
   * @returns `true` if touched.
   */
  isTouched(path?: string): boolean;

  /**
   * Returns whether a field (or any field) is dirty.
   *
   * @param path - Optional dot-notation path.
   * @returns `true` if dirty.
   */
  isDirty(path?: string): boolean;

  /**
   * Returns the full touched record.
   *
   * @returns Touched record.
   */
  getTouched(): Partial<Record<string, boolean>>;

  /**
   * Returns the full dirty record.
   *
   * @returns Dirty record.
   */
  getDirty(): Partial<Record<string, boolean>>;

  /**
   * Replaces the touched record.
   *
   * @param touched - New touched record.
   */
  setTouched(touched: Partial<Record<string, boolean>>): void;

  /**
   * Replaces the dirty record.
   *
   * @param dirty - New dirty record.
   */
  setDirty(dirty: Partial<Record<string, boolean>>): void;

  /**
   * Clears all touched state.
   */
  resetTouched(): void;

  /**
   * Clears all dirty state.
   *
   * @param values - Optional new baseline for dirty comparisons.
   */
  resetDirty(values?: Partial<Values>): void;

  /**
   * Appends `item` to the array at `path`, or inserts at `index`.
   *
   * @param path - Dot-notation path to an array field.
   * @param item - The item to insert.
   * @param index - Optional insertion index.
   */
  insertListItem(path: string, item: unknown, index?: number): void;

  /**
   * Removes the item at `index` from the array at `path`.
   *
   * @param path - Dot-notation path.
   * @param index - Index to remove.
   */
  removeListItem(path: string, index: number): void;

  /**
   * Replaces the item at `index` in the array at `path`.
   *
   * @param path - Dot-notation path.
   * @param index - Index to replace.
   * @param item - Replacement item.
   */
  replaceListItem(path: string, index: number, item: unknown): void;

  /**
   * Moves the item at `from` to `to` in the array at `path`.
   *
   * @param path - Dot-notation path.
   * @param payload - `{ from, to }`.
   */
  reorderListItem(path: string, payload: ReorderPayload): void;

  /**
   * Validates all fields.
   *
   * @returns Result or Promise of result.
   */
  validate(): FormValidateResult<TError> | Promise<FormValidateResult<TError>>;

  /**
   * Validates a single field.
   *
   * @param path - Dot-notation path.
   * @returns Result or Promise of result.
   */
  validateField(
    path: string,
  ): FormValidateFieldResult<TError> | Promise<FormValidateFieldResult<TError>>;

  /**
   * Returns whether the form (or a single field) is valid without mutating errors.
   *
   * @param path - Optional path.
   * @returns `boolean` or `Promise<boolean>`.
   */
  isValid(path?: string): boolean | Promise<boolean>;

  /**
   * Returns whether the field at `path` is currently validating.
   *
   * @param path - Dot-notation path.
   * @returns `true` if validating.
   */
  isValidating(path: string): boolean;

  /**
   * Creates a submit handler.
   *
   * @param onValid - Called with transformed values when validation passes.
   * @param onInvalid - Called with errors when validation fails.
   * @returns An event handler.
   */
  onSubmit(
    onValid: (values: TransformedValues, event: Event | undefined) => void | Promise<void>,
    onInvalid?: (errors: FormErrors<TError>, values: Values, event: Event | undefined) => void,
  ): (event: Event) => void;

  /**
   * A form reset handler.
   *
   * @param event - The native reset event.
   */
  onReset(event: Event): void;

  /**
   * Manually sets the submitting state.
   *
   * @param value - The new submitting state.
   */
  setSubmitting(value: boolean): void;

  /**
   * Returns props to bind to a native input (Angular equivalent: use `[hfField]` directive).
   *
   * @param path - Dot-notation path.
   * @param options - Optional type/withError/withFocus overrides.
   * @returns Input props object.
   */
  getInputProps(path: string, options?: GetInputPropsOptions<TError>): GetInputPropsResult<TError>;

  /**
   * Returns the DOM element whose `data-path` matches, or `null` on the server.
   *
   * @param path - Dot-notation path.
   * @returns The DOM element, or `null`.
   */
  getInputNode(path: string): HTMLElement | null;

  /**
   * Applies `transformValues` to the given values (or current values when omitted).
   *
   * @param values - Optional values to transform.
   * @returns The transformed output.
   */
  getTransformedValues(values?: Values): TransformedValues;

  /**
   * Subscribes to changes on a field.
   *
   * @param path - Dot-notation path to watch.
   * @param handler - Called each time the field's value changes.
   * @returns An unsubscribe function.
   */
  watch<K extends DeepKeys<Values>>(path: K, handler: WatchHandler<DeepValue<Values, K>>): UnsubscribeWatch;

  /**
   * Returns a stable key string for the input at `path` (uncontrolled remount trick).
   *
   * @param path - Dot-notation path.
   * @returns A stable key string.
   */
  key(path: string): string;
}

/**
 * Creates and returns an Angular signals-based form API.
 *
 * @remarks
 * Must be called in an Angular injection context (e.g. inside a constructor or a function
 * run under `runInInjectionContext`). The form automatically cleans up its store subscription
 * when the component or service is destroyed.
 *
 * Reads state as `Signal`s; mutating methods are identical to the React / core API.
 * Works under `ChangeDetectionStrategy.OnPush` and in zoneless applications.
 *
 * @typeParam Values - Shape of the form values.
 * @typeParam TransformedValues - Output of `transformValues`; defaults to `Values`.
 * @typeParam TError - The error type; defaults to `unknown`.
 *
 * @param options - Form configuration options.
 * @returns A `FormApi` instance with Signal-based read state.
 *
 * @see https://mantine.dev/form/use-form/
 *
 * @example
 * ```ts
 * @Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
 * export class MyFormComponent {
 *   form = injectForm({
 *     initialValues: { email: '', password: '' },
 *     validate: { email: isEmail('Invalid email') },
 *   });
 * }
 * ```
 */
export function injectForm<Values, TransformedValues = Values, TError = unknown>(
  options: UseFormOptions<Values, TransformedValues, TError> = {},
): FormApi<Values, TransformedValues, TError> {
  const store = createFormStore<Values, TransformedValues, TError>(options);
  const destroyRef = inject(DestroyRef);

  // Signals backed by the store snapshot
  const snapshotSignal = signal<FormStoreSnapshot<TError>>(store.getSnapshot());

  // Bridge: store subscriber → Angular signal write
  const unsubscribe = store.subscribe(() => {
    snapshotSignal.set(store.getSnapshot());
  });

  destroyRef.onDestroy(() => {
    unsubscribe();
  });

  const errorsSignal = computed(() => snapshotSignal().errors);
  const touchedSignal = computed(() => snapshotSignal().touched);
  const dirtySignal = computed(() => snapshotSignal().dirty);
  const validatingSignal = computed(() => snapshotSignal().validating);
  const submittingSignal = computed(() => snapshotSignal().submitting);
  const initializedSignal = computed(() => snapshotSignal().initialized);
  const fieldKeysSignal = computed(() => snapshotSignal().fieldKeys);

  return {
    errors: errorsSignal,
    touched: touchedSignal,
    dirty: dirtySignal,
    validating: validatingSignal,
    submitting: submittingSignal,
    initialized: initializedSignal,
    fieldKeys: fieldKeysSignal,

    getValues: () => store.getValues(),
    getInitialValues: () => store.getInitialValues(),
    setInitialValues: (values) => store.setInitialValues(values),
    initialize: (values) => store.initialize(values),
    setValues: (updater) => store.setValues(updater),
    setFieldValue: (path, value, opts) => store.setFieldValue(path, value, opts),
    resetField: (path) => store.resetField(path),
    reset: () => store.reset(),
    setErrors: (errors) => store.setErrors(errors),
    setFieldError: (path, error) => store.setFieldError(path, error),
    clearErrors: () => store.clearErrors(),
    clearFieldError: (path) => store.clearFieldError(path),
    isTouched: (path) => store.isTouched(path),
    isDirty: (path) => store.isDirty(path),
    getTouched: () => store.getTouched(),
    getDirty: () => store.getDirty(),
    setTouched: (touched) => store.setTouched(touched),
    setDirty: (dirty) => store.setDirty(dirty),
    resetTouched: () => store.resetTouched(),
    resetDirty: (values) => store.resetDirty(values),
    insertListItem: (path, item, index) => store.insertListItem(path, item, index),
    removeListItem: (path, index) => store.removeListItem(path, index),
    replaceListItem: (path, index, item) => store.replaceListItem(path, index, item),
    reorderListItem: (path, payload) => store.reorderListItem(path, payload),
    validate: () => store.validate(),
    validateField: (path) => store.validateField(path),
    isValid: (path) => store.isValid(path),
    isValidating: (path) => store.isValidating(path),
    onSubmit: (onValid, onInvalid) => store.onSubmit(onValid, onInvalid),
    onReset: (event) => store.onReset(event),
    setSubmitting: (value) => store.setSubmitting(value),
    getInputProps: (path, opts) => store.getInputProps(path, opts),
    getInputNode: (path) => store.getInputNode(path),
    getTransformedValues: (values) => store.getTransformedValues(values),
    watch: (path, handler) => store.watch(path, handler),
    key: (path) => store.key(path),
  };
}
