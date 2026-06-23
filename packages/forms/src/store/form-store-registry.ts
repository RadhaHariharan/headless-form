import type { FormStoreApi } from '../types/store.types.js';

/**
 * Global registry mapping form names to their registered store instances.
 *
 * @remarks
 * Multiple forms can register under the same name; all receive action dispatches.
 * Module-level state — the only intentional module-level side effect in core.
 */
const registry = new Map<string, Set<FormStoreApi<unknown, unknown, unknown>>>();

/**
 * Validates a form name against the allowed character set.
 * Throws in development when the name contains disallowed characters.
 *
 * @param name - The form name to validate.
 * @throws {Error} When the name contains characters outside `[a-zA-Z0-9-]` in development.
 */
function validateFormName(name: string): void {
  if (process.env['NODE_ENV'] !== 'production' && !/^[a-zA-Z0-9-]+$/.test(name)) {
    throw new Error(
      `[headlesskit/createFormStore] Invalid form name "${name}". ` +
        'Only characters [a-zA-Z0-9-] are allowed.',
    );
  }
}

/**
 * Registers a form store under `name`.
 * Returns an unregister function that removes only this store instance.
 *
 * @param name - The form name (must match `[a-zA-Z0-9-]`).
 * @param store - The store to register.
 * @returns A cleanup function that unregisters this store.
 */
export function registerForm(
  name: string,
  store: FormStoreApi<unknown, unknown, unknown>,
): () => void {
  validateFormName(name);

  let set = registry.get(name);
  if (!set) {
    set = new Set();
    registry.set(name, set);
  }
  set.add(store);

  return () => {
    set?.delete(store);
    if (set?.size === 0) {
      registry.delete(name);
    }
  };
}

/**
 * Returns all store instances registered under `name`, or an empty array when none found.
 *
 * @param name - The form name to look up.
 * @returns Array of registered stores (may be empty).
 */
export function getRegisteredForms(name: string): FormStoreApi<unknown, unknown, unknown>[] {
  return [...(registry.get(name) ?? [])];
}

/**
 * Creates an actions proxy for the form named `name`.
 * All mutating methods are forwarded to every store registered under that name.
 *
 * @typeParam Values - The form values type (used only for type inference; not enforced at runtime).
 *
 * @param name - The name under which the target forms are registered.
 * @returns An object with all mutating methods of `FormStoreApi`.
 *
 * @example
 * ```ts
 * const actions = createFormActions<MyValues>('my-form');
 * // From anywhere in the app:
 * actions.setFieldValue('email', 'jane@example.com');
 * actions.reset();
 * ```
 */
export function createFormActions<Values>(
  name: string,
): Pick<
  FormStoreApi<Values, Values, unknown>,
  | 'setFieldValue'
  | 'setValues'
  | 'setErrors'
  | 'setFieldError'
  | 'clearErrors'
  | 'clearFieldError'
  | 'reset'
  | 'validate'
  | 'validateField'
  | 'insertListItem'
  | 'removeListItem'
  | 'reorderListItem'
  | 'replaceListItem'
  | 'setDirty'
  | 'setTouched'
  | 'resetDirty'
  | 'resetTouched'
  | 'setSubmitting'
> {
  validateFormName(name);

  function dispatch<K extends keyof FormStoreApi<unknown, unknown, unknown>>(
    method: K,
    ...args: unknown[]
  ): unknown {
    const stores = getRegisteredForms(name);
    let lastResult: unknown;
    for (const store of stores) {
      lastResult = (store[method] as (...a: unknown[]) => unknown)(...args);
    }
    return lastResult;
  }

  return {
    setFieldValue: (...args) => dispatch('setFieldValue', ...args),
    setValues: (...args) => dispatch('setValues', ...args),
    setErrors: (...args) => dispatch('setErrors', ...args),
    setFieldError: (...args) => dispatch('setFieldError', ...args),
    clearErrors: () => dispatch('clearErrors'),
    clearFieldError: (...args) => dispatch('clearFieldError', ...args),
    reset: () => dispatch('reset'),
    validate: () => dispatch('validate') as ReturnType<FormStoreApi<Values, Values, unknown>['validate']>,
    validateField: (...args) => dispatch('validateField', ...args) as ReturnType<FormStoreApi<Values, Values, unknown>['validateField']>,
    insertListItem: (...args) => dispatch('insertListItem', ...args),
    removeListItem: (...args) => dispatch('removeListItem', ...args),
    reorderListItem: (...args) => dispatch('reorderListItem', ...args),
    replaceListItem: (...args) => dispatch('replaceListItem', ...args),
    setDirty: (...args) => dispatch('setDirty', ...args),
    setTouched: (...args) => dispatch('setTouched', ...args),
    resetDirty: (...args) => dispatch('resetDirty', ...args),
    resetTouched: () => dispatch('resetTouched'),
    setSubmitting: (...args) => dispatch('setSubmitting', ...args),
  };
}
