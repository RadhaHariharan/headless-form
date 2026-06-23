import { describe, it, expect } from 'vitest';
import { createFormStore } from './create-form-store.js';
import { createFormActions, registerForm, getRegisteredForms } from './form-store-registry.js';

describe('form-store-registry', () => {
  it('registers and retrieves a form', () => {
    const store = createFormStore({ name: 'test-reg', initialValues: { x: 1 } });
    const forms = getRegisteredForms('test-reg');
    expect(forms.length).toBeGreaterThan(0);
    void store; // stored via createFormStore auto-register
  });

  it('invalid name throws in dev', () => {
    expect(() => registerForm('bad name!', {} as ReturnType<typeof createFormStore>)).toThrow();
  });

  it('unregister removes the store', () => {
    const store = createFormStore<{ v: string }>({ initialValues: { v: '' } });
    const unregister = registerForm('unreg-test', store as ReturnType<typeof createFormStore<unknown, unknown, unknown>>);
    expect(getRegisteredForms('unreg-test').length).toBeGreaterThan(0);
    unregister();
    expect(getRegisteredForms('unreg-test')).toHaveLength(0);
  });

  it('createFormActions dispatches to named forms', () => {
    const store = createFormStore<{ count: number }>({
      name: 'action-test',
      initialValues: { count: 0 },
    });
    const actions = createFormActions<{ count: number }>('action-test');
    actions.setFieldValue('count', 42);
    expect(store.getValues().count).toBe(42);
  });

  it('createFormActions.reset resets the form', () => {
    const store = createFormStore<{ name: string }>({
      name: 'reset-action-test',
      initialValues: { name: 'init' },
    });
    store.setFieldValue('name', 'changed');
    const actions = createFormActions<{ name: string }>('reset-action-test');
    actions.reset();
    expect(store.getValues().name).toBe('init');
  });

  it('fan-out: all same-named forms receive actions', () => {
    const store1 = createFormStore<{ v: string }>({
      name: 'fanout-test',
      initialValues: { v: '' },
    });
    const store2 = createFormStore<{ v: string }>({
      name: 'fanout-test',
      initialValues: { v: '' },
    });
    const actions = createFormActions<{ v: string }>('fanout-test');
    actions.setFieldValue('v', 'broadcast');
    expect(store1.getValues().v).toBe('broadcast');
    expect(store2.getValues().v).toBe('broadcast');
  });
});
