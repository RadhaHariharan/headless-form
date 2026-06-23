import { describe, it, expect, vi } from 'vitest';
import { createFormStore } from '@headlesskit/forms';
import { getSubmitHandler } from './get-submit-handler.js';

describe('getSubmitHandler', () => {
  it('does not throw despite the default onSubmitPreventDefault: "always"', () => {
    const form = createFormStore<{ email: string }>({
      initialValues: { email: 'a@b.com' },
    });
    const handler = getSubmitHandler(form, vi.fn());

    expect(() => handler()).not.toThrow();
  });

  it('calls onValid with the transformed values when validation passes', () => {
    const form = createFormStore<{ email: string }>({ initialValues: { email: 'a@b.com' } });
    const onValid = vi.fn();

    getSubmitHandler(form, onValid)();

    expect(onValid).toHaveBeenCalledWith({ email: 'a@b.com' });
  });

  it('calls onInvalid with errors and raw values when validation fails', () => {
    const form = createFormStore<{ email: string }>({
      initialValues: { email: '' },
      validate: { email: (v: string) => (v ? null : 'Required') },
    });
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    getSubmitHandler(form, onValid, onInvalid)();

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({ email: 'Required' }, { email: '' });
  });

  it('works even when onSubmitPreventDefault is "validation-failed"', () => {
    const form = createFormStore<{ email: string }>({
      initialValues: { email: '' },
      onSubmitPreventDefault: 'validation-failed',
      validate: { email: (v: string) => (v ? null : 'Required') },
    });

    expect(() => getSubmitHandler(form, vi.fn())()).not.toThrow();
  });

  it('returns a zero-argument function (no event parameter required)', () => {
    const form = createFormStore<{ email: string }>({ initialValues: { email: 'a@b.com' } });
    const handler = getSubmitHandler(form, vi.fn());

    expect(handler.length).toBe(0);
  });
});
