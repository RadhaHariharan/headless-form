import { describe, it, expect } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HfFieldDirective } from '../form-field.directive.js';
import { injectForm } from '../inject-form.js';
import type { FormApi } from '../inject-form.js';

@Component({
  standalone: true,
  imports: [HfFieldDirective],
  // hfField is a regular @Input, so [hfField]="form" works via attribute selector matching
  template: `<input [hfField]="form" [path]="path" />`,
})
class TextHostComponent {
  form: FormApi<{ name: string }, { name: string }, string> | null = null;
  path = 'name';
}

@Component({
  standalone: true,
  imports: [HfFieldDirective],
  template: `<input type="checkbox" [hfField]="form" [path]="path" />`,
})
class CheckboxHostComponent {
  form: FormApi<{ accept: boolean }, { accept: boolean }, string> | null = null;
  path = 'accept';
}

describe('HfFieldDirective', () => {
  it('attaches data-path attribute to the host element', () => {
    TestBed.configureTestingModule({ imports: [TextHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: 'Alice' } }),
    );
    const fixture = TestBed.createComponent(TextHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('data-path')).toBe('name');
  });

  it('sets the input value from form values', () => {
    TestBed.configureTestingModule({ imports: [TextHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: 'Alice' } }),
    );
    const fixture = TestBed.createComponent(TextHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Alice');
  });

  it('calls onChange when input event fires', () => {
    TestBed.configureTestingModule({ imports: [TextHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: '' } }),
    );
    const fixture = TestBed.createComponent(TextHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Bob';
    input.dispatchEvent(new Event('input'));
    expect(form.getValues().name).toBe('Bob');
  });

  it('marks field as touched when value changes (default touchTrigger=change)', () => {
    TestBed.configureTestingModule({ imports: [TextHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: '' } }),
    );
    const fixture = TestBed.createComponent(TextHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'typed';
    input.dispatchEvent(new Event('input'));
    expect(form.isTouched('name')).toBe(true);
  });

  it('marks field as touched on focus when touchTrigger=focus', () => {
    TestBed.configureTestingModule({ imports: [TextHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: '' }, touchTrigger: 'focus' }),
    );
    const fixture = TestBed.createComponent(TextHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    expect(form.isTouched('name')).toBe(true);
  });

  it('handles type=checkbox — sets checked state', () => {
    TestBed.configureTestingModule({ imports: [CheckboxHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { accept: false } }),
    );
    const fixture = TestBed.createComponent(CheckboxHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  it('updates DOM checked state when form value changes', () => {
    TestBed.configureTestingModule({ imports: [CheckboxHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { accept: false } }),
    );
    const fixture = TestBed.createComponent(CheckboxHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    form.setFieldValue('accept', true);
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('ignores input events for checkbox type', () => {
    TestBed.configureTestingModule({ imports: [CheckboxHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { accept: false } }),
    );
    const fixture = TestBed.createComponent(CheckboxHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('input'));
    expect(form.getValues().accept).toBe(false);
  });

  it('focus event does not throw', () => {
    TestBed.configureTestingModule({ imports: [TextHostComponent] });
    const form = TestBed.runInInjectionContext(() =>
      injectForm({ initialValues: { name: '' } }),
    );
    const fixture = TestBed.createComponent(TextHostComponent);
    fixture.componentInstance.form = form as never;
    fixture.detectChanges();
    TestBed.flushEffects();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(() => input.dispatchEvent(new Event('focus'))).not.toThrow();
  });
});
