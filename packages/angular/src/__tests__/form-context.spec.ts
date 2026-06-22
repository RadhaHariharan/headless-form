import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { InjectionToken } from '@angular/core';
import { injectForm } from '../inject-form.js';
import { provideForm, injectFormContext } from '../form-context.js';
import { FORM_CONTEXT_TOKEN } from '../form-context.token.js';

describe('FORM_CONTEXT_TOKEN', () => {
  it('is an InjectionToken', () => {
    expect(FORM_CONTEXT_TOKEN).toBeInstanceOf(InjectionToken);
  });
});

describe('provideForm', () => {
  it('returns an array of providers', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: '' } }),
    );
    const providers = provideForm(form);
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('provides the form via FORM_CONTEXT_TOKEN', () => {
    // Use a plain mock so we can configure the module before any inject() call
    const mockForm = { getValues: () => ({ email: 'test@example.com' }) } as never;

    TestBed.configureTestingModule({
      providers: [...provideForm(mockForm)],
    });

    const retrieved = TestBed.inject(FORM_CONTEXT_TOKEN);
    expect(retrieved).toBe(mockForm);
  });
});

describe('injectFormContext', () => {
  it('throws when no provideForm is found', () => {
    expect(() => {
      TestBed.runInInjectionContext(() => injectFormContext());
    }).toThrow(/No provideForm/);
  });

  it('returns the provided form via injection', () => {
    const mockForm = { getValues: () => ({ x: 42 }) } as never;

    TestBed.configureTestingModule({
      providers: [...provideForm(mockForm)],
    });

    const ctx = TestBed.runInInjectionContext(() =>
      injectFormContext<{ x: number }>(),
    );
    expect(ctx.getValues()).toEqual({ x: 42 });
  });

  it('works for any generic Values type (type cast test)', () => {
    const mockForm = { getValues: () => ({ email: 'a@b.com' }) } as never;

    TestBed.configureTestingModule({
      providers: [...provideForm(mockForm)],
    });

    const ctx = TestBed.runInInjectionContext(() =>
      injectFormContext<{ email: string }>(),
    );
    expect(ctx.getValues().email).toBe('a@b.com');
  });
});
