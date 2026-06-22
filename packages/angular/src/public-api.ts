/**
 * @headless-form/angular — Angular bindings for the headless-form core engine.
 *
 * @remarks
 * Re-exports all public Angular-specific APIs. Import from `@headless-form/angular`.
 *
 * @packageDocumentation
 */

export {
  injectForm,
  type FormApi,
} from './inject-form.js';

export {
  injectField,
  type InjectFieldOptions,
  type InjectFieldReturnType,
} from './inject-field.js';

export {
  HfFieldDirective,
} from './form-field.directive.js';

export {
  provideForm,
  injectFormContext,
} from './form-context.js';

export {
  FORM_CONTEXT_TOKEN,
} from './form-context.token.js';
