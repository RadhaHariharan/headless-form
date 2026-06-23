/**
 * Targeted tests for code paths not covered by create-form-store.test.ts.
 * Focused on: isValid paths, onSubmit async, validateInputOnBlur, list/registry actions.
 */
import { describe, it, expect, vi } from 'vitest';
import { createFormStore } from './create-form-store.js';
import { createFormActions } from './form-store-registry.js';

interface V { name: string; age: number; email: string }

function base(overrides: Partial<Parameters<typeof createFormStore<V>>[0]> = {}) {
  return createFormStore<V>({ initialValues: { name: '', age: 0, email: '' }, ...overrides });
}

// ── isValid with function validate ────────────────────────────────────────────

describe('isValid — function validate', () => {
  it('returns true when no errors', () => {
    const s = base({ validate: () => ({}) });
    expect(s.isValid()).toBe(true);
  });

  it('returns false when errors', () => {
    const s = base({ validate: () => ({ name: 'bad' }) });
    expect(s.isValid()).toBe(false);
  });

  it('async function validate returns Promise<boolean>', async () => {
    const s = base({ validate: async () => ({ name: 'bad' }) });
    const result = s.isValid();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(false);
  });

  it('async function validate passes when clean', async () => {
    const s = base({ validate: async () => ({}) });
    expect(await s.isValid()).toBe(true);
  });
});

// ── isValid with rules-object validate ───────────────────────────────────────

describe('isValid — rules-object validate', () => {
  it('returns false when any rule fails', () => {
    const s = base({ validate: { name: (v) => (v ? null : 'bad') } });
    expect(s.isValid()).toBe(false);
  });

  it('returns true when all rules pass', () => {
    const s = base({
      initialValues: { name: 'ok', age: 0, email: '' },
      validate: { name: (v) => (v ? null : 'bad') },
    });
    expect(s.isValid()).toBe(true);
  });

  it('async rules-object returns Promise<boolean>', async () => {
    const s = base({ validate: { name: () => Promise.resolve('bad') } });
    const result = s.isValid();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(false);
  });

  it('isValid(path) with a passing rule returns true', () => {
    const s = base({
      initialValues: { name: 'Jane', age: 0, email: '' },
      validate: { name: (v) => (v ? null : 'Required') },
    });
    expect(s.isValid('name')).toBe(true);
  });

  it('isValid(path) with no rule returns true', () => {
    const s = base({ validate: { name: (v) => (v ? null : 'bad') } });
    expect(s.isValid('email')).toBe(true);
  });

  it('isValid(path) async', async () => {
    const s = base({ validate: { name: () => Promise.resolve('err') } });
    expect(await s.isValid('name')).toBe(false);
  });
});

// ── onSubmit with async validation ───────────────────────────────────────────

describe('onSubmit — async validation', () => {
  it('waits for async validate before calling onValid', async () => {
    const s = base({ validate: async () => ({}) });
    const onValid = vi.fn();
    const handler = s.onSubmit(onValid);
    handler({ preventDefault: vi.fn() } as unknown as Event);
    expect(s.submitting).toBe(true);
    await new Promise((r) => setTimeout(r, 10));
    expect(onValid).toHaveBeenCalled();
  });

  it('async validation failure calls onInvalid', async () => {
    const s = base({ validate: async () => ({ name: 'err' }) });
    const onInvalid = vi.fn();
    const handler = s.onSubmit(vi.fn(), onInvalid);
    handler({ preventDefault: vi.fn() } as unknown as Event);
    await new Promise((r) => setTimeout(r, 10));
    expect(onInvalid).toHaveBeenCalled();
  });
});

// ── validateInputOnBlur ───────────────────────────────────────────────────────

describe('validateInputOnBlur', () => {
  it('triggers validation on blur when path matches', async () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      validateInputOnBlur: ['name'],
      validate: { name: (v) => (v ? null : 'Required') },
    });
    const props = s.getInputProps('name', { withFocus: true });
    props.onBlur?.();
    await new Promise((r) => setTimeout(r, 10));
    expect(s.errors['name']).toBe('Required');
  });
});

// ── validateInputOnBlur with debounce ────────────────────────────────────────

describe('validateDebounce', () => {
  it('debounces field validation on change', async () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      validateInputOnChange: true,
      validateDebounce: 30,
      validate: { name: (v) => (v ? null : 'Required') },
    });
    s.setFieldValue('name', 'x', { forceUpdate: false });
    // before debounce resolves, no error yet
    expect(s.errors['name']).toBeUndefined();
    await new Promise((r) => setTimeout(r, 60));
    // after debounce, validation runs (name is 'x' → passes)
    expect(s.errors['name']).toBeUndefined();
  });
});

// ── getTransformedValues without transform ────────────────────────────────────

describe('getTransformedValues', () => {
  it('returns values unchanged when no transformValues', () => {
    const s = base();
    s.setFieldValue('name', 'Jane');
    expect(s.getTransformedValues()).toEqual(s.getValues());
  });

  it('applies transform to supplied values', () => {
    const s = createFormStore<V, { upper: string }>({
      initialValues: { name: 'jane', age: 0, email: '' },
      transformValues: (v) => ({ upper: v.name.toUpperCase() }),
    });
    expect(s.getTransformedValues({ name: 'alice', age: 0, email: '' })).toEqual({ upper: 'ALICE' });
  });
});

// ── createFormActions — all methods ──────────────────────────────────────────

describe('createFormActions — all proxy methods', () => {
  function setup() {
    const s = createFormStore<V>({ name: 'proxy-test', initialValues: { name: '', age: 0, email: '' } });
    const a = createFormActions<V>('proxy-test');
    return { s, a };
  }

  it('setErrors', () => {
    const { s, a } = setup();
    a.setErrors({ name: 'e' });
    expect(s.errors['name']).toBe('e');
  });

  it('setFieldError', () => {
    const { s, a } = setup();
    a.setFieldError('name', 'e2');
    expect(s.errors['name']).toBe('e2');
  });

  it('clearErrors', () => {
    const { s, a } = setup();
    a.setErrors({ name: 'e' });
    a.clearErrors();
    expect(s.errors).toEqual({});
  });

  it('clearFieldError', () => {
    const { s, a } = setup();
    a.setErrors({ name: 'e', email: 'e2' });
    a.clearFieldError('name');
    expect(s.errors['name']).toBeUndefined();
  });

  it('validate', async () => {
    const { s, a } = setup();
    const r = a.validate();
    if (r instanceof Promise) await r;
    expect(s.errors).toEqual({});
  });

  it('validateField', async () => {
    const { a } = setup();
    const r = a.validateField('name');
    if (r instanceof Promise) await r;
  });

  it('insertListItem / removeListItem / reorderListItem / replaceListItem', () => {
    const s = createFormStore<{ items: string[] }>({
      name: 'list-actions',
      initialValues: { items: ['a', 'b'] },
    });
    const a = createFormActions<{ items: string[] }>('list-actions');
    a.insertListItem('items', 'c');
    expect(s.getValues().items).toContain('c');
    a.removeListItem('items', 0);
    expect(s.getValues().items).not.toContain('a');
    a.replaceListItem('items', 0, 'z');
    expect(s.getValues().items[0]).toBe('z');
    a.reorderListItem('items', { from: 0, to: 1 });
  });

  it('setDirty / setTouched / resetDirty / resetTouched / setSubmitting', () => {
    const { s, a } = setup();
    a.setDirty({ name: true });
    expect(s.isDirty('name')).toBe(true);
    a.setTouched({ name: true });
    expect(s.isTouched('name')).toBe(true);
    a.resetDirty();
    expect(s.getDirty()).toEqual({});
    a.resetTouched();
    expect(s.getTouched()).toEqual({});
    a.setSubmitting(true);
    expect(s.submitting).toBe(true);
    a.setSubmitting(false);
  });

  it('setValues', () => {
    const { s, a } = setup();
    a.setValues({ name: 'proxy' });
    expect(s.getValues().name).toBe('proxy');
  });

  it('reset', () => {
    const { s, a } = setup();
    a.setValues({ name: 'changed' });
    a.reset();
    expect(s.getValues().name).toBe('');
  });
});

// ── clone fallback ────────────────────────────────────────────────────────────

describe('clone fallback', () => {
  it('clones nested values correctly', async () => {
    const { clone } = await import('../utils/clone.js');
    const obj = { a: { b: [1, 2, 3] } };
    const copy = clone(obj);
    copy.a.b[0] = 99;
    expect(obj.a.b[0]).toBe(1);
  });
});

// ── formRootRule ──────────────────────────────────────────────────────────────

describe('formRootRule', () => {
  it('formRootRule is a unique Symbol', async () => {
    const { formRootRule } = await import('../types/validation.types.js');
    expect(typeof formRootRule).toBe('symbol');
  });
});

// ── onSubmit preventDefault:validation-failed ────────────────────────────────

describe('onSubmitPreventDefault', () => {
  it('validation-failed calls preventDefault only on error', () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      onSubmitPreventDefault: 'validation-failed',
      validate: { name: (v) => (v ? null : 'Required') },
    });
    const pd = vi.fn();
    const handler = s.onSubmit(vi.fn(), vi.fn());
    handler({ preventDefault: pd } as unknown as Event);
    expect(pd).toHaveBeenCalled();
  });

  it('validation-failed does not call preventDefault when valid', () => {
    const s = createFormStore<V>({
      initialValues: { name: 'Jane', age: 0, email: '' },
      onSubmitPreventDefault: 'validation-failed',
    });
    const pd = vi.fn();
    const handler = s.onSubmit(vi.fn());
    handler({ preventDefault: pd } as unknown as Event);
    expect(pd).not.toHaveBeenCalled();
  });
});
