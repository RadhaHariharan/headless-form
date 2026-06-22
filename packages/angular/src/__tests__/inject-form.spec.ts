import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  EnvironmentInjector,
  createEnvironmentInjector,
  ENVIRONMENT_INITIALIZER,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { injectForm } from '../inject-form.js';

describe('injectForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('creates a form with signals', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({
        initialValues: { name: 'Alice', age: 30 },
      }),
    );

    expect(form.errors()).toEqual({});
    expect(form.validating()).toBe(false);
    expect(form.submitting()).toBe(false);
    expect(form.initialized()).toBe(false);
    expect(form.touched()).toEqual({});
    expect(form.dirty()).toEqual({});
    expect(Object.keys(form.fieldKeys())).toHaveLength(0);
  });

  it('getValues returns initial values', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { x: 1 } }),
    );
    expect(form.getValues()).toEqual({ x: 1 });
  });

  it('setFieldValue updates the value', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: '' } }),
    );
    form.setFieldValue('name', 'Bob');
    expect(form.getValues()).toEqual({ name: 'Bob' });
  });

  it('errors signal updates after setFieldError', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ email: string }, { email: string }, string>({
        initialValues: { email: '' },
      }),
    );
    form.setFieldError('email', 'Required');
    TestBed.flushEffects();
    expect(form.errors()['email']).toBe('Required');
  });

  it('clearErrors removes all errors', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ a: string }, { a: string }, string>({ initialValues: { a: '' } }),
    );
    form.setFieldError('a', 'err');
    form.clearErrors();
    expect(form.errors()).toEqual({});
  });

  it('isDirty returns false initially', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { v: 'hi' } }),
    );
    expect(form.isDirty()).toBe(false);
  });

  it('isDirty returns true after value change', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { v: 'hi' } }),
    );
    form.setFieldValue('v', 'bye');
    expect(form.isDirty()).toBe(true);
  });

  it('isTouched returns false initially', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { v: '' } }),
    );
    expect(form.isTouched()).toBe(false);
  });

  it('reset restores initial values', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: 'start' } }),
    );
    form.setFieldValue('name', 'changed');
    form.reset();
    expect(form.getValues()).toEqual({ name: 'start' });
  });

  it('initialize sets both values and initial values', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { x: '' } }),
    );
    form.initialize({ x: 'initialized' });
    expect(form.getValues()).toEqual({ x: 'initialized' });
    expect(form.initialized()).toBe(true);
  });

  it('validate returns hasErrors=true when rules fail', async () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ name: string }, { name: string }, string>({
        initialValues: { name: '' },
        validate: { name: (v) => (v.length === 0 ? 'Required' : null) },
      }),
    );
    const result = await form.validate();
    expect(result.hasErrors).toBe(true);
  });

  it('isValid returns true when no validation errors', async () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ name: string }, { name: string }, string>({
        initialValues: { name: 'ok' },
        validate: { name: (v) => (v.length === 0 ? 'Required' : null) },
      }),
    );
    const valid = await form.isValid();
    expect(valid).toBe(true);
  });

  it('watch fires when field value changes', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { count: 0 } }),
    );
    const cb = vi.fn();
    const unwatch = form.watch('count', cb);
    form.setFieldValue('count', 42);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ value: 42 }));
    unwatch();
  });

  it('setValues merges partial updates', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { a: 1, b: 2 } }),
    );
    form.setValues({ a: 99 });
    expect(form.getValues()).toEqual({ a: 99, b: 2 });
  });

  it('insertListItem / removeListItem work', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { items: ['a'] } }),
    );
    form.insertListItem('items', 'b');
    expect((form.getValues() as { items: string[] }).items).toEqual(['a', 'b']);
    form.removeListItem('items', 0);
    expect((form.getValues() as { items: string[] }).items).toEqual(['b']);
  });

  it('getInputProps returns onChange/onBlur/value', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: 'test' } }),
    );
    const props = form.getInputProps('name');
    expect(props.value).toBe('test');
    expect(typeof props.onChange).toBe('function');
    expect(typeof props.onBlur).toBe('function');
  });

  it('key returns a stable string for the path', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { email: '' } }),
    );
    const k = form.key('email');
    expect(typeof k).toBe('string');
    expect(k).toContain('email');
  });

  it('getTransformedValues applies transformValues', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({
        initialValues: { name: '  alice  ' },
        transformValues: (v) => ({ name: v.name.trim() }),
      }),
    );
    expect(form.getTransformedValues()).toEqual({ name: 'alice' });
  });

  it('setTouched and resetTouched work', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { x: '' } }),
    );
    form.setTouched({ x: true });
    expect(form.isTouched('x')).toBe(true);
    form.resetTouched();
    expect(form.isTouched('x')).toBe(false);
  });

  it('setDirty and resetDirty work', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { x: '' } }),
    );
    form.setDirty({ x: true });
    expect(form.isDirty('x')).toBe(true);
    form.resetDirty();
    expect(form.isDirty('x')).toBe(false);
  });

  it('replaceListItem updates the item in place', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { tags: ['a', 'b'] } }),
    );
    form.replaceListItem('tags', 1, 'z');
    expect((form.getValues() as { tags: string[] }).tags).toEqual(['a', 'z']);
  });

  it('reorderListItem moves items', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { tags: ['a', 'b', 'c'] } }),
    );
    form.reorderListItem('tags', { from: 0, to: 2 });
    expect((form.getValues() as { tags: string[] }).tags).toEqual(['b', 'c', 'a']);
  });

  it('setSubmitting updates the submitting flag', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: {} }),
    );
    form.setSubmitting(true);
    expect(form.submitting()).toBe(true);
    form.setSubmitting(false);
    expect(form.submitting()).toBe(false);
  });

  it('clearFieldError removes the error for a single field', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ a: string; b: string }, { a: string; b: string }, string>({
        initialValues: { a: '', b: '' },
      }),
    );
    form.setFieldError('a', 'err-a');
    form.setFieldError('b', 'err-b');
    form.clearFieldError('a');
    expect(form.errors()).toEqual({ b: 'err-b' });
  });

  it('onSubmit calls onValid with transformed values', async () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({
        initialValues: { name: 'ok' },
        validate: { name: (v: string) => (v.length === 0 ? 'Required' : null) },
      }),
    );
    const onValid = vi.fn();
    const handler = form.onSubmit(onValid);
    handler(new Event('submit'));
    // async flush
    await new Promise((r) => setTimeout(r, 0));
    expect(onValid).toHaveBeenCalledWith({ name: 'ok' }, expect.anything());
  });

  it('getInputNode returns null when element not in DOM', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { x: '' } }),
    );
    expect(form.getInputNode('x')).toBeNull();
  });

  it('setInitialValues updates the initial values reference', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { v: 'old' } }),
    );
    form.setInitialValues({ v: 'new' });
    expect(form.getInitialValues()).toEqual({ v: 'new' });
  });
});
