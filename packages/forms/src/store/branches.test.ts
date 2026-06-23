/**
 * Tests targeting the remaining branch coverage gaps in create-form-store.ts.
 */
import { describe, it, expect, vi } from 'vitest';
import { createFormStore } from './create-form-store.js';

interface V { name: string; age: number; email: string }

describe('branch coverage — misc', () => {
  it('setFieldValue with already-true touched does not re-set touched', () => {
    const s = createFormStore<V>({
      touchTrigger: 'change',
      initialValues: { name: '', age: 0, email: '' },
    });
    s.setFieldValue('name', 'first');
    expect(s.isTouched('name')).toBe(true);
    s.setFieldValue('name', 'second');
    expect(s.isTouched('name')).toBe(true);
  });

  it('setFieldValue dirty stays consistent when reverting to initial', () => {
    const s = createFormStore<V>({ initialValues: { name: 'init', age: 0, email: '' } });
    s.setFieldValue('name', 'changed');
    expect(s.isDirty('name')).toBe(true);
    s.setFieldValue('name', 'init');
    expect(s.isDirty('name')).toBe(false);
  });

  it('enhanceGetInputProps returning undefined does not crash', () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      enhanceGetInputProps: () => undefined,
    });
    expect(() => s.getInputProps('name')).not.toThrow();
  });

  it('isValid(path) with function validate always returns true for individual paths', () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      validate: () => ({ name: 'bad' }),
    });
    // When validate is a function (not rules object), path-specific isValid always returns true
    // because there's no per-field rule to run.
    expect(s.isValid('name')).toBe(true);
  });

  it('onSubmit with async validate: submitting resets to false when done', async () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      validate: async () => ({ name: 'err' }),
    });
    const handler = s.onSubmit(vi.fn(), vi.fn());
    handler({ preventDefault: vi.fn() } as unknown as Event);
    expect(s.submitting).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(s.submitting).toBe(false);
  });

  it('clearInputErrorOnChange:false does not clear error on change', () => {
    const s = createFormStore<V>({
      initialValues: { name: '', age: 0, email: '' },
      clearInputErrorOnChange: false,
    });
    s.setFieldError('name', 'sticky');
    s.setFieldValue('name', 'changed');
    expect(s.errors['name']).toBe('sticky');
  });

  it('watchRegistry notify with empty handlers does not crash', () => {
    const s = createFormStore<V>({ initialValues: { name: '', age: 0, email: '' } });
    expect(() => s.setFieldValue('name', 'x')).not.toThrow();
  });

  it('getInputProps for uncontrolled text uses defaultValue', () => {
    const s = createFormStore<V>({
      mode: 'uncontrolled',
      initialValues: { name: 'hi', age: 0, email: '' },
    });
    const props = s.getInputProps('name');
    expect(props.defaultValue).toBe('hi');
  });

  it('resetDirty without values argument just clears dirty', () => {
    const s = createFormStore<V>({ initialValues: { name: 'A', age: 0, email: '' } });
    s.setFieldValue('name', 'B');
    s.resetDirty();
    expect(s.getDirty()).toEqual({});
  });

  it('setValues with functional updater updates dirty', () => {
    const s = createFormStore<V>({ initialValues: { name: 'init', age: 0, email: '' } });
    s.setValues((cur) => ({ name: cur.name + '!' }));
    expect(s.isDirty('name')).toBe(true);
  });
});
