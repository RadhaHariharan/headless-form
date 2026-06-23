import { describe, it, expect } from 'vitest';
import { createFormStore } from '@headlesskit/forms';
import { getSwitchProps } from './get-switch-props.js';

describe('getSwitchProps', () => {
  it('always returns a "value" boolean in controlled mode', () => {
    const form = createFormStore<{ subscribed: boolean }>({
      mode: 'controlled',
      initialValues: { subscribed: true },
    });

    expect(getSwitchProps(form, 'subscribed').value).toBe(true);
  });

  it('always returns a "value" boolean in uncontrolled mode too (no defaultValue split)', () => {
    const form = createFormStore<{ subscribed: boolean }>({
      mode: 'uncontrolled',
      initialValues: { subscribed: true },
    });

    expect(getSwitchProps(form, 'subscribed').value).toBe(true);
  });

  it('defaults to false when the underlying value is falsy', () => {
    const form = createFormStore<{ subscribed: boolean }>({
      initialValues: { subscribed: false },
    });

    expect(getSwitchProps(form, 'subscribed').value).toBe(false);
  });

  it('onValueChange writes the raw boolean directly', () => {
    const form = createFormStore<{ subscribed: boolean }>({
      mode: 'controlled',
      initialValues: { subscribed: false },
    });

    getSwitchProps(form, 'subscribed').onValueChange(true);

    expect(form.getValues().subscribed).toBe(true);
  });

  it('never returns "checked", "defaultChecked", "error", or focus handlers', () => {
    const form = createFormStore<{ subscribed: boolean }>({ initialValues: { subscribed: false } });
    const props = getSwitchProps(form, 'subscribed') as unknown as Record<string, unknown>;

    expect('checked' in props).toBe(false);
    expect('defaultChecked' in props).toBe(false);
    expect('error' in props).toBe(false);
    expect('onFocus' in props).toBe(false);
    expect('onBlur' in props).toBe(false);
  });
});
