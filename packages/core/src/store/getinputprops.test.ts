/**
 * Targeted tests for getInputProps branches not covered elsewhere.
 */
import { describe, it, expect } from 'vitest';
import { createFormStore } from './create-form-store.js';

interface V { active: boolean; color: string; name: string }

const store = () =>
  createFormStore<V>({
    mode: 'controlled',
    initialValues: { active: false, color: 'red', name: '' },
  });

describe('getInputProps — radio type', () => {
  it('sets checked:true when stored value matches radio value', () => {
    const s = store();
    const props = s.getInputProps('color', { type: 'radio', value: 'red' });
    expect(props.checked).toBe(true);
  });

  it('sets checked:false when stored value does not match', () => {
    const s = store();
    const props = s.getInputProps('color', { type: 'radio', value: 'blue' });
    expect(props.checked).toBe(false);
  });

  it('includes value in result for radio', () => {
    const s = store();
    const props = s.getInputProps('color', { type: 'radio', value: 'red' });
    expect(props['value']).toBe('red');
  });

  it('defaultChecked in uncontrolled mode for radio', () => {
    const s = createFormStore<V>({
      mode: 'uncontrolled',
      initialValues: { active: false, color: 'red', name: '' },
    });
    const props = s.getInputProps('color', { type: 'radio', value: 'red' });
    expect(props.defaultChecked).toBe(true);
  });
});

describe('getInputProps — withFocus:false', () => {
  it('omits onFocus and onBlur when withFocus:false', () => {
    const s = store();
    const props = s.getInputProps('name', { withFocus: false });
    expect(props.onFocus).toBeUndefined();
    expect(props.onBlur).toBeUndefined();
  });
});

describe('getInputProps — onFocus with touchTrigger:focus', () => {
  it('marks field touched on focus when touchTrigger is focus', () => {
    const s = createFormStore<V>({
      mode: 'controlled',
      touchTrigger: 'focus',
      initialValues: { active: false, color: 'red', name: '' },
    });
    const props = s.getInputProps('name');
    expect(s.isTouched('name')).toBe(false);
    props.onFocus?.();
    expect(s.isTouched('name')).toBe(true);
  });

  it('does not double-mark on second focus', () => {
    const s = createFormStore<V>({
      mode: 'controlled',
      touchTrigger: 'focus',
      initialValues: { active: false, color: 'red', name: '' },
    });
    const props = s.getInputProps('name');
    props.onFocus?.();
    props.onFocus?.();
    expect(s.isTouched('name')).toBe(true);
  });
});

describe('getInputProps — checkbox uncontrolled', () => {
  it('uses defaultChecked instead of checked in uncontrolled mode', () => {
    const s = createFormStore<V>({
      mode: 'uncontrolled',
      initialValues: { active: true, color: '', name: '' },
    });
    const props = s.getInputProps('active', { type: 'checkbox' });
    expect(props.defaultChecked).toBe(true);
    expect(props.checked).toBeUndefined();
  });
});

describe('getInputProps — extra options', () => {
  it('named form prefix in data-path', () => {
    const s = createFormStore<V>({
      name: 'myform',
      mode: 'controlled',
      initialValues: { active: false, color: '', name: '' },
    });
    const props = s.getInputProps('name');
    expect(props['data-path']).toBe('myform/name');
  });
});

describe('getInputProps — clearInputErrorOnChange fires notifySubscribers', () => {
  it('re-notifies subscribers in uncontrolled mode when error is cleared', () => {
    let notifyCount = 0;
    const s = createFormStore<V>({
      mode: 'uncontrolled',
      clearInputErrorOnChange: true,
      initialValues: { active: false, color: '', name: '' },
    });
    s.subscribe(() => { notifyCount++; });
    s.setFieldError('name', 'bad');
    const before = notifyCount;
    const props = s.getInputProps('name');
    props.onChange({ target: { value: 'x' } });
    // Should have notified once more because error was cleared
    expect(notifyCount).toBeGreaterThan(before);
  });
});

describe('validate — nested rules object', () => {
  it('walks nested rules objects', () => {
    interface Nested { user: { name: string } }
    const s = createFormStore<Nested>({
      initialValues: { user: { name: '' } },
      validate: {
        user: {
          name: (v) => (v ? null : 'Required'),
        },
      },
    });
    const r = s.validate() as { hasErrors: boolean; errors: Record<string, unknown> };
    expect(r.hasErrors).toBe(true);
    expect(r.errors['user.name']).toBe('Required');
  });
});
