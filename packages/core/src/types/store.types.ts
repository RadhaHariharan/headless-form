import type { DeepKeys, DeepValue } from './path.types.js';
import type { FormErrors, FormValidateInput, FormValidateResult, FormValidateFieldResult } from './validation.types.js';
import type { GetInputPropsOptions, GetInputPropsResult, EnhanceGetInputPropsPayload } from './input-props.types.js';
import type { WatchHandler, UnsubscribeWatch } from './watch.types.js';

/**
 * Controls when form values cause UI updates.
 *
 * @remarks
 * - `'controlled'` — values stored in reactive framework state; every `setFieldValue` triggers a UI update.
 * - `'uncontrolled'` — values stored in an internal ref; the UI updates only for errors / touched / dirty /
 *   validating state changes. Typing does **not** re-render the form. Recommended for performance.
 *
 * @defaultValue `'controlled'`
 *
 * @see https://mantine.dev/form/uncontrolled/
 */
export type FormMode = 'controlled' | 'uncontrolled';

/**
 * Controls when `onSubmit` calls `event.preventDefault()`.
 *
 * @remarks
 * - `'always'` — always prevent default.
 * - `'never'` — never prevent default.
 * - `'validation-failed'` — prevent default only when validation fails.
 *
 * @defaultValue `'always'`
 */
export type OnSubmitPreventDefault = 'always' | 'never' | 'validation-failed';

/**
 * Controls which interaction marks a field as touched.
 *
 * @remarks
 * - `'change'` — the field becomes touched on its first value change.
 * - `'focus'` — the field becomes touched on the first focus event.
 *
 * @defaultValue `'change'`
 */
export type TouchTrigger = 'change' | 'focus';

/**
 * Options accepted by {@link createFormStore}, {@link useForm} (React), and {@link injectForm} (Angular).
 *
 * @typeParam Values - Shape of the form values; drives every path-typed method via {@link DeepKeys}.
 * @typeParam TransformedValues - Output type of {@link UseFormOptions.transformValues}; defaults to `Values`.
 * @typeParam TError - The form error type; defaults to `unknown`.
 *
 * @see https://mantine.dev/form/use-form/
 *
 * @example
 * ```ts
 * const form = useForm<{ email: string }>({
 *   mode: 'uncontrolled',
 *   initialValues: { email: '' },
 *   validate: { email: isEmail('Invalid email') },
 * });
 * ```
 */
export interface UseFormOptions<Values, TransformedValues = Values, TError = unknown> {
  /**
   * Registers the form in the global registry under this name, enabling {@link createFormActions}.
   * Only `[a-zA-Z0-9-]` characters are allowed; invalid names throw in development.
   *
   * @see https://mantine.dev/form/actions/
   */
  name?: string;

  /**
   * Controls how value changes propagate to the UI.
   *
   * @remarks
   * - `'uncontrolled'` keeps values in an internal ref; the UI updates only when errors,
   *   touched, dirty or validation state change. Best performance; recommended.
   * - `'controlled'` keeps values in framework-reactive state; the UI updates on every change.
   * @defaultValue `'controlled'`
   */
  mode?: FormMode;

  /**
   * The initial shape of the form values.
   * All path-typed APIs infer their types from this value's shape.
   */
  initialValues?: Partial<Values>;

  /**
   * Errors present when the form is first mounted.
   * @defaultValue `{}`
   */
  initialErrors?: FormErrors<TError>;

  /**
   * Dirty flags present when the form is first mounted.
   * @defaultValue `{}`
   */
  initialDirty?: Partial<Record<string, boolean>>;

  /**
   * Touched flags present when the form is first mounted.
   * @defaultValue `{}`
   */
  initialTouched?: Partial<Record<string, boolean>>;

  /**
   * When `true`, the error for a field is cleared the next time its value changes.
   * @defaultValue `true`
   */
  clearInputErrorOnChange?: boolean;

  /**
   * Triggers per-field validation on value change.
   * Pass `true` to validate all fields, or an array of dot-notation paths to validate only those fields.
   * @defaultValue `false`
   */
  validateInputOnChange?: boolean | string[];

  /**
   * Triggers per-field validation on blur.
   * Pass `true` to validate all fields, or an array of dot-notation paths to validate only those fields.
   * @defaultValue `false`
   */
  validateInputOnBlur?: boolean | string[];

  /**
   * Called on every value change with the new and previous values.
   * Use instead of a value-watching effect (in uncontrolled mode `values` is a stable ref and won't trigger effects).
   *
   * @param values - Current values after the change.
   * @param previous - Values immediately before the change.
   *
   * @see https://mantine.dev/form/values/
   */
  onValuesChange?: (values: Values, previous: Values) => void;

  /**
   * Transforms values before `onSubmit` delivers them to `onValid`, and before `getTransformedValues`.
   *
   * @param values - The raw form values.
   * @returns The transformed output.
   *
   * @see https://mantine.dev/form/values/
   */
  transformValues?: (values: Values) => TransformedValues;

  /**
   * Globally augments the object returned by `getInputProps`.
   * Runs after the default result is built; its return value is merged onto the result.
   *
   * @param payload - Contains `inputProps`, `field`, `options`, and `form`.
   * @returns Partial overrides to merge onto the input-props result.
   *
   * @see https://mantine.dev/form/get-input-props/
   */
  enhanceGetInputProps?: (
    payload: EnhanceGetInputPropsPayload<Values, TError>,
  ) => Partial<GetInputPropsResult<TError>> | undefined;

  /**
   * Per-field rules object **or** a whole-form validator function.
   *
   * @see https://mantine.dev/form/validation/
   */
  validate?: FormValidateInput<Values, TError>;

  /**
   * Controls when `event.preventDefault()` is called inside the `onSubmit` handler.
   * @defaultValue `'always'`
   */
  onSubmitPreventDefault?: OnSubmitPreventDefault;

  /**
   * Which interaction marks a field as touched.
   * @defaultValue `'change'`
   */
  touchTrigger?: TouchTrigger;

  /**
   * When `true`, changing a value also notifies `watch` subscribers on ancestor paths
   * (e.g. changing `a.b.c` triggers watchers on `a.b` and `a`).
   * @defaultValue `false`
   */
  cascadeUpdates?: boolean;

  /**
   * Debounce in milliseconds applied to per-field validation triggered by change/blur.
   * @defaultValue `0`
   */
  validateDebounce?: number;

  /**
   * Maps a thrown validation error (from an async validator or schema resolver) to the error type.
   * The default converts `Error` instances to their `.message`; all else to `String(error)`.
   *
   * @param error - The thrown value (always `unknown`).
   * @returns A `TError` value to store for the field.
   */
  resolveValidationError?: (error: unknown) => TError;
}

/**
 * Options for `setFieldValue`.
 */
export interface SetFieldValueOptions {
  /**
   * When `true` (the default for programmatic calls), the field's key counter is bumped,
   * causing the bound input to remount and pick up the new `defaultValue`/`defaultChecked`
   * in uncontrolled mode.
   *
   * Pass `false` to skip the bump — this is what `getInputProps().onChange` does internally
   * so that typing does **not** trigger a remount.
   *
   * @defaultValue `true`
   */
  forceUpdate?: boolean;
}

/**
 * Arguments for `reorderListItem`.
 */
export interface ReorderPayload {
  /** Source index (the item to move). */
  from: number;
  /** Destination index. */
  to: number;
}

/**
 * The core form store API — returned by `createFormStore`, extended by React's `UseFormReturnType`
 * and Angular's `FormApi`.
 *
 * @typeParam Values - The form values type.
 * @typeParam TransformedValues - The output of `transformValues`; defaults to `Values`.
 * @typeParam TError - The error type.
 *
 * @see https://mantine.dev/form/use-form/
 */
export interface FormStoreApi<Values, TransformedValues = Values, TError = unknown> {
  // ── Values ─────────────────────────────────────────────────────────────────

  /**
   * The current form values.
   *
   * @remarks
   * In **controlled** mode this is reactive (React state / Angular signal).
   * In **uncontrolled** mode this is a stable ref snapshot — always call {@link getValues} to
   * read the latest values.
   */
  values: Values;

  /**
   * Returns the latest form values regardless of mode.
   *
   * @returns Current form values.
   */
  getValues(): Values;

  /**
   * Returns the current initial-values snapshot.
   * Used by `isDirty` comparisons and `reset`.
   *
   * @returns Initial values snapshot.
   */
  getInitialValues(): Partial<Values>;

  /**
   * Replaces the initial-values reference used for dirty comparisons without changing the
   * current values.
   *
   * @param values - New initial values.
   */
  setInitialValues(values: Partial<Values>): void;

  /**
   * Sets values **and** initial values once; idempotent after the first call.
   * Flips {@link initialized} to `true`.
   *
   * @param values - The values to set as both current and initial.
   */
  initialize(values: Values): void;

  /**
   * `true` after {@link initialize} has been called at least once.
   */
  initialized: boolean;

  /**
   * Shallow-merges the given payload into the current values.
   * Accepts a partial values object or a function `(current) => next`.
   *
   * @param values - New values or an updater function.
   */
  setValues(values: Partial<Values> | ((current: Values) => Partial<Values>)): void;

  /**
   * Sets the value at `path`.
   * Accepts a raw value or a function `(current) => next`.
   *
   * @param path - Dot-notation path.
   * @param value - New value or an updater function.
   * @param options - Optional `{ forceUpdate }` (default `true`).
   */
  setFieldValue<K extends DeepKeys<Values>>(
    path: K,
    value: DeepValue<Values, K> | ((current: DeepValue<Values, K>) => DeepValue<Values, K>),
    options?: SetFieldValueOptions,
  ): void;

  /**
   * Resets one field to its initial value and clears its error, touched, and dirty state.
   *
   * @param path - Dot-notation path of the field to reset.
   */
  resetField(path: DeepKeys<Values>): void;

  /**
   * Resets all values to their initial values, clears errors/touched/dirty/validating state,
   * and bumps the form key (causing all uncontrolled inputs to remount).
   */
  reset(): void;

  // ── Errors ─────────────────────────────────────────────────────────────────

  /**
   * The current form errors, keyed by dot-notation field path.
   *
   * @see https://mantine.dev/form/errors/
   */
  errors: FormErrors<TError>;

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
   * @param error - The error value to set.
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

  // ── Status — touched & dirty ────────────────────────────────────────────────

  /**
   * Returns whether the field at `path` (or any field when omitted) is touched.
   *
   * @param path - Optional dot-notation path.
   * @returns `true` if touched.
   *
   * @see https://mantine.dev/form/status/
   */
  isTouched(path?: string): boolean;

  /**
   * Returns whether the field at `path` (or any field when omitted) is dirty.
   *
   * @param path - Optional dot-notation path.
   * @returns `true` if dirty.
   *
   * @see https://mantine.dev/form/status/
   */
  isDirty(path?: string): boolean;

  /**
   * Returns the full touched record.
   *
   * @returns Record of `{ [path]: boolean }`.
   */
  getTouched(): Partial<Record<string, boolean>>;

  /**
   * Returns the full dirty record.
   *
   * @returns Record of `{ [path]: boolean }`.
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
   * Clears all dirty state, optionally updating the comparison snapshot.
   *
   * @param values - If provided, sets this as the new "clean" baseline for dirty comparisons.
   */
  resetDirty(values?: Partial<Values>): void;

  // ── Lists ───────────────────────────────────────────────────────────────────

  /**
   * Appends `item` to the array at `path`, or inserts it at `index` when provided.
   *
   * @param path - Dot-notation path to an array field.
   * @param item - The item to insert.
   * @param index - Optional insertion index; appends when omitted.
   *
   * @see https://mantine.dev/form/nested/
   */
  insertListItem(path: string, item: unknown, index?: number): void;

  /**
   * Removes the item at `index` from the array at `path`.
   *
   * @param path - Dot-notation path to an array field.
   * @param index - Index of the item to remove.
   *
   * @see https://mantine.dev/form/nested/
   */
  removeListItem(path: string, index: number): void;

  /**
   * Replaces the item at `index` in the array at `path`.
   *
   * @param path - Dot-notation path to an array field.
   * @param index - Index of the item to replace.
   * @param item - The replacement item.
   *
   * @see https://mantine.dev/form/nested/
   */
  replaceListItem(path: string, index: number, item: unknown): void;

  /**
   * Moves the item at `from` to `to` in the array at `path`.
   *
   * @param path - Dot-notation path to an array field.
   * @param payload - `{ from, to }` indices.
   *
   * @see https://mantine.dev/form/nested/
   */
  reorderListItem(path: string, payload: ReorderPayload): void;

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * Validates all fields. Returns synchronously when all validators are sync;
   * returns a `Promise` when any validator is async.
   *
   * @returns `FormValidateResult` or `Promise<FormValidateResult>`.
   *
   * @see https://mantine.dev/form/validation/
   */
  validate(): FormValidateResult<TError> | Promise<FormValidateResult<TError>>;

  /**
   * Validates a single field. Returns synchronously when the validator is sync;
   * returns a `Promise` when the validator is async.
   *
   * @param path - Dot-notation path of the field to validate.
   * @returns `FormValidateFieldResult` or `Promise<FormValidateFieldResult>`.
   *
   * @see https://mantine.dev/form/validation/
   */
  validateField(
    path: string,
  ): FormValidateFieldResult<TError> | Promise<FormValidateFieldResult<TError>>;

  /**
   * Returns whether the form (or a single field) is currently valid **without mutating errors**.
   *
   * @param path - When provided, checks only that field.
   * @returns `boolean` or `Promise<boolean>`.
   *
   * @see https://mantine.dev/form/validation/
   */
  isValid(path?: string): boolean | Promise<boolean>;

  /**
   * `true` while any async validation is pending.
   */
  validating: boolean;

  /**
   * Returns whether the field at `path` is currently validating asynchronously.
   *
   * @param path - Dot-notation path.
   * @returns `true` if that field's validation is pending.
   */
  isValidating(path: string): boolean;

  // ── Submit / reset handlers ────────────────────────────────────────────────

  /**
   * Creates a submit handler for a `<form onSubmit>` (React) or `(ngSubmit)` (Angular).
   *
   * Validates all fields first. Calls `onValid(transformedValues, event)` on success,
   * or `onInvalid(errors, values, event)` on failure.
   *
   * @param onValid - Called with the transformed values when validation passes.
   * @param onInvalid - Optional; called with errors and raw values when validation fails.
   * @returns An event handler function.
   *
   * @see https://mantine.dev/form/use-form/
   *
   * @example
   * ```tsx
   * <form onSubmit={form.onSubmit((values) => console.log(values))}>
   * ```
   */
  onSubmit(
    onValid: (values: TransformedValues, event: Event | undefined) => void | Promise<void>,
    onInvalid?: (
      errors: FormErrors<TError>,
      values: Values,
      event: Event | undefined,
    ) => void,
  ): (event: Event) => void;

  /**
   * A `<form onReset>` handler that calls `event.preventDefault()` and then `reset()`.
   *
   * @param event - The native reset event.
   */
  onReset(event: Event): void;

  /**
   * `true` while an async `onSubmit` handler is pending; `false` otherwise.
   */
  submitting: boolean;

  /**
   * Manually set the submitting state.
   *
   * @param value - The new submitting state.
   */
  setSubmitting(value: boolean): void;

  // ── Input props / DOM ───────────────────────────────────────────────────────

  /**
   * Returns the props to spread onto a DOM input element (or framework equivalent).
   *
   * @param path - Dot-notation path of the field.
   * @param options - Optional type / withError / withFocus / value overrides.
   * @returns An object with `onChange`, `data-path`, value/error/focus props.
   *
   * @see https://mantine.dev/form/get-input-props/
   *
   * @example
   * ```tsx
   * <input {...form.getInputProps('email')} />
   * <input {...form.getInputProps('subscribe', { type: 'checkbox' })} />
   * ```
   */
  getInputProps(path: string, options?: GetInputPropsOptions<TError>): GetInputPropsResult<TError>;

  /**
   * Returns the DOM element whose `data-path` attribute equals `path`, or `null` when
   * running on the server (SSR-safe).
   *
   * @param path - Dot-notation path.
   * @returns The matching `HTMLElement`, or `null`.
   *
   * @see https://mantine.dev/form/use-form/
   */
  getInputNode(path: string): HTMLElement | null;

  // ── Transform ───────────────────────────────────────────────────────────────

  /**
   * Applies `transformValues` to `values` (or the current values when omitted).
   *
   * @param values - Optional values to transform; defaults to `getValues()`.
   * @returns The transformed output.
   *
   * @see https://mantine.dev/form/values/
   */
  getTransformedValues(values?: Values): TransformedValues;

  // ── Watch ───────────────────────────────────────────────────────────────────

  /**
   * Subscribes to changes on a field identified by `path`.
   * The handler receives `{ previousValue, value, touched, dirty }`.
   *
   * @param path - Dot-notation path to watch.
   * @param handler - Called each time the field's value changes.
   * @returns An unsubscribe function.
   *
   * @see https://mantine.dev/form/values/
   *
   * @example
   * ```ts
   * const unsub = form.watch('email', ({ value }) => {
   *   console.log('Email is now:', value);
   * });
   * // later:
   * unsub();
   * ```
   */
  watch<K extends DeepKeys<Values>>(
    path: K,
    handler: WatchHandler<DeepValue<Values, K>>,
  ): UnsubscribeWatch;

  // ── Meta ────────────────────────────────────────────────────────────────────

  /**
   * Returns a stable string key for the input at `path`.
   *
   * @remarks
   * In uncontrolled mode, the key is bumped when the value is changed programmatically,
   * causing the bound input to remount and pick up the new `defaultValue`/`defaultChecked`.
   * Typing via `getInputProps().onChange` does **not** bump the key.
   *
   * @param path - Dot-notation path.
   * @returns A stable string key.
   *
   * @see §3.7 of the spec
   *
   * @example
   * ```tsx
   * <input key={form.key('email')} {...form.getInputProps('email')} />
   * ```
   */
  key(path: string): string;

  // ── Subscription (internal — used by wrappers) ─────────────────────────────

  /**
   * Subscribes to store state updates.
   * Used internally by framework wrappers to trigger re-renders / signal writes.
   *
   * @param callback - Called whenever the observable state changes.
   * @returns An unsubscribe function.
   */
  subscribe(callback: () => void): () => void;

  /**
   * Returns a snapshot of the current observable state.
   * Used by React's `useSyncExternalStore`.
   *
   * @returns The current state snapshot.
   */
  getSnapshot(): FormStoreSnapshot<TError>;

  /**
   * Returns a server-side snapshot for `useSyncExternalStore`'s `getServerSnapshot`.
   *
   * @returns A stable server snapshot.
   */
  getServerSnapshot(): FormStoreSnapshot<TError>;
}

/**
 * A snapshot of the observable (non-value) parts of the form state.
 * Returned by `getSnapshot()` / `getServerSnapshot()` for use with `useSyncExternalStore`.
 *
 * @typeParam TError - The error type.
 */
export interface FormStoreSnapshot<TError = unknown> {
  /** Current errors record. */
  errors: FormErrors<TError>;
  /** Current touched record. */
  touched: Partial<Record<string, boolean>>;
  /** Current dirty record. */
  dirty: Partial<Record<string, boolean>>;
  /** Whether any async validation is pending. */
  validating: boolean;
  /** Per-field validating state (keyed by path). */
  fieldValidating: Partial<Record<string, boolean>>;
  /** Whether the form is currently submitting. */
  submitting: boolean;
  /** Whether `initialize` has been called. */
  initialized: boolean;
  /** The current per-field key counters (for uncontrolled remount trick). */
  fieldKeys: Partial<Record<string, number>>;
  /** A counter bumped on each `reset()` call; forms part of every field key. */
  formKey: number;
}

/**
 * Extracts `TransformedValues` from a `FormStoreApi` (or `UseFormReturnType` / `FormApi`).
 *
 * @typeParam Form - A form instance type.
 *
 * @example
 * ```ts
 * const form = useForm({ transformValues: (v) => ({ ...v, fullName: `${v.first} ${v.last}` }) });
 * type Transformed = TransformedValues<typeof form>;
 * ```
 */
export type TransformedValues<Form> = Form extends FormStoreApi<unknown, infer T, unknown>
  ? T
  : never;
