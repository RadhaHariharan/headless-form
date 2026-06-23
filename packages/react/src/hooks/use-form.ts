import { useRef, useSyncExternalStore, useCallback } from 'react';
import type { ReactNode, FormEvent, FormEventHandler } from 'react';
import { createFormStore } from '@headless-form/core';
import type {
  UseFormOptions,
  FormStoreApi,
  FormStoreSnapshot,
  DeepKeys,
  DeepValue,
  SetFieldValueOptions,
  ReorderPayload,
  FormErrors,
  FormValidateResult,
  FormValidateFieldResult,
  GetInputPropsOptions,
  GetInputPropsResult,
  WatchHandler,
  UnsubscribeWatch,
} from '@headless-form/core';

/**
 * The return type of `useForm` — a `FormStoreApi` specialised for React.
 *
 * @remarks
 * React defaults `TError = ReactNode` so that JSX can be passed as an error message directly.
 *
 * @typeParam Values - The form values type.
 * @typeParam TransformedValues - Output of `transformValues`; defaults to `Values`.
 * @typeParam TError - The error type; defaults to `ReactNode`.
 *
 * @see https://mantine.dev/form/use-form/
 */
export type UseFormReturnType<
  Values,
  TransformedValues = Values,
  TError = ReactNode,
> = Omit<FormStoreApi<Values, TransformedValues, TError>, 'onSubmit'> & {
  /**
   * Creates a submit handler for `<form onSubmit>`. React-typed: the returned handler
   * is a `FormEventHandler<HTMLFormElement>` and the callbacks receive React's
   * synthetic `FormEvent` (the same object React passes at runtime).
   */
  onSubmit(
    onValid: (
      values: TransformedValues,
      event: FormEvent<HTMLFormElement> | undefined,
    ) => void | Promise<void>,
    onInvalid?: (
      errors: FormErrors<TError>,
      values: Values,
      event: FormEvent<HTMLFormElement> | undefined,
    ) => void,
  ): FormEventHandler<HTMLFormElement>;
};

/**
 * React hook that creates and returns a form store, bridged to React's rendering model
 * via `useSyncExternalStore`.
 *
 * @remarks
 * - Defaults to **uncontrolled** mode — typing does not trigger re-renders; only error/status changes do.
 *   Pass `mode: 'controlled'` to make `values` reactive React state instead, where every
 *   `setFieldValue` triggers a re-render.
 * - The store is stable across renders (created once, held in a ref).
 * - Suitable for use in React Server Components with `"use client"` + `getServerSnapshot`.
 *
 * @typeParam Values - Shape of the form values.
 * @typeParam TransformedValues - Output of `transformValues`; defaults to `Values`.
 * @typeParam TError - Error type; defaults to `React.ReactNode`.
 *
 * @param options - Form configuration options (same as `createFormStore`).
 * @returns A stable `UseFormReturnType` object.
 *
 * @see https://mantine.dev/form/use-form/
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   mode: 'uncontrolled',
 *   initialValues: { email: '', password: '' },
 *   validate: { email: isEmail('Invalid email') },
 * });
 *
 * return (
 *   <form onSubmit={form.onSubmit((values) => console.log(values))}>
 *     <input key={form.key('email')} {...form.getInputProps('email')} />
 *   </form>
 * );
 * ```
 */
export function useForm<Values = Record<string, unknown>, TransformedValues = Values, TError = ReactNode>(
  options: UseFormOptions<Values, TransformedValues, TError> = {},
): UseFormReturnType<Values, TransformedValues, TError> {
  // Store is created once and held in a ref to remain stable across renders.
  const storeRef = useRef<FormStoreApi<Values, TransformedValues, TError> | null>(null);
  if (storeRef.current === null) {
    // @headless-form/react defaults to uncontrolled mode (core itself defaults to
    // controlled) — typing performs no re-renders, which is the common case for React.
    storeRef.current = createFormStore<Values, TransformedValues, TError>({
      mode: 'uncontrolled',
      ...options,
    });
  }
  const store = storeRef.current;

  // Bridge the store's subscriber pattern to useSyncExternalStore.
  // This causes React to re-render when the store's observable state changes.
  const snapshot = useSyncExternalStore(
    useCallback((onStoreChange) => store.subscribe(onStoreChange), [store]),
    () => store.getSnapshot() as FormStoreSnapshot<TError>,
    () => store.getServerSnapshot() as FormStoreSnapshot<TError>,
  );

  // Build a proxy-like object that reads reactive state from the snapshot
  // while delegating all methods to the stable store.
  // This ensures the returned object always reflects the latest React-observable state.
  return {
    ...store,
    errors: snapshot.errors,
    validating: snapshot.validating,
    submitting: snapshot.submitting,
    initialized: snapshot.initialized,

    // Provide reactive `values` in controlled mode from the store ref directly.
    // In uncontrolled mode, values in the snapshot are intentionally NOT reactive —
    // callers should use `getValues()` to read the latest value.
    get values() {
      return store.getValues();
    },

    // Stable method references from the underlying store.
    getValues: store.getValues.bind(store),
    getInitialValues: store.getInitialValues.bind(store),
    setInitialValues: store.setInitialValues.bind(store),
    initialize: store.initialize.bind(store),
    setValues: store.setValues.bind(store),
    setFieldValue: store.setFieldValue.bind(store) as <K extends DeepKeys<Values>>(
      path: K,
      value: DeepValue<Values, K> | ((cur: DeepValue<Values, K>) => DeepValue<Values, K>),
      opts?: SetFieldValueOptions,
    ) => void,
    resetField: store.resetField.bind(store),
    reset: store.reset.bind(store),
    setErrors: store.setErrors.bind(store),
    setFieldError: store.setFieldError.bind(store),
    clearErrors: store.clearErrors.bind(store),
    clearFieldError: store.clearFieldError.bind(store),
    isTouched: store.isTouched.bind(store),
    isDirty: store.isDirty.bind(store),
    getTouched: store.getTouched.bind(store),
    getDirty: store.getDirty.bind(store),
    setTouched: store.setTouched.bind(store),
    setDirty: store.setDirty.bind(store),
    resetTouched: store.resetTouched.bind(store),
    resetDirty: store.resetDirty.bind(store),
    insertListItem: store.insertListItem.bind(store),
    removeListItem: store.removeListItem.bind(store),
    replaceListItem: store.replaceListItem.bind(store),
    reorderListItem: store.reorderListItem.bind(store) as (path: string, payload: ReorderPayload) => void,
    validate: store.validate.bind(store) as () => FormValidateResult<TError> | Promise<FormValidateResult<TError>>,
    validateField: store.validateField.bind(store) as (path: string) => FormValidateFieldResult<TError> | Promise<FormValidateFieldResult<TError>>,
    isValid: store.isValid.bind(store),
    isValidating: store.isValidating.bind(store),
    onSubmit: store.onSubmit.bind(store) as unknown as UseFormReturnType<
      Values,
      TransformedValues,
      TError
    >['onSubmit'],
    onReset: store.onReset.bind(store),
    setSubmitting: store.setSubmitting.bind(store),
    getInputProps: store.getInputProps.bind(store) as (path: string, opts?: GetInputPropsOptions<TError>) => GetInputPropsResult<TError>,
    getInputNode: store.getInputNode.bind(store),
    getTransformedValues: store.getTransformedValues.bind(store),
    watch: store.watch.bind(store) as <K extends DeepKeys<Values>>(
      path: K,
      handler: WatchHandler<DeepValue<Values, K>>,
    ) => UnsubscribeWatch,
    // `key` reads from snapshot so React re-renders when keys change (uncontrolled remount trick).
    key: (path: string) => {
      const counter = snapshot.fieldKeys[path] ?? 0;
      return `${snapshot.formKey}-${path}-${counter}`;
    },
    subscribe: store.subscribe.bind(store),
    getSnapshot: store.getSnapshot.bind(store),
    getServerSnapshot: store.getServerSnapshot.bind(store),
  } as UseFormReturnType<Values, TransformedValues, TError>;
}
