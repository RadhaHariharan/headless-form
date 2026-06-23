import type {
  UseFormOptions,
  FormStoreApi,
  FormStoreSnapshot,
  SetFieldValueOptions,
  ReorderPayload,
} from '../types/store.types.js';
import type { FormErrors, FormValidateResult, FormValidateFieldResult } from '../types/validation.types.js';
import type { GetInputPropsOptions, GetInputPropsResult } from '../types/input-props.types.js';
import type { WatchHandler, UnsubscribeWatch } from '../types/watch.types.js';
import type { DeepKeys, DeepValue } from '../types/path.types.js';
import { getPath } from '../utils/get-path.js';
import { setPath } from '../utils/set-path.js';
import { clone } from '../utils/clone.js';
import { deepEqual } from '../utils/deep-equal.js';
import { getInputOnChange } from '../utils/get-input-on-change.js';
import { shouldValidateOnChange } from '../utils/should-validate-on-change.js';
import { getDataPath } from '../utils/get-data-path.js';
import { insertAt, removeAt, replaceAt, reorder } from '../utils/list-handlers.js';
import { createWatchRegistry } from './watch-registry.js';
import { createFieldKeys, bumpFieldKey, buildFieldKey } from './field-keys.js';
import { registerForm } from './form-store-registry.js';

/**
 * Creates a framework-agnostic form store.
 *
 * @remarks
 * The store holds all form state (values, errors, touched, dirty, validating, submitting) and
 * exposes a subscriber pattern so framework wrappers (React, Angular) can bridge it to their
 * reactivity models.
 *
 * Values are always up-to-date in the internal ref. In controlled mode a snapshot is also
 * kept in observable state (triggering re-renders). In uncontrolled mode only error/status
 * state triggers subscribers.
 *
 * @typeParam Values - Shape of the form values.
 * @typeParam TransformedValues - Output of `transformValues`; defaults to `Values`.
 * @typeParam TError - The error type.
 *
 * @param options - Form configuration options.
 * @returns A `FormStoreApi` instance.
 *
 * @example
 * ```ts
 * const store = createFormStore({
 *   initialValues: { email: '', age: 0 },
 *   validate: { email: isEmail('Invalid email') },
 * });
 * ```
 */
export function createFormStore<Values, TransformedValues = Values, TError = unknown>(
  options: UseFormOptions<Values, TransformedValues, TError> = {},
): FormStoreApi<Values, TransformedValues, TError> {
  const {
    name: formName,
    mode = 'controlled',
    initialValues: initialValuesProp,
    initialErrors: initialErrorsProp,
    initialDirty: initialDirtyProp,
    initialTouched: initialTouchedProp,
    clearInputErrorOnChange = true,
    validateInputOnChange = false,
    validateInputOnBlur = false,
    onValuesChange,
    transformValues,
    enhanceGetInputProps,
    validate: validateOption,
    onSubmitPreventDefault = 'always',
    touchTrigger = 'change',
    cascadeUpdates = false,
    validateDebounce = 0,
    resolveValidationError,
  } = options;

  // ── Internal state ──────────────────────────────────────────────────────────

  // Values are always held in this ref; never null in the internal representation.
  let refValues: Values = clone((initialValuesProp ?? {}) as Values);
  let refInitialValues: Partial<Values> = clone((initialValuesProp ?? {}) as Partial<Values>);

  let errors: FormErrors<TError> = clone((initialErrorsProp ?? {}) as FormErrors<TError>);
  let touched: Partial<Record<string, boolean>> = clone(
    (initialTouchedProp ?? {}) as Partial<Record<string, boolean>>,
  );
  let dirty: Partial<Record<string, boolean>> = clone(
    (initialDirtyProp ?? {}) as Partial<Record<string, boolean>>,
  );
  let fieldValidating: Partial<Record<string, boolean>> = {};
  let validating = false;
  let submitting = false;
  let initialized = false;
  let formKey = 0;
  let fieldKeys: Record<string, number> = createFieldKeys();

  // Generation counter to guard against stale async validation results.
  let validationGeneration = 0;

  // Per-field debounce timers.
  const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const watchRegistry = createWatchRegistry();

  // ── Subscriber pattern ──────────────────────────────────────────────────────

  const subscribers = new Set<() => void>();
  let snapshotCache: FormStoreSnapshot<TError> | null = null;

  function buildSnapshot(): FormStoreSnapshot<TError> {
    return {
      errors,
      touched,
      dirty,
      validating,
      fieldValidating,
      submitting,
      initialized,
      fieldKeys,
      formKey,
    };
  }

  function notifySubscribers(): void {
    snapshotCache = null; // invalidate cache
    for (const subscriber of subscribers) {
      subscriber();
    }
  }

  // ── Dirty calculation ───────────────────────────────────────────────────────

  function computeIsDirty(path: string): boolean {
    const current = getPath(refValues, path);
    const initial = getPath(refInitialValues, path);
    return !deepEqual(current, initial);
  }

  // ── Resolve validation error ────────────────────────────────────────────────

  function resolveError(error: unknown): TError {
    if (resolveValidationError) {
      return resolveValidationError(error);
    }
    if (error instanceof Error) {
      return error.message as TError;
    }
    return String(error) as TError;
  }

  // ── Validation helpers ──────────────────────────────────────────────────────

  function getValidateRuleForPath(path: string): ((value: unknown, values: unknown, path: string) => unknown) | null {
    if (!validateOption) return null;

    if (typeof validateOption === 'function') return null;

    // Try direct key match first
    const directRule = (validateOption as Record<string, unknown>)[path];
    if (typeof directRule === 'function') {
      return directRule as (value: unknown, values: unknown, path: string) => unknown;
    }

    // Try traversing nested rule objects by path segments
    const segments = path.split('.');
    let current: unknown = validateOption;
    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== 'object') return null;
      current = (current as Record<string, unknown>)[segment];
    }
    if (typeof current === 'function') {
      return current as (value: unknown, values: unknown, path: string) => unknown;
    }

    return null;
  }

  function runValidateAll(
    values: Values,
    generation: number,
  ): FormErrors<TError> | Promise<FormErrors<TError>> {
    if (!validateOption) return {};

    if (typeof validateOption === 'function') {
      const result = validateOption(values);
      if (result instanceof Promise) {
        return result.then((r) => (generation === validationGeneration ? r : {}));
      }
      return result as FormErrors<TError>;
    }

    // Rules object — collect all paths and run each rule
    const ruleErrors: FormErrors<TError> = {};
    const promises: Promise<void>[] = [];
    let hasAsync = false;

    function walkRules(rules: Record<string, unknown>, prefix: string): void {
      for (const key of Object.keys(rules)) {
        const rule = rules[key];
        const fullPath = prefix ? `${prefix}.${key}` : key;

        if (typeof rule === 'function') {
          const value = getPath(values, fullPath);
          const result = (rule as (v: unknown, vals: unknown, p: string) => unknown)(value, values, fullPath);

          if (result instanceof Promise) {
            hasAsync = true;
            promises.push(
              result.then((r) => {
                if (generation === validationGeneration && r !== null && r !== undefined) {
                  ruleErrors[fullPath] = r as TError;
                }
              }).catch((err: unknown) => {
                if (generation === validationGeneration) {
                  ruleErrors[fullPath] = resolveError(err);
                }
              }),
            );
          } else if (result !== null && result !== undefined) {
            ruleErrors[fullPath] = result as TError;
          }
        } else if (rule !== null && rule !== undefined && typeof rule === 'object') {
          walkRules(rule as Record<string, unknown>, fullPath);
        }
      }
    }

    walkRules(validateOption as Record<string, unknown>, '');

    if (hasAsync || promises.length > 0) {
      return Promise.all(promises).then(() => ruleErrors);
    }
    return ruleErrors;
  }

  function runValidateField(
    path: string,
    values: Values,
    generation: number,
  ): TError | null | undefined | Promise<TError | null | undefined> {
    const rule = getValidateRuleForPath(path);
    if (!rule) return null;

    const value = getPath(values, path);
    try {
      const result = rule(value, values, path);
      if (result instanceof Promise) {
        return result.then((r) => {
          if (generation !== validationGeneration) return null;
          return r as TError | null | undefined;
        }).catch((err: unknown) => {
          if (generation !== validationGeneration) return null;
          return resolveError(err);
        });
      }
      return result as TError | null | undefined;
    } catch (err) {
      return resolveError(err);
    }
  }

  // ── Core value mutation ─────────────────────────────────────────────────────

  function setFieldValueInternal(
    path: string,
    value: unknown,
    opts: SetFieldValueOptions = {},
  ): void {
    const { forceUpdate = true } = opts;
    const previousValues = clone(refValues);
    const previousFieldValue = getPath(refValues, path);

    refValues = setPath(refValues, path, value) as Values;

    // Dirty detection
    const isDirtyNow = computeIsDirty(path);
    const wasDirty = dirty[path] === true;
    if (isDirtyNow !== wasDirty) {
      dirty = { ...dirty, [path]: isDirtyNow };
    }

    // Touched on change
    if (touchTrigger === 'change' && !touched[path]) {
      touched = { ...touched, [path]: true };
    }

    // Clear error on change; track whether we actually cleared one for notification logic.
    const hadErrorBefore = errors[path] !== undefined;
    if (clearInputErrorOnChange && hadErrorBefore) {
      const { [path]: _removed, ...rest } = errors;
      errors = rest;
    }

    // Bump field key in uncontrolled mode when programmatically setting
    if (forceUpdate) {
      fieldKeys = bumpFieldKey(fieldKeys, path);
    }

    onValuesChange?.(clone(refValues), previousValues);

    // Watch notification
    watchRegistry.notify(
      path,
      {
        previousValue: previousFieldValue,
        value,
        touched: touched[path] === true,
        dirty: dirty[path] === true,
      },
      cascadeUpdates,
    );

    // In uncontrolled mode, typing (forceUpdate:false) skips subscriber notification
    // unless an error was cleared — that keeps re-renders at zero while typing.
    // In controlled mode, every value change must notify so the UI stays in sync.
    const errorWasCleared = hadErrorBefore && errors[path] === undefined;
    const shouldNotify = mode === 'controlled' || forceUpdate || errorWasCleared;
    if (shouldNotify) {
      notifySubscribers();
    }

    // Validate on change
    if (shouldValidateOnChange(validateInputOnChange, path)) {
      if (validateDebounce > 0) {
        clearTimeout(debounceTimers[path]);
        debounceTimers[path] = setTimeout(() => {
          void validateFieldAsync(path);
        }, validateDebounce);
      } else {
        const result = validateFieldSync(path);
        if (result instanceof Promise) {
          void result;
        }
      }
    }
  }

  // ── Sync field validation (sets errors, notifies) ───────────────────────────

  function validateFieldSync(path: string): FormValidateFieldResult<TError> | Promise<FormValidateFieldResult<TError>> {
    validationGeneration += 1;
    const gen = validationGeneration;
    const result = runValidateField(path, refValues, gen);

    if (result instanceof Promise) {
      fieldValidating = { ...fieldValidating, [path]: true };
      validating = Object.values(fieldValidating).some(Boolean);
      notifySubscribers();

      return result.then((error) => {
        if (gen !== validationGeneration) {
          return { hasError: errors[path] !== undefined, error: errors[path] ?? null };
        }
        const hasError = error !== null && error !== undefined;
        if (hasError) {
          errors = { ...errors, [path]: error as TError };
        } else {
          const { [path]: _removed, ...rest } = errors;
          errors = rest;
        }
        fieldValidating = { ...fieldValidating, [path]: false };
        validating = Object.values(fieldValidating).some(Boolean);
        notifySubscribers();
        return { hasError, error: hasError ? (error as TError) : null };
      });
    }

    const hasError = result !== null && result !== undefined;
    if (hasError) {
      errors = { ...errors, [path]: result as TError };
    } else {
      const { [path]: _removed, ...rest } = errors;
      errors = rest;
    }
    notifySubscribers();
    return { hasError, error: hasError ? (result as TError) : null };
  }

  async function validateFieldAsync(path: string): Promise<FormValidateFieldResult<TError>> {
    return validateFieldSync(path) as Promise<FormValidateFieldResult<TError>>;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  const store: FormStoreApi<Values, TransformedValues, TError> = {
    // ── Values ────────────────────────────────────────────────────────────────

    get values() {
      return refValues;
    },

    getValues() {
      return refValues;
    },

    getInitialValues() {
      return refInitialValues;
    },

    setInitialValues(values) {
      refInitialValues = clone(values);
      // Recompute dirty for all currently tracked dirty paths
      const newDirty: Partial<Record<string, boolean>> = {};
      for (const path of Object.keys(dirty)) {
        newDirty[path] = computeIsDirty(path);
      }
      dirty = newDirty;
      notifySubscribers();
    },

    initialize(values) {
      if (initialized) return;
      initialized = true;
      refValues = clone(values);
      refInitialValues = clone(values);
      notifySubscribers();
    },

    get initialized() {
      return initialized;
    },

    setValues(updater) {
      const previousValues = clone(refValues);
      const patch =
        typeof updater === 'function'
          ? (updater as (c: Values) => Partial<Values>)(refValues)
          : updater;
      refValues = { ...refValues, ...patch };

      // Recompute dirty for all changed keys
      for (const key of Object.keys(patch)) {
        dirty = { ...dirty, [key]: computeIsDirty(key) };
      }

      onValuesChange?.(clone(refValues), previousValues);
      notifySubscribers();
    },

    setFieldValue(path, value, opts) {
      const resolved =
        typeof value === 'function'
          ? (value as (c: unknown) => unknown)(getPath(refValues, path as string))
          : value;
      setFieldValueInternal(path as string, resolved, opts);
    },

    resetField(path) {
      const initialValue = getPath(refInitialValues, path as string);
      refValues = setPath(refValues, path as string, initialValue) as Values;

      const { [path as string]: _e, ...restErrors } = errors;
      errors = restErrors;
      const { [path as string]: _t, ...restTouched } = touched;
      touched = restTouched;
      const { [path as string]: _d, ...restDirty } = dirty;
      dirty = restDirty;

      fieldKeys = bumpFieldKey(fieldKeys, path as string);
      notifySubscribers();
    },

    reset() {
      refValues = clone((initialValuesProp ?? {}) as Values);
      errors = {};
      touched = {};
      dirty = {};
      fieldValidating = {};
      validating = false;
      submitting = false;
      formKey += 1;
      fieldKeys = createFieldKeys();
      validationGeneration += 1;
      notifySubscribers();
    },

    // ── Errors ────────────────────────────────────────────────────────────────

    get errors() {
      return errors;
    },

    setErrors(newErrors) {
      errors = { ...newErrors };
      notifySubscribers();
    },

    setFieldError(path, error) {
      // Bump generation so any in-flight async validation for this field is discarded.
      validationGeneration += 1;
      errors = { ...errors, [path]: error };
      notifySubscribers();
    },

    clearErrors() {
      errors = {};
      notifySubscribers();
    },

    clearFieldError(path) {
      const { [path]: _removed, ...rest } = errors;
      errors = rest;
      notifySubscribers();
    },

    // ── Status ────────────────────────────────────────────────────────────────

    isTouched(path) {
      if (path === undefined) {
        return Object.values(touched).some(Boolean);
      }
      return touched[path] === true;
    },

    isDirty(path) {
      if (path === undefined) {
        return Object.values(dirty).some(Boolean) || !deepEqual(refValues, refInitialValues);
      }
      // Explicit dirty record takes precedence over computed value comparison.
      if (path in dirty) {
        return dirty[path] === true;
      }
      return computeIsDirty(path);
    },

    getTouched() {
      return { ...touched };
    },

    getDirty() {
      return { ...dirty };
    },

    setTouched(newTouched) {
      touched = { ...newTouched };
      notifySubscribers();
    },

    setDirty(newDirty) {
      dirty = { ...newDirty };
      notifySubscribers();
    },

    resetTouched() {
      touched = {};
      notifySubscribers();
    },

    resetDirty(values) {
      dirty = {};
      if (values !== undefined) {
        refInitialValues = clone(values);
      }
      notifySubscribers();
    },

    // ── Lists ─────────────────────────────────────────────────────────────────

    insertListItem(path, item, index) {
      const list = (getPath(refValues, path) ?? []) as unknown[];
      const next = insertAt(list, item, index);
      refValues = setPath(refValues, path, next) as Values;
      fieldKeys = bumpFieldKey(fieldKeys, path);
      notifySubscribers();
    },

    removeListItem(path, index) {
      const list = (getPath(refValues, path) ?? []) as unknown[];
      refValues = setPath(refValues, path, removeAt(list, index)) as Values;
      fieldKeys = bumpFieldKey(fieldKeys, path);
      notifySubscribers();
    },

    replaceListItem(path, index, item) {
      const list = (getPath(refValues, path) ?? []) as unknown[];
      refValues = setPath(refValues, path, replaceAt(list, index, item)) as Values;
      fieldKeys = bumpFieldKey(fieldKeys, path);
      notifySubscribers();
    },

    reorderListItem(path, payload) {
      const list = (getPath(refValues, path) ?? []) as unknown[];
      refValues = setPath(refValues, path, reorder(list, payload)) as Values;
      fieldKeys = bumpFieldKey(fieldKeys, path);
      notifySubscribers();
    },

    // ── Validation ────────────────────────────────────────────────────────────

    validate() {
      validationGeneration += 1;
      const gen = validationGeneration;

      const result = runValidateAll(refValues, gen);

      function applyErrors(newErrors: FormErrors<TError>): FormValidateResult<TError> {
        errors = { ...newErrors };
        notifySubscribers();
        return { hasErrors: Object.keys(newErrors).length > 0, errors: newErrors };
      }

      if (result instanceof Promise) {
        validating = true;
        notifySubscribers();
        return result.then((newErrors) => {
          validating = false;
          if (gen !== validationGeneration) {
            notifySubscribers();
            return { hasErrors: Object.keys(errors).length > 0, errors };
          }
          return applyErrors(newErrors);
        });
      }

      return applyErrors(result);
    },

    validateField(path) {
      return validateFieldSync(path);
    },

    isValid(path) {
      if (path !== undefined) {
        const rule = getValidateRuleForPath(path);
        if (!rule) return true;
        const value = getPath(refValues, path);
        const result = rule(value, refValues, path);
        if (result instanceof Promise) {
          return result.then((r) => r === null || r === undefined);
        }
        return result === null || result === undefined;
      }

      if (!validateOption) return true;

      if (typeof validateOption === 'function') {
        const result = validateOption(refValues);
        if (result instanceof Promise) {
          return result.then((r) => Object.keys(r).length === 0);
        }
        return Object.keys(result).length === 0;
      }

      // Rules object — check all rules without mutating errors
      const allResults: Array<unknown | Promise<unknown>> = [];

      function walkForValid(rules: Record<string, unknown>, prefix: string): void {
        for (const key of Object.keys(rules)) {
          const rule = rules[key];
          const fullPath = prefix ? `${prefix}.${key}` : key;
          if (typeof rule === 'function') {
            const value = getPath(refValues, fullPath);
            allResults.push((rule as (v: unknown, vals: unknown, p: string) => unknown)(value, refValues, fullPath));
          } else if (rule !== null && rule !== undefined && typeof rule === 'object') {
            walkForValid(rule as Record<string, unknown>, fullPath);
          }
        }
      }

      walkForValid(validateOption as Record<string, unknown>, '');

      const hasPromise = allResults.some((r) => r instanceof Promise);
      if (hasPromise) {
        return Promise.all(allResults).then((results) =>
          results.every((r) => r === null || r === undefined),
        );
      }
      return allResults.every((r) => r === null || r === undefined);
    },

    get validating() {
      return validating;
    },

    isValidating(path) {
      return fieldValidating[path] === true;
    },

    // ── Submit ────────────────────────────────────────────────────────────────

    onSubmit(onValid, onInvalid) {
      return (event: Event) => {
        if (
          onSubmitPreventDefault === 'always' ||
          (onSubmitPreventDefault === 'validation-failed' && Object.keys(errors).length > 0)
        ) {
          event.preventDefault();
        }

        const validateResult = store.validate();

        function handleResult(result: FormValidateResult<TError>): void {
          if (result.hasErrors) {
            if (onSubmitPreventDefault === 'validation-failed') {
              event.preventDefault();
            }
            onInvalid?.(result.errors, refValues, event);
            return;
          }

          const transformed = store.getTransformedValues();
          const ret = onValid(transformed, event);
          if (ret instanceof Promise) {
            submitting = true;
            notifySubscribers();
            void ret.finally(() => {
              submitting = false;
              notifySubscribers();
            });
          }
        }

        if (validateResult instanceof Promise) {
          submitting = true;
          notifySubscribers();
          void validateResult.then((result) => {
            submitting = false;
            handleResult(result);
          });
        } else {
          handleResult(validateResult);
        }
      };
    },

    onReset(event) {
      event.preventDefault();
      store.reset();
    },

    get submitting() {
      return submitting;
    },

    setSubmitting(value) {
      submitting = value;
      notifySubscribers();
    },

    // ── Input props ───────────────────────────────────────────────────────────

    getInputProps(path, opts = {}) {
      const {
        type = 'input',
        withError = true,
        withFocus = type !== 'radio',
        value: radioValue,
        ...rest
      } = opts;

      const storedValue = getPath(refValues, path);
      const isUncontrolled = mode === 'uncontrolled';
      const dataPath = getDataPath(path, formName);

      // Built as an open record so `...rest` and `enhanceGetInputProps` extras can be
      // attached; the public return type ({@link GetInputPropsResult}) is intentionally
      // closed (no index signature) so JSX spreads keep narrow prop types like `value`.
      const result: GetInputPropsResult<TError> & Record<string, unknown> = {
        'data-path': dataPath,
        ...rest,
        onChange: (eventOrValue: unknown) => {
          const normalized = getInputOnChange(eventOrValue);
          setFieldValueInternal(path, normalized, { forceUpdate: false });
        },
      };

      if (type === 'checkbox') {
        const checked = Boolean(storedValue);
        if (isUncontrolled) {
          result['defaultChecked'] = checked;
        } else {
          result['checked'] = checked;
        }
      } else if (type === 'radio') {
        const checked = storedValue === radioValue;
        result['radioValue'] = radioValue;
        if (isUncontrolled) {
          result['defaultChecked'] = checked;
        } else {
          result['checked'] = checked;
        }
        result['value'] = radioValue as string | number;
      } else {
        // text / number / etc.
        if (isUncontrolled) {
          result['defaultValue'] = (storedValue ?? '') as string | number;
        } else {
          result['value'] = (storedValue ?? '') as string | number;
        }
      }

      if (withError) {
        const fieldError = errors[path];
        if (fieldError !== undefined) {
          result['error'] = fieldError;
        }
      }

      if (withFocus) {
        result['onFocus'] = () => {
          if (touchTrigger === 'focus' && !touched[path]) {
            touched = { ...touched, [path]: true };
            notifySubscribers();
          }
        };

        result['onBlur'] = () => {
          if (shouldValidateOnChange(validateInputOnBlur, path)) {
            if (validateDebounce > 0) {
              clearTimeout(debounceTimers[path]);
              debounceTimers[path] = setTimeout(() => {
                void validateFieldAsync(path);
              }, validateDebounce);
            } else {
              const r = validateFieldSync(path);
              if (r instanceof Promise) void r;
            }
          }
        };
      }

      if (enhanceGetInputProps) {
        const extra = enhanceGetInputProps({
          inputProps: result,
          field: path,
          options: opts as GetInputPropsOptions<TError>,
          form: store as unknown as FormStoreApi<Values, Values, unknown>,
        });
        if (extra) {
          Object.assign(result, extra);
        }
      }

      return result;
    },

    getInputNode(path) {
      if (typeof document === 'undefined') return null;
      const dataPath = getDataPath(path, formName);
      return document.querySelector<HTMLElement>(`[data-path="${dataPath}"]`);
    },

    // ── Transform ─────────────────────────────────────────────────────────────

    getTransformedValues(values) {
      const v = values ?? refValues;
      if (transformValues) {
        return transformValues(v);
      }
      return v as unknown as TransformedValues;
    },

    // ── Watch ─────────────────────────────────────────────────────────────────

    watch(path, handler) {
      return watchRegistry.subscribe(
        path as string,
        handler as WatchHandler<unknown>,
      ) as UnsubscribeWatch;
    },

    // ── Meta ──────────────────────────────────────────────────────────────────

    key(path) {
      return buildFieldKey(formKey, path, fieldKeys);
    },

    // ── Subscription ──────────────────────────────────────────────────────────

    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    getSnapshot() {
      if (!snapshotCache) {
        snapshotCache = buildSnapshot();
      }
      return snapshotCache;
    },

    getServerSnapshot() {
      // Must return the same cached reference as getSnapshot() — useSyncExternalStore
      // treats a new object identity as a change and will loop if this isn't stable.
      if (!snapshotCache) {
        snapshotCache = buildSnapshot();
      }
      return snapshotCache;
    },
  };

  // Register in global registry if named
  if (formName) {
    registerForm(formName, store as FormStoreApi<unknown, unknown, unknown>);
  }

  return store;
}
