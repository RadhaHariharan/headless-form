import { Component, ChangeDetectionStrategy } from '@angular/core';
import type { DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  injectForm,
  HfFieldDirective,
  isEmail,
  isNotEmpty,
  matchesField,
  toValidationRule,
  createNumberValidator,
  createStringValidator,
  createDateValidator,
  type FormRulesRecord,
} from '@headless-form/angular';

const FIELD_COUNT = 120;
const KEYS = Array.from({ length: FIELD_COUNT }, (_, i) => `f${i}`);
const LABELS: Record<string, string> = {
  f0: 'Email',
  f1: 'Confirm email',
  f2: 'Age',
  f3: 'Username',
  f4: 'Birth date',
};
const TYPES: Record<string, string> = { f2: 'number', f4: 'date' };

function buildValidate(): FormRulesRecord<Record<string, string>, string> {
  const rules: FormRulesRecord<Record<string, string>, string> = {
    f0: isEmail('Enter a valid email'),
    f1: matchesField('f0', 'Emails must match'),
    f2: toValidationRule(createNumberValidator({ min: 18, max: 120, integer: true }), 'Age'),
    f3: toValidationRule(createStringValidator({ minLength: 3, allowedCharacters: 'alphanumeric' }), 'Username'),
    f4: toValidationRule(createDateValidator({ inPast: true }), 'Birth date'),
  };
  for (let i = 5; i < FIELD_COUNT; i += 10) {
    rules[`f${i}`] = isNotEmpty(`Field ${i} is required`);
  }
  return rules;
}

/**
 * 120-field uncontrolled form on Angular signals + OnPush.
 *
 * The "CD passes" counter shows how Angular change detection behaves: errors are a signal, so
 * the template only recomputes when an error changes. With zone.js, a keystroke event still
 * schedules one bounded CD pass of *this* OnPush component (the store itself does 0
 * notifications); going zoneless removes even that. Either way the cost is independent of the
 * 120 field count.
 */
@Component({
  standalone: true,
  selector: 'app-large-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HfFieldDirective],
  template: `
    <h2>
      Large Form — {{ fieldCount }} fields
      <span class="badge uncontrolled">CD passes: {{ cdPasses }}</span>
    </h2>
    <p style="font-size:.875rem;color:#718096">
      Uncontrolled, OnPush, signal-driven. The first five fields use complex validators (email,
      cross-field match, number, string, date); every 10th field is required. Errors are a
      signal — the template only updates the slot whose error changed.
    </p>

    <form (ngSubmit)="submit($event)" novalidate>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.5rem .75rem">
        <label *ngFor="let k of keys"
          style="display:flex;flex-direction:column;font-size:.7rem;color:#718096">
          {{ labelFor(k) }}
          <input [hfField]="form" [path]="k" [type]="typeFor(k)"
            style="padding:.35rem .45rem;font-size:.85rem" />
          <span class="error" style="font-size:.7rem;min-height:.8rem">{{ form.errors()[k] ?? '' }}</span>
        </label>
      </div>

      <div style="display:flex;gap:.5rem;margin-top:1rem">
        <button type="submit">Submit</button>
        <button type="button" (click)="form.reset()" style="background:#718096">Reset</button>
        <button type="button" (click)="validateAll()" style="background:#38a169">Validate all</button>
      </div>
    </form>
  `,
})
export class LargeFormComponent implements DoCheck {
  readonly fieldCount = FIELD_COUNT;
  readonly keys = KEYS;
  cdPasses = 0;

  form = injectForm<Record<string, string>, Record<string, string>, string>({
    mode: 'uncontrolled',
    initialValues: Object.fromEntries(KEYS.map((k) => [k, ''])) as Record<string, string>,
    validateInputOnBlur: true,
    validate: buildValidate(),
  });

  ngDoCheck(): void {
    this.cdPasses += 1;
  }

  labelFor(k: string): string {
    return LABELS[k] ?? `Field ${k.slice(1)}`;
  }

  typeFor(k: string): string {
    return TYPES[k] ?? 'text';
  }

  validateAll(): void {
    void this.form.validate();
  }

  submit(event: Event): void {
    const handler = this.form.onSubmit(
      (values) => alert(`Submitted ${Object.keys(values).length} fields`),
      () => {},
    );
    handler(event);
  }
}
