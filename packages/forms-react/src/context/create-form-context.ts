import { createContext, useContext, createElement } from 'react';
import type { ReactNode, Context } from 'react';
import { useForm } from '../hooks/use-form.js';
import type { UseFormReturnType } from '../hooks/use-form.js';
import type { UseFormOptions } from '@headlesskit/forms';

/**
 * The return type of `createFormContext`.
 *
 * @typeParam Values - The form values type.
 * @typeParam TransformedValues - Output of `transformValues`.
 * @typeParam TError - The error type.
 */
export interface CreateFormContextResult<
  Values,
  TransformedValues = Values,
  TError = ReactNode,
> {
  /**
   * A React context provider component that makes the form available to children.
   * Must wrap any component that calls `useFormContext`.
   *
   * @param props - React children and a `form` prop.
   */
  FormProvider: (props: {
    /** The form instance returned by `useForm`. */
    form: UseFormReturnType<Values, TransformedValues, TError>;
    /** Child components. */
    children: ReactNode;
  }) => ReactNode;

  /**
   * Returns the form instance from the nearest `FormProvider`.
   * Throws a descriptive error if called outside a provider.
   *
   * @returns The form instance.
   * @throws {Error} When called outside a `FormProvider`.
   */
  useFormContext: () => UseFormReturnType<Values, TransformedValues, TError>;

  /**
   * A pre-typed `useForm` hook that returns a form instance compatible with this context's types.
   *
   * @param options - Form options.
   * @returns A form instance.
   */
  useForm: (
    options?: UseFormOptions<Values, TransformedValues, TError>,
  ) => UseFormReturnType<Values, TransformedValues, TError>;
}

/**
 * Creates a typed React form context — a `FormProvider`, `useFormContext`, and `useForm` —
 * all pre-typed for `Values`.
 *
 * @remarks
 * Nested providers work independently; each provider's context is isolated to its subtree.
 *
 * @typeParam Values - The form values type.
 * @typeParam TransformedValues - Output of `transformValues`; defaults to `Values`.
 * @typeParam TError - The error type; defaults to `ReactNode`.
 *
 * @returns `{ FormProvider, useFormContext, useForm }`.
 *
 * @example
 * ```tsx
 * const [FormProvider, useFormContext, useMyForm] = createFormContext<{ email: string }>();
 *
 * function EmailField() {
 *   const form = useFormContext();
 *   return <input {...form.getInputProps('email')} />;
 * }
 *
 * function MyForm() {
 *   const form = useMyForm({ initialValues: { email: '' } });
 *   return (
 *     <FormProvider form={form}>
 *       <EmailField />
 *     </FormProvider>
 *   );
 * }
 * ```
 */
export function createFormContext<
  Values,
  TransformedValues = Values,
  TError = ReactNode,
>(): [
  CreateFormContextResult<Values, TransformedValues, TError>['FormProvider'],
  CreateFormContextResult<Values, TransformedValues, TError>['useFormContext'],
  CreateFormContextResult<Values, TransformedValues, TError>['useForm'],
] {
  const FormContext: Context<UseFormReturnType<Values, TransformedValues, TError> | null> =
    createContext<UseFormReturnType<Values, TransformedValues, TError> | null>(null);

  function FormProvider({
    form,
    children,
  }: {
    form: UseFormReturnType<Values, TransformedValues, TError>;
    children: ReactNode;
  }): ReactNode {
    return createElement(FormContext.Provider, { value: form }, children);
  }

  function useFormContext(): UseFormReturnType<Values, TransformedValues, TError> {
    const ctx = useContext(FormContext);
    if (ctx === null) {
      throw new Error(
        '[headlesskit/useFormContext] No FormProvider found in the component tree. ' +
          'Wrap your component with <FormProvider form={form}>.',
      );
    }
    return ctx;
  }

  function useTypedForm(
    options: UseFormOptions<Values, TransformedValues, TError> = {},
  ): UseFormReturnType<Values, TransformedValues, TError> {
    return useForm<Values, TransformedValues, TError>(options);
  }

  return [FormProvider, useFormContext, useTypedForm];
}
