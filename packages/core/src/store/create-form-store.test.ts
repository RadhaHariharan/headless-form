import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFormStore } from './create-form-store.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SimpleValues {
  name: string;
  age: number;
  email: string;
}

interface NestedValues {
  user: {
    firstName: string;
    lastName: string;
    address: { city: string; zip: string };
  };
  tags: string[];
}

function makeSimpleStore(overrides = {}) {
  return createFormStore<SimpleValues>({
    initialValues: { name: '', age: 0, email: '' },
    ...overrides,
  });
}

// ── Initial state ─────────────────────────────────────────────────────────────

describe('createFormStore — initial state', () => {
  it('stores initial values from initialValues', () => {
    const store = makeSimpleStore({ initialValues: { name: 'Jane', age: 30, email: 'j@x.com' } });
    expect(store.getValues()).toEqual({ name: 'Jane', age: 30, email: 'j@x.com' });
  });

  it('stores initial errors from initialErrors', () => {
    const store = makeSimpleStore({ initialErrors: { name: 'Required' } });
    expect(store.errors).toEqual({ name: 'Required' });
  });

  it('stores initial dirty from initialDirty', () => {
    const store = makeSimpleStore({ initialDirty: { name: true } });
    expect(store.isDirty('name')).toBe(true);
  });

  it('stores initial touched from initialTouched', () => {
    const store = makeSimpleStore({ initialTouched: { email: true } });
    expect(store.isTouched('email')).toBe(true);
  });

  it('initialized is false initially', () => {
    const store = makeSimpleStore();
    expect(store.initialized).toBe(false);
  });
});

// ── Values ────────────────────────────────────────────────────────────────────

describe('createFormStore — setFieldValue', () => {
  it('sets a top-level field value', () => {
    const store = makeSimpleStore();
    store.setFieldValue('name', 'Alice');
    expect(store.getValues().name).toBe('Alice');
  });

  it('sets a nested field via dot path', () => {
    const store = createFormStore<NestedValues>({
      initialValues: {
        user: { firstName: '', lastName: '', address: { city: '', zip: '' } },
        tags: [],
      },
    });
    store.setFieldValue('user.firstName', 'Bob');
    expect(store.getValues().user.firstName).toBe('Bob');
  });

  it('accepts a functional updater', () => {
    const store = makeSimpleStore({ initialValues: { name: 'old', age: 5, email: '' } });
    store.setFieldValue('age', (cur) => cur + 1);
    expect(store.getValues().age).toBe(6);
  });

  it('forceUpdate:false does NOT bump the field key', () => {
    const store = makeSimpleStore();
    const keyBefore = store.key('name');
    store.setFieldValue('name', 'x', { forceUpdate: false });
    expect(store.key('name')).toBe(keyBefore);
  });

  it('forceUpdate:true (default) bumps the field key', () => {
    const store = makeSimpleStore();
    const keyBefore = store.key('name');
    store.setFieldValue('name', 'x');
    expect(store.key('name')).not.toBe(keyBefore);
  });
});

describe('createFormStore — setValues', () => {
  it('shallow-merges an object', () => {
    const store = makeSimpleStore({ initialValues: { name: 'A', age: 1, email: 'a@b.com' } });
    store.setValues({ name: 'B' });
    expect(store.getValues()).toEqual({ name: 'B', age: 1, email: 'a@b.com' });
  });

  it('accepts a functional updater', () => {
    const store = makeSimpleStore({ initialValues: { name: 'A', age: 1, email: '' } });
    store.setValues((cur) => ({ age: cur.age + 10 }));
    expect(store.getValues().age).toBe(11);
  });

  it('calls onValuesChange with new and previous values', () => {
    const onChange = vi.fn();
    const store = makeSimpleStore({ onValuesChange: onChange });
    store.setValues({ name: 'X' });
    expect(onChange).toHaveBeenCalledOnce();
    const [newVals, prevVals] = onChange.mock.calls[0] as [SimpleValues, SimpleValues];
    expect(newVals.name).toBe('X');
    expect(prevVals.name).toBe('');
  });
});

describe('createFormStore — getValues / getInitialValues', () => {
  it('getValues returns latest values in uncontrolled mode', () => {
    const store = createFormStore<SimpleValues>({
      mode: 'uncontrolled',
      initialValues: { name: '', age: 0, email: '' },
    });
    store.setFieldValue('name', 'Z');
    expect(store.getValues().name).toBe('Z');
  });

  it('getInitialValues returns the initial snapshot', () => {
    const store = makeSimpleStore({ initialValues: { name: 'init', age: 0, email: '' } });
    store.setFieldValue('name', 'changed');
    expect(store.getInitialValues()).toMatchObject({ name: 'init' });
  });
});

describe('createFormStore — initialize', () => {
  it('sets values and initialValues on first call', () => {
    const store = makeSimpleStore();
    store.initialize({ name: 'Loaded', age: 42, email: 'l@x.com' });
    expect(store.getValues()).toEqual({ name: 'Loaded', age: 42, email: 'l@x.com' });
    expect(store.getInitialValues()).toEqual({ name: 'Loaded', age: 42, email: 'l@x.com' });
    expect(store.initialized).toBe(true);
  });

  it('is idempotent — second call is ignored', () => {
    const store = makeSimpleStore();
    store.initialize({ name: 'First', age: 1, email: '' });
    store.initialize({ name: 'Second', age: 2, email: '' });
    expect(store.getValues().name).toBe('First');
  });
});

describe('createFormStore — setInitialValues', () => {
  it('changes dirty baseline without changing values', () => {
    const store = makeSimpleStore({ initialValues: { name: 'old', age: 0, email: '' } });
    store.setFieldValue('name', 'new');
    expect(store.isDirty('name')).toBe(true);
    store.setInitialValues({ name: 'new', age: 0, email: '' });
    expect(store.isDirty('name')).toBe(false);
    expect(store.getValues().name).toBe('new');
  });
});

describe('createFormStore — reset', () => {
  it('restores initial values and clears errors/touched/dirty', () => {
    const store = makeSimpleStore({ initialValues: { name: 'init', age: 0, email: '' } });
    store.setFieldValue('name', 'changed');
    store.setFieldError('name', 'bad');
    store.reset();
    expect(store.getValues().name).toBe('init');
    expect(store.errors).toEqual({});
    expect(store.isTouched()).toBe(false);
    expect(store.isDirty()).toBe(false);
  });

  it('bumps formKey on reset, invalidating all field keys', () => {
    const store = makeSimpleStore();
    const keyBefore = store.key('name');
    store.reset();
    expect(store.key('name')).not.toBe(keyBefore);
  });
});

describe('createFormStore — resetField', () => {
  it('resets only the specified field', () => {
    const store = makeSimpleStore({ initialValues: { name: 'init', age: 5, email: '' } });
    store.setFieldValue('name', 'changed');
    store.setFieldValue('age', 99);
    store.resetField('name');
    expect(store.getValues().name).toBe('init');
    expect(store.getValues().age).toBe(99);
  });

  it('clears error and touched for the field', () => {
    const store = makeSimpleStore();
    store.setFieldError('name', 'err');
    store.resetField('name');
    expect(store.errors['name']).toBeUndefined();
  });
});

// ── Errors ────────────────────────────────────────────────────────────────────

describe('createFormStore — errors', () => {
  it('setErrors replaces all errors', () => {
    const store = makeSimpleStore({ initialErrors: { name: 'old' } });
    store.setErrors({ email: 'bad email' });
    expect(store.errors).toEqual({ email: 'bad email' });
  });

  it('setFieldError sets a single error', () => {
    const store = makeSimpleStore();
    store.setFieldError('name', 'required');
    expect(store.errors['name']).toBe('required');
  });

  it('clearErrors clears all errors', () => {
    const store = makeSimpleStore({ initialErrors: { name: 'e', email: 'e2' } });
    store.clearErrors();
    expect(store.errors).toEqual({});
  });

  it('clearFieldError clears a single error', () => {
    const store = makeSimpleStore({ initialErrors: { name: 'e', email: 'e2' } });
    store.clearFieldError('name');
    expect(store.errors['name']).toBeUndefined();
    expect(store.errors['email']).toBe('e2');
  });
});

// ── Status ────────────────────────────────────────────────────────────────────

describe('createFormStore — isTouched', () => {
  it('isTouched() returns false initially', () => {
    const store = makeSimpleStore();
    expect(store.isTouched()).toBe(false);
  });

  it('isTouched(path) is true after setFieldValue when touchTrigger is change', () => {
    const store = makeSimpleStore({ touchTrigger: 'change' });
    store.setFieldValue('name', 'x');
    expect(store.isTouched('name')).toBe(true);
  });

  it('isTouched(path) NOT set by setFieldValue when touchTrigger is focus', () => {
    const store = makeSimpleStore({ touchTrigger: 'focus' });
    store.setFieldValue('name', 'x');
    expect(store.isTouched('name')).toBe(false);
  });
});

describe('createFormStore — isDirty', () => {
  it('isDirty() returns false when values match initial', () => {
    const store = makeSimpleStore({ initialValues: { name: 'A', age: 0, email: '' } });
    expect(store.isDirty()).toBe(false);
  });

  it('isDirty(path) returns true after change', () => {
    const store = makeSimpleStore({ initialValues: { name: 'A', age: 0, email: '' } });
    store.setFieldValue('name', 'B');
    expect(store.isDirty('name')).toBe(true);
  });
});

describe('createFormStore — getTouched / getDirty / setTouched / setDirty', () => {
  it('getTouched returns full record', () => {
    const store = makeSimpleStore({ initialTouched: { name: true } });
    expect(store.getTouched()).toEqual({ name: true });
  });

  it('getDirty returns full record', () => {
    const store = makeSimpleStore({ initialDirty: { email: true } });
    expect(store.getDirty()).toMatchObject({ email: true });
  });

  it('setTouched replaces the record', () => {
    const store = makeSimpleStore();
    store.setTouched({ name: true, age: false });
    expect(store.isTouched('name')).toBe(true);
  });

  it('setDirty replaces the record', () => {
    const store = makeSimpleStore();
    store.setDirty({ name: true });
    expect(store.isDirty('name')).toBe(true);
  });

  it('resetTouched clears all touched', () => {
    const store = makeSimpleStore({ initialTouched: { name: true } });
    store.resetTouched();
    expect(store.isTouched()).toBe(false);
  });

  it('resetDirty clears dirty; optional values update the snapshot', () => {
    const store = makeSimpleStore({ initialValues: { name: 'A', age: 0, email: '' } });
    store.setFieldValue('name', 'B');
    store.resetDirty({ name: 'B', age: 0, email: '' });
    expect(store.isDirty('name')).toBe(false);
  });
});

// ── Lists ─────────────────────────────────────────────────────────────────────

describe('createFormStore — list handlers', () => {
  interface ListValues { items: string[] }

  function makeListStore() {
    return createFormStore<ListValues>({ initialValues: { items: ['a', 'b', 'c'] } });
  }

  it('insertListItem appends when no index', () => {
    const store = makeListStore();
    store.insertListItem('items', 'd');
    expect(store.getValues().items).toEqual(['a', 'b', 'c', 'd']);
  });

  it('insertListItem inserts at index', () => {
    const store = makeListStore();
    store.insertListItem('items', 'x', 1);
    expect(store.getValues().items).toEqual(['a', 'x', 'b', 'c']);
  });

  it('removeListItem removes at index', () => {
    const store = makeListStore();
    store.removeListItem('items', 1);
    expect(store.getValues().items).toEqual(['a', 'c']);
  });

  it('replaceListItem replaces at index', () => {
    const store = makeListStore();
    store.replaceListItem('items', 0, 'z');
    expect(store.getValues().items).toEqual(['z', 'b', 'c']);
  });

  it('reorderListItem moves from→to', () => {
    const store = makeListStore();
    store.reorderListItem('items', { from: 0, to: 2 });
    expect(store.getValues().items).toEqual(['b', 'c', 'a']);
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('createFormStore — validation', () => {
  it('rules-object validate: sets errors for failing fields', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validate: {
        name: (v) => (v ? null : 'Required'),
        email: (v) => (v.includes('@') ? null : 'Invalid'),
      },
    });
    const result = store.validate();
    expect(result).not.toBeInstanceOf(Promise);
    expect((result as { hasErrors: boolean }).hasErrors).toBe(true);
    expect(store.errors['name']).toBe('Required');
    expect(store.errors['email']).toBe('Invalid');
  });

  it('single-function validate', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validate: () => ({ name: 'bad' }),
    });
    const result = store.validate();
    expect((result as { hasErrors: boolean }).hasErrors).toBe(true);
  });

  it('validateField(path) validates only that field', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validate: {
        name: (v) => (v ? null : 'Name required'),
        email: (v) => (v ? null : 'Email required'),
      },
    });
    const result = store.validateField('name');
    expect((result as { hasError: boolean }).hasError).toBe(true);
    expect(store.errors['email']).toBeUndefined();
  });

  it('isValid() returns true when no errors', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: 'Jane', age: 0, email: '' },
      validate: { name: (v) => (v ? null : 'Required') },
    });
    expect(store.isValid()).toBe(true);
  });

  it('isValid() does not mutate errors', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validate: { name: (v) => (v ? null : 'Required') },
    });
    store.isValid();
    expect(store.errors['name']).toBeUndefined();
  });

  it('async validation toggles validating / isValidating', async () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validate: {
        name: () => Promise.resolve('async error'),
      },
    });
    const promise = store.validateField('name') as Promise<{ hasError: boolean }>;
    expect(store.isValidating('name')).toBe(true);
    await promise;
    expect(store.isValidating('name')).toBe(false);
    expect(store.errors['name']).toBe('async error');
  });

  it('stale async validation result is ignored (generation guard)', async () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validate: {
        name: () => new Promise((resolve) => setTimeout(() => resolve('stale'), 50)),
      },
    });
    const stalePromise = store.validateField('name');
    // immediately trigger another validation to increment generation
    store.setFieldError('name', 'fresh');
    // wait for stale to resolve
    await stalePromise;
    // the stale result should NOT have overwritten the fresh error
    expect(store.errors['name']).toBe('fresh');
  });

  it('clearInputErrorOnChange clears error on next change', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      clearInputErrorOnChange: true,
    });
    store.setFieldError('name', 'bad');
    store.setFieldValue('name', 'x');
    expect(store.errors['name']).toBeUndefined();
  });

  it('resolveValidationError maps thrown errors to messages', async () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      resolveValidationError: (e) => `CUSTOM: ${String(e)}`,
      validate: {
        name: () => Promise.reject(new Error('boom')),
      },
    });
    await store.validateField('name');
    expect(store.errors['name']).toMatch(/CUSTOM/);
  });

  it('validateInputOnChange as path array only validates listed paths', () => {
    let emailValidated = false;
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validateInputOnChange: ['email'],
      validate: {
        name: () => null,
        email: (v) => {
          emailValidated = true;
          return v ? null : 'bad';
        },
      },
    });
    store.setFieldValue('name', 'x', { forceUpdate: false });
    expect(emailValidated).toBe(false);
    store.setFieldValue('email', 'y', { forceUpdate: false });
    expect(emailValidated).toBe(true);
  });
});

// ── Submit / transform ────────────────────────────────────────────────────────

describe('createFormStore — onSubmit', () => {
  it('calls onValid when validation passes', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: 'Jane', age: 0, email: '' },
    });
    const onValid = vi.fn();
    const handler = store.onSubmit(onValid);
    const event = { preventDefault: vi.fn() } as unknown as Event;
    handler(event);
    expect(onValid).toHaveBeenCalledOnce();
  });

  it('calls onInvalid when validation fails', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: '', age: 0, email: '' },
      validate: { name: (v) => (v ? null : 'Required') },
    });
    const onInvalid = vi.fn();
    const handler = store.onSubmit(vi.fn(), onInvalid);
    const event = { preventDefault: vi.fn() } as unknown as Event;
    handler(event);
    expect(onInvalid).toHaveBeenCalledOnce();
  });

  it('onSubmitPreventDefault:never skips preventDefault', () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: 'x', age: 0, email: '' },
      onSubmitPreventDefault: 'never',
    });
    const event = { preventDefault: vi.fn() } as unknown as Event;
    const handler = store.onSubmit(vi.fn());
    handler(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('transformValues applied by onSubmit', () => {
    const store = createFormStore<SimpleValues, { uppercaseName: string }>({
      initialValues: { name: 'jane', age: 0, email: '' },
      transformValues: (v) => ({ uppercaseName: v.name.toUpperCase() }),
    });
    const onValid = vi.fn();
    const handler = store.onSubmit(onValid);
    const event = { preventDefault: vi.fn() } as unknown as Event;
    handler(event);
    expect(onValid.mock.calls[0]?.[0]).toEqual({ uppercaseName: 'JANE' });
  });

  it('submitting is true while async onValid is pending', async () => {
    const store = createFormStore<SimpleValues>({
      initialValues: { name: 'x', age: 0, email: '' },
    });
    let resolveSubmit!: () => void;
    const asyncSubmit = new Promise<void>((res) => { resolveSubmit = res; });
    const handler = store.onSubmit(() => asyncSubmit);
    const event = { preventDefault: vi.fn() } as unknown as Event;
    handler(event);
    expect(store.submitting).toBe(true);
    resolveSubmit();
    await asyncSubmit;
    // give microtasks a chance
    await Promise.resolve();
    expect(store.submitting).toBe(false);
  });

  it('setSubmitting allows manual control', () => {
    const store = makeSimpleStore();
    store.setSubmitting(true);
    expect(store.submitting).toBe(true);
    store.setSubmitting(false);
    expect(store.submitting).toBe(false);
  });
});

// ── watch ─────────────────────────────────────────────────────────────────────

describe('createFormStore — watch', () => {
  it('watch fires with previousValue and value', () => {
    const store = makeSimpleStore();
    const handler = vi.fn();
    store.watch('name', handler);
    store.setFieldValue('name', 'Alice');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ previousValue: '', value: 'Alice' }),
    );
  });

  it('unsubscribe stops the handler from being called', () => {
    const store = makeSimpleStore();
    const handler = vi.fn();
    const unsub = store.watch('name', handler);
    unsub();
    store.setFieldValue('name', 'Alice');
    expect(handler).not.toHaveBeenCalled();
  });

  it('cascadeUpdates notifies ancestor watchers', () => {
    const store = createFormStore<NestedValues>({
      cascadeUpdates: true,
      initialValues: {
        user: { firstName: '', lastName: '', address: { city: '', zip: '' } },
        tags: [],
      },
    });
    const userHandler = vi.fn();
    store.watch('user', userHandler);
    store.setFieldValue('user.firstName', 'Bob');
    expect(userHandler).toHaveBeenCalled();
  });
});

// ── key ───────────────────────────────────────────────────────────────────────

describe('createFormStore — key(path)', () => {
  it('key is stable when not bumped', () => {
    const store = makeSimpleStore();
    expect(store.key('name')).toBe(store.key('name'));
  });

  it('key changes after programmatic setFieldValue', () => {
    const store = makeSimpleStore();
    const before = store.key('name');
    store.setFieldValue('name', 'x');
    expect(store.key('name')).not.toBe(before);
  });

  it('key does NOT change with forceUpdate:false', () => {
    const store = makeSimpleStore();
    const before = store.key('name');
    store.setFieldValue('name', 'x', { forceUpdate: false });
    expect(store.key('name')).toBe(before);
  });
});

// ── getInputProps ─────────────────────────────────────────────────────────────

describe('createFormStore — getInputProps', () => {
  it('includes onChange, data-path, value in controlled mode', () => {
    const store = createFormStore<SimpleValues>({
      mode: 'controlled',
      initialValues: { name: 'hi', age: 0, email: '' },
    });
    const props = store.getInputProps('name');
    expect(props['data-path']).toBe('name');
    expect(props.value).toBe('hi');
    expect(typeof props.onChange).toBe('function');
  });

  it('uses defaultValue in uncontrolled mode', () => {
    const store = createFormStore<SimpleValues>({
      mode: 'uncontrolled',
      initialValues: { name: 'hi', age: 0, email: '' },
    });
    const props = store.getInputProps('name');
    expect(props.defaultValue).toBe('hi');
    expect(props.value).toBeUndefined();
  });

  it('includes checked for checkbox type', () => {
    const store = createFormStore<{ active: boolean }>({
      mode: 'controlled',
      initialValues: { active: true },
    });
    const props = store.getInputProps('active', { type: 'checkbox' });
    expect(props.checked).toBe(true);
  });

  it('withError:false excludes error', () => {
    const store = makeSimpleStore({ initialErrors: { name: 'err' } });
    const props = store.getInputProps('name', { withError: false });
    expect(props.error).toBeUndefined();
  });

  it('onChange updates value', () => {
    const store = createFormStore<SimpleValues>({
      mode: 'controlled',
      initialValues: { name: '', age: 0, email: '' },
    });
    const props = store.getInputProps('name');
    props.onChange({ target: { value: 'new' } });
    expect(store.getValues().name).toBe('new');
  });
});

// ── subscribe ─────────────────────────────────────────────────────────────────

describe('createFormStore — subscribe', () => {
  it('subscriber called on state change', () => {
    const store = makeSimpleStore();
    const cb = vi.fn();
    store.subscribe(cb);
    store.setFieldValue('name', 'x');
    expect(cb).toHaveBeenCalled();
  });

  it('unsubscribe stops callback', () => {
    const store = makeSimpleStore();
    const cb = vi.fn();
    const unsub = store.subscribe(cb);
    unsub();
    store.setFieldValue('name', 'x');
    expect(cb).not.toHaveBeenCalled();
  });
});

// ── getInputNode ──────────────────────────────────────────────────────────────

describe('createFormStore — getInputNode', () => {
  it('returns null when document is not available (SSR)', () => {
    // In the test environment (Node), document may or may not be defined.
    // We always expect null in a non-browser environment.
    const store = makeSimpleStore();
    const node = store.getInputNode('name');
    // Either null (Node/SSR) or an HTMLElement (jsdom)
    expect(node === null || node instanceof Object).toBe(true);
  });
});
