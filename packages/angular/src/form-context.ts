import { inject } from '@angular/core';
import type { EnvironmentProviders, Provider } from '@angular/core';
import type { FormApi } from './inject-form.js';
import { FORM_CONTEXT_TOKEN } from './form-context.token.js';

/**
 * Provides a `FormApi` instance via Angular's dependency injection system, making it
 * available to descendants via {@link injectFormContext}.
 *
 * @remarks
 * This is the Angular equivalent of React's `<FormProvider form={form}>`.
 * Use in a component's `providers` array.
 *
 * @typeParam Values - The form values type.
 * @typeParam TransformedValues - Output of `transformValues`.
 * @typeParam TError - The error type.
 *
 * @param form - The `FormApi` instance to provide.
 * @returns An Angular provider array to pass to `providers: [...]`.
 *
 * @see https://mantine.dev/form/create-form-context/
 *
 * @example
 * ```ts
 * @Component({
 *   providers: [provideForm(form)],
 * })
 * export class MyFormComponent {
 *   form = injectForm({ initialValues: { email: '' } });
 * }
 * ```
 */
export function provideForm<Values, TransformedValues = Values, TError = unknown>(
  form: FormApi<Values, TransformedValues, TError>,
): Array<Provider | EnvironmentProviders> {
  return [
    {
      provide: FORM_CONTEXT_TOKEN,
      useValue: form,
    },
  ];
}

/**
 * Returns the `FormApi` provided by the nearest ancestor that called {@link provideForm}.
 * Throws a descriptive error when no provider is found.
 *
 * @remarks
 * This is the Angular equivalent of React's `useFormContext()`.
 * Must be called in an Angular injection context.
 *
 * @typeParam Values - The form values type.
 * @typeParam TransformedValues - Output of `transformValues`.
 * @typeParam TError - The error type.
 *
 * @returns The provided `FormApi` instance.
 * @throws {Error} When called without a parent `provideForm`.
 *
 * @see https://mantine.dev/form/create-form-context/
 *
 * @example
 * ```ts
 * export class EmailFieldComponent {
 *   form = injectFormContext<{ email: string }>();
 * }
 * ```
 */
export function injectFormContext<Values, TransformedValues = Values, TError = unknown>(): FormApi<
  Values,
  TransformedValues,
  TError
> {
  const ctx = inject(FORM_CONTEXT_TOKEN, { optional: true });
  if (ctx === null) {
    throw new Error(
      '[headless-form/injectFormContext] No provideForm() found in the injection context. ' +
        "Add provideForm(form) to the component's providers array.",
    );
  }
  return ctx as FormApi<Values, TransformedValues, TError>;
}
