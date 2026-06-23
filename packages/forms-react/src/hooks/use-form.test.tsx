import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useForm } from './use-form.js';
import { isEmail } from '@headlesskit/forms';

// ── Returns every core member ────────────────────────────────────────────────

describe('useForm — returns expected members', () => {
  it('returns getValues, setFieldValue, validate, onSubmit', () => {
    const { result } = renderHook(() => useForm({ initialValues: { email: '' } }));
    expect(typeof result.current.getValues).toBe('function');
    expect(typeof result.current.setFieldValue).toBe('function');
    expect(typeof result.current.validate).toBe('function');
    expect(typeof result.current.onSubmit).toBe('function');
  });

  it('errors is reactive from useSyncExternalStore', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: { name: '' }, validate: { name: (v) => (v ? null : 'Req') } }),
    );
    expect(result.current.errors).toEqual({});
    act(() => { result.current.validate(); });
    expect(result.current.errors['name']).toBe('Req');
  });
});

// ── Controlled mode re-renders ────────────────────────────────────────────────

describe('useForm — controlled mode', () => {
  it('re-renders on setFieldValue', () => {
    const renderCount = { current: 0 };
    const { result } = renderHook(() => {
      renderCount.current += 1;
      return useForm<{ name: string }>({ mode: 'controlled', initialValues: { name: '' } });
    });
    const before = renderCount.current;
    act(() => { result.current.setFieldValue('name', 'Alice'); });
    expect(renderCount.current).toBeGreaterThan(before);
  });
});

// ── Uncontrolled mode ────────────────────────────────────────────────────────

describe('useForm — uncontrolled mode', () => {
  it('typing via getInputProps.onChange does NOT re-render', () => {
    const renderCount = { current: 0 };
    const { result } = renderHook(() => {
      renderCount.current += 1;
      return useForm<{ name: string }>({ mode: 'uncontrolled', initialValues: { name: '' } });
    });
    const before = renderCount.current;
    act(() => {
      const props = result.current.getInputProps('name');
      props.onChange({ target: { value: 'typing...' } });
    });
    expect(renderCount.current).toBe(before);
  });

  it('setFieldError DOES re-render in uncontrolled mode', () => {
    const renderCount = { current: 0 };
    const { result } = renderHook(() => {
      renderCount.current += 1;
      return useForm<{ name: string }>({ mode: 'uncontrolled', initialValues: { name: '' } });
    });
    const before = renderCount.current;
    act(() => { result.current.setFieldError('name', 'bad'); });
    expect(renderCount.current).toBeGreaterThan(before);
  });

  it('programmatic setFieldValue bumps key(path)', () => {
    const { result } = renderHook(() =>
      useForm<{ name: string }>({ mode: 'uncontrolled', initialValues: { name: '' } }),
    );
    const keyBefore = result.current.key('name');
    act(() => { result.current.setFieldValue('name', 'Bob'); });
    expect(result.current.key('name')).not.toBe(keyBefore);
  });
});

// ── onSubmit / onReset ───────────────────────────────────────────────────────

describe('useForm — onSubmit', () => {
  it('calls onValid with transformed values', () => {
    const onValid = vi.fn();
    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: 'Jane' },
        transformValues: (v) => ({ upper: v.name.toUpperCase() }),
      }),
    );
    const handler = result.current.onSubmit(onValid);
    act(() => { handler({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>); });
    expect(onValid.mock.calls[0]?.[0]).toEqual({ upper: 'JANE' });
  });

  it('onReset calls reset()', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: { name: 'init' } }),
    );
    act(() => { result.current.setFieldValue('name', 'changed'); });
    act(() => { result.current.onReset({ preventDefault: vi.fn() } as unknown as Event); });
    expect(result.current.getValues().name).toBe('init');
  });

  it('onSubmitPreventDefault:never skips preventDefault', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: { name: 'x' }, onSubmitPreventDefault: 'never' }),
    );
    const preventDefaultFn = vi.fn();
    const handler = result.current.onSubmit(vi.fn());
    act(() => { handler({ preventDefault: preventDefaultFn } as unknown as React.FormEvent<HTMLFormElement>); });
    expect(preventDefaultFn).not.toHaveBeenCalled();
  });
});

// ── enhanceGetInputProps ──────────────────────────────────────────────────────

describe('useForm — enhanceGetInputProps', () => {
  it('merges extra props onto getInputProps result', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: '' },
        enhanceGetInputProps: () => ({ disabled: true }),
      }),
    );
    const props = result.current.getInputProps('name');
    // `disabled` is an enhancer-added extra prop, not part of the closed result type.
    expect((props as unknown as Record<string, unknown>)['disabled']).toBe(true);
  });
});

// ── getInputProps in real DOM ─────────────────────────────────────────────────

describe('useForm — getInputProps DOM integration', () => {
  it('input updates value on user typing (controlled)', async () => {
    const user = userEvent.setup();

    function TestForm() {
      const form = useForm<{ email: string }>({
        mode: 'controlled',
        initialValues: { email: '' },
      });
      return (
        <form>
          <input data-testid="email" {...form.getInputProps('email')} />
          <span data-testid="val">{form.getValues().email}</span>
        </form>
      );
    }

    render(React.createElement(TestForm));
    const input = screen.getByTestId('email') as HTMLInputElement;
    await user.type(input, 'hello');
    expect(screen.getByTestId('val').textContent).toBe('hello');
  });
});

// ── values getter ────────────────────────────────────────────────────────────

describe('useForm — values getter', () => {
  it('.values returns current values', () => {
    const { result } = renderHook(() =>
      useForm<{ name: string }>({ initialValues: { name: 'Jane' } }),
    );
    expect(result.current.values.name).toBe('Jane');
  });

  it('.values updates after setFieldValue in controlled mode', () => {
    const { result } = renderHook(() =>
      useForm<{ name: string }>({ mode: 'controlled', initialValues: { name: '' } }),
    );
    act(() => { result.current.setFieldValue('name', 'Alice'); });
    expect(result.current.values.name).toBe('Alice');
  });
});

// ── SSR getServerSnapshot ─────────────────────────────────────────────────────

describe('useForm — getServerSnapshot', () => {
  it('returns a stable snapshot (no undefined errors)', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: '' } }));
    const snap = result.current.getServerSnapshot();
    expect(snap).toHaveProperty('errors');
    expect(snap).toHaveProperty('touched');
    expect(snap).toHaveProperty('dirty');
    expect(snap).toHaveProperty('validating');
    expect(snap).toHaveProperty('submitting');
    expect(snap).toHaveProperty('initialized');
  });
});
