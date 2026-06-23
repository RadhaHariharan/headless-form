import { describe, it, expect, vi } from 'vitest';
import { createFormStore } from '@headlesskit/forms';
import { getTextInputProps } from './get-text-input-props.js';

describe('getTextInputProps', () => {
  it('returns defaultValue (not value) in uncontrolled mode', () => {
    const form = createFormStore<{ email: string }>({
      mode: 'uncontrolled',
      initialValues: { email: 'a@b.com' },
    });

    const props = getTextInputProps(form, 'email');

    expect(props.defaultValue).toBe('a@b.com');
    expect(props.value).toBeUndefined();
  });

  it('returns value (not defaultValue) in controlled mode', () => {
    const form = createFormStore<{ email: string }>({
      mode: 'controlled',
      initialValues: { email: 'a@b.com' },
    });

    const props = getTextInputProps(form, 'email');

    expect(props.value).toBe('a@b.com');
    expect(props.defaultValue).toBeUndefined();
  });

  it('onChangeText writes the raw string directly, no event object needed', () => {
    const form = createFormStore<{ email: string }>({
      mode: 'controlled',
      initialValues: { email: '' },
    });

    getTextInputProps(form, 'email').onChangeText('new@value.com');

    expect(form.getValues().email).toBe('new@value.com');
  });

  it('forwards onFocus and onBlur from the underlying getInputProps', () => {
    const form = createFormStore<{ email: string }>({
      initialValues: { email: '' },
      touchTrigger: 'focus',
      validateInputOnBlur: true,
      validate: { email: (v: string) => (v ? null : 'Required') },
    });

    getTextInputProps(form, 'email').onFocus?.();
    expect(form.isTouched('email')).toBe(true);

    getTextInputProps(form, 'email').onBlur?.();
    expect(form.errors.email).toBe('Required');
  });

  it('includes error by default, and omits it when withError: false', () => {
    const form = createFormStore<{ email: string }>({ initialValues: { email: '' } });
    form.setFieldError('email', 'Bad email');

    expect(getTextInputProps(form, 'email').error).toBe('Bad email');
    expect(getTextInputProps(form, 'email', { withError: false }).error).toBeUndefined();
  });

  it('never returns a "data-path" or web-style "onChange" key', () => {
    const form = createFormStore<{ email: string }>({ initialValues: { email: '' } });
    const props = getTextInputProps(form, 'email') as unknown as Record<string, unknown>;

    expect('data-path' in props).toBe(false);
    expect('onChange' in props).toBe(false);
  });

  it('works on a nested path', () => {
    const form = createFormStore<{ user: { name: string } }>({
      mode: 'uncontrolled',
      initialValues: { user: { name: 'Alice' } },
    });

    const props = getTextInputProps(form, 'user.name');
    expect(props.defaultValue).toBe('Alice');

    props.onChangeText('Bob');
    expect(form.getValues().user.name).toBe('Bob');
  });

  it('onChangeText notifies subscribers in controlled mode (core default)', () => {
    const form = createFormStore<{ email: string }>({
      mode: 'controlled',
      initialValues: { email: '' },
    });
    const spy = vi.fn();
    form.subscribe(spy);

    getTextInputProps(form, 'email').onChangeText('x');

    expect(spy).toHaveBeenCalled();
  });
});
