import { describe, it, expect, vi } from 'vitest';
import type { UseFieldReturnType } from '@headlesskit/forms-react';
import type { GetInputPropsResult } from '@headlesskit/forms';
import { getFieldSwitchProps } from './get-field-switch-props.js';

function makeField<TError>(
  getInputProps: () => GetInputPropsResult<TError>,
): UseFieldReturnType<boolean, TError> {
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

describe('getFieldSwitchProps', () => {
  it('resolves "value" from checked in controlled mode', () => {
    const field = makeField<string>(() => ({
      'data-path': 'field',
      onChange: vi.fn(),
      checked: true,
    }));

    expect(getFieldSwitchProps(field).value).toBe(true);
  });

  it('resolves "value" from defaultChecked in uncontrolled mode', () => {
    const field = makeField<string>(() => ({
      'data-path': 'field',
      onChange: vi.fn(),
      defaultChecked: true,
    }));

    expect(getFieldSwitchProps(field).value).toBe(true);
  });

  it('onValueChange calls the underlying onChange with the raw boolean', () => {
    const onChange = vi.fn();
    const field = makeField<string>(() => ({
      'data-path': 'field',
      onChange,
      checked: false,
    }));

    getFieldSwitchProps(field).onValueChange(true);

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
