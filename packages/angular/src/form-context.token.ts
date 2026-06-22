import { InjectionToken } from '@angular/core';
import type { FormApi } from './inject-form.js';

/**
 * The Angular `InjectionToken` used by {@link provideForm} and {@link injectFormContext}.
 *
 * @remarks
 * Using a token instead of the class directly allows the same token to work for any
 * `Values` type through TypeScript's generic token pattern.
 */
export const FORM_CONTEXT_TOKEN = new InjectionToken<FormApi<unknown, unknown, unknown>>(
  'headless-form/FormContext',
);
