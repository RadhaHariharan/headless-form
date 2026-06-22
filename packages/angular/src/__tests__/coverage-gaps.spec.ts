/**
 * Tests targeting branches and functions not covered by other spec files.
 */
import { describe, it, expect, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HfFieldDirective } from '../form-field.directive.js';
import { injectForm } from '../inject-form.js';
import type { FormApi } from '../inject-form.js';

// ── Directive: change event + radio type ────────────────────────────────────

@Component({
  standalone: true,
  imports: [HfFieldDirective],
  template: `<input type="radio" value="yes" [hfField]="form" [path]="path" />`,
})
class RadioHostComponent {
  form: FormApi<{ choice: string }, { choice: string }, string> | null = null;
  path = 'choice';
}

@Component({
  standalone: true,
  imports: [HfFieldDirective],
  template: `<input type="checkbox" [hfField]="form" [path]="path" />`,
})
class CheckboxChangeHostComponent {
  form: FormApi<{ accept: boolean }, { accept: boolean }, string> | null = null;
  path = 'accept';
}

@Component({
  standalone: true,
  imports: [HfFieldDirective],
  template: `<input [hfField]="form" [path]="path" />`,
})
class NestedPathHostComponent {
  form: FormApi<{ user: { name: string } }, { user: { name: string } }, string> | null = null;
  path = 'user.name';
}

describe('HfFieldDirective — coverage gaps', () => {
  it('handles change event for checkbox', () => {
    TestBed.configureTestingModule({ imports: [CheckboxChangeHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { accept: false } }),
    );
    const fixture = TestBed.createComponent(CheckboxChangeHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(form.getValues().accept).toBe(true);
  });

  it('handles radio type — sets checked when value matches', () => {
    TestBed.configureTestingModule({ imports: [RadioHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { choice: 'yes' } }),
    );
    const fixture = TestBed.createComponent(RadioHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('handles nested dot-notation path', () => {
    TestBed.configureTestingModule({ imports: [NestedPathHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { user: { name: 'Nested' } } }),
    );
    const fixture = TestBed.createComponent(NestedPathHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Nested');
  });
});

// ── inject-form: uncovered methods ──────────────────────────────────────────

describe('injectForm — coverage gaps', () => {
  it('getTouched returns touched record', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { a: '' } }),
    );
    form.setTouched({ a: true });
    expect(form.getTouched()).toEqual({ a: true });
  });

  it('getDirty returns dirty record', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { a: '' } }),
    );
    form.setDirty({ a: true });
    expect(form.getDirty()).toEqual({ a: true });
  });

  it('isValidating(path) returns false when no async validation', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { email: '' } }),
    );
    expect(form.isValidating('email')).toBe(false);
  });

  it('onReset resets values when called as event handler', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { x: 'start' } }),
    );
    form.setFieldValue('x', 'changed');
    const event = new Event('reset');
    form.onReset(event);
    expect(form.getValues()).toEqual({ x: 'start' });
  });

  it('validateField returns { error: null } for valid field', async () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ name: string }, { name: string }, string>({
        initialValues: { name: 'ok' },
        validate: { name: (v) => (v.length === 0 ? 'Required' : null) },
      }),
    );
    const result = await form.validateField('name');
    expect(result.hasError).toBe(false);
  });

  it('setErrors replaces all errors', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ a: string; b: string }, { a: string; b: string }, string>({
        initialValues: { a: '', b: '' },
      }),
    );
    form.setErrors({ a: 'err-a', b: 'err-b' });
    expect(form.errors()).toEqual({ a: 'err-a', b: 'err-b' });
  });

  it('resetField resets a single field to initial value', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { a: 'init', b: 'other' } }),
    );
    form.setFieldValue('a', 'changed');
    form.resetField('a');
    expect(form.getValues()).toEqual({ a: 'init', b: 'other' });
  });

  it('isValid with path returns true for a valid specific field', async () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ a: string }, { a: string }, string>({
        initialValues: { a: 'ok' },
        validate: { a: (v) => (v ? null : 'Required') },
      }),
    );
    const result = await form.isValid('a');
    expect(result).toBe(true);
  });

  it('onSubmit calls onInvalid when validation fails', async () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm<{ x: string }, { x: string }, string>({
        initialValues: { x: '' },
        validate: { x: (v) => (v ? null : 'Required') },
      }),
    );
    const onInvalid = vi.fn();
    const handler = form.onSubmit(() => {}, onInvalid);
    handler(new Event('submit'));
    await new Promise((r) => setTimeout(r, 0));
    expect(onInvalid).toHaveBeenCalled();
  });

  it('watch unsubscribes cleanly', () => {
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { v: 0 } }),
    );
    let count = 0;
    const unwatch = form.watch('v', () => {
      count += 1;
    });
    form.setFieldValue('v', 1);
    unwatch();
    form.setFieldValue('v', 2);
    expect(count).toBe(1);
  });
});
