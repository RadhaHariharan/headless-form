import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useField } from './use-field.js';

describe('useField', () => {
  it('returns initial value via getValue', () => {
    const { result } = renderHook(() => useField({ initialValue: 'hello' }));
    expect(result.current.getValue()).toBe('hello');
  });

  it('setValue updates the value', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));
    act(() => { result.current.setValue('world'); });
    expect(result.current.getValue()).toBe('world');
  });

  it('setValue accepts a functional updater', () => {
    const { result } = renderHook(() => useField({ initialValue: 5 }));
    act(() => { result.current.setValue((v) => v + 1); });
    expect(result.current.getValue()).toBe(6);
  });

  it('reset restores initial value', () => {
    const { result } = renderHook(() => useField({ initialValue: 'init' }));
    act(() => { result.current.setValue('changed'); });
    act(() => { result.current.reset(); });
    expect(result.current.getValue()).toBe('init');
  });

  it('error is null initially', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));
    expect(result.current.error).toBeNull();
  });

  it('validate runs the rule and sets the error', async () => {
    const { result } = renderHook(() =>
      useField({ initialValue: '', validate: (v) => (v ? null : 'Required') }),
    );
    await act(async () => { await result.current.validate(); });
    expect(result.current.error).toBe('Required');
  });

  it('setError sets the error', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));
    act(() => { result.current.setError('Custom error'); });
    expect(result.current.error).toBe('Custom error');
  });

  it('clearError clears the error', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));
    act(() => { result.current.setError('err'); });
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });

  it('isDirty is false initially', () => {
    const { result } = renderHook(() => useField({ initialValue: 'a' }));
    expect(result.current.isDirty).toBe(false);
  });

  it('isDirty is true after setValue changes value', () => {
    const { result } = renderHook(() => useField({ initialValue: 'a' }));
    act(() => { result.current.setValue('b'); });
    expect(result.current.isDirty).toBe(true);
  });

  it('key is a string', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));
    expect(typeof result.current.key).toBe('string');
  });

  it('getInputProps returns an object with onChange', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));
    const props = result.current.getInputProps();
    expect(typeof props.onChange).toBe('function');
  });

  it('isValidating is false initially', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));
    expect(result.current.isValidating).toBe(false);
  });

  it('async validate toggles isValidating', async () => {
    const { result } = renderHook(() =>
      useField({
        initialValue: '',
        validate: () => new Promise<string>((res) => setTimeout(() => res('err'), 50)),
      }),
    );
    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.validate();
    });
    expect(result.current.isValidating).toBe(true);
    await act(async () => { await promise; });
    expect(result.current.isValidating).toBe(false);
  });
});
