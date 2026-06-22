import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { injectField } from '../inject-field.js';

describe('injectField', () => {
  it('exposes error as null initially', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: '' }),
    );
    expect(field.error()).toBeNull();
  });

  it('isValidating is false initially', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: '' }),
    );
    expect(field.isValidating()).toBe(false);
  });

  it('key is a non-empty string', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: '' }),
    );
    expect(typeof field.key).toBe('string');
    expect(field.key.length).toBeGreaterThan(0);
  });

  it('getValue returns current value', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: 'hello' }),
    );
    expect(field.getValue()).toBe('hello');
  });

  it('setValue updates the value', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: 0 }),
    );
    field.setValue(42);
    expect(field.getValue()).toBe(42);
  });

  it('setValue accepts an updater function', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: 10 }),
    );
    field.setValue((c) => c + 5);
    expect(field.getValue()).toBe(15);
  });

  it('reset restores the initial value', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: 'start' }),
    );
    field.setValue('changed');
    field.reset();
    expect(field.getValue()).toBe('start');
  });

  it('setError / clearError round-trip', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField<string, string>({ initialValue: '' }),
    );
    field.setError('Required');
    TestBed.flushEffects();
    expect(field.error()).toBe('Required');
    field.clearError();
    TestBed.flushEffects();
    expect(field.error()).toBeNull();
  });

  it('getInputProps returns value and onChange', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: 'test' }),
    );
    const props = field.getInputProps();
    expect(props.value).toBe('test');
    expect(typeof props.onChange).toBe('function');
  });

  it('validate runs the validation rule', async () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField<string, string>({
        initialValue: '',
        validate: (v) => (v.length === 0 ? 'Required' : null),
      }),
    );
    const err = await field.validate();
    expect(err).toBe('Required');
  });

  it('validate returns null for valid value', async () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField<string, string>({
        initialValue: 'ok',
        validate: (v) => (v.length === 0 ? 'Required' : null),
      }),
    );
    const err = await field.validate();
    expect(err).toBeNull();
  });

  it('isDirty is false initially', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: 5 }),
    );
    expect(field.isDirty).toBe(false);
  });

  it('isDirty is true after value change', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: 5 }),
    );
    field.setValue(99);
    expect(field.isDirty).toBe(true);
  });

  it('isTouched is false initially', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: '' }),
    );
    expect(field.isTouched).toBe(false);
  });

  it('works with mode=uncontrolled', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: '', mode: 'uncontrolled' }),
    );
    field.setValue('x');
    expect(field.getValue()).toBe('x');
  });

  it('works with type=checkbox', () => {
    const field = TestBed.runInInjectionContext(() =>
      injectField({ initialValue: false, type: 'checkbox' }),
    );
    const props = field.getInputProps();
    expect(props.checked).toBe(false);
  });
});
