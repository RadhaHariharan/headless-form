import { describe, it, expect, vi } from 'vitest';
import type { UseFieldReturnType } from '@headlesskit/forms-react';
import type { GetInputPropsResult } from '@headlesskit/forms';
import { getFieldTextInputProps } from './get-field-text-input-props.js';

function makeField<Value, TError>(
  getInputProps: () => GetInputPropsResult<TError>,
): UseFieldReturnType<Value, TError> {
  return {
    key: '0-field-0',
    getValue: vi.fn(),
    setValue: vi.fn(),
    reset: vi.fn(),
    getInputProps,
    error: null,
    validate: vi.fn(),
    isValidating: false,
    isDirty: false,
    isTouched: false,
    setError: vi.fn(),
    clearError: vi.fn(),
  };
}

describe('getFieldTextInputProps', () => {
  it('maps value/defaultValue/error straight through', () => {
    const field = makeField<string, string>(() => ({
      'data-path': 'field',
      onChange: vi.fn(),
      value: 'hello',
      error: 'Required',
    }));

    const props = getFieldTextInputProps(field);

    expect(props.value).toBe('hello');
    expect(props.error).toBe('Required');
  });

  it('onChangeText calls the underlying onChange with the raw string', () => {
    const onChange = vi.fn();
    const field = makeField<string, string>(() => ({
      'data-path': 'field',
      onChange,
      value: '',
    }));

    getFieldTextInputProps(field).onChangeText('typed');

    expect(onChange).toHaveBeenCalledWith('typed');
  });

  it('forwards onFocus and onBlur', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const field = makeField<string, string>(() => ({
      'data-path': 'field',
      onChange: vi.fn(),
      value: '',
      onFocus,
      onBlur,
    }));

    const props = getFieldTextInputProps(field);
    props.onFocus?.();
    props.onBlur?.();

    expect(onFocus).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
