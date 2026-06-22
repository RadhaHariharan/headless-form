import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectForm } from '@headless-form/angular';
import { HfFieldDirective } from '@headless-form/angular';
import { isEmail, isNotEmpty, hasLength } from '@headless-form/core';

type Values = { name: string; email: string; message: string; agree: boolean };

@Component({
  standalone: true,
  selector: 'app-contact-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HfFieldDirective],
  template: `
    <h2>Controlled Mode</h2>

    <form (ngSubmit)="submit($event)" novalidate>
      <label>
        Name
        <input [hfField]="form" path="name" placeholder="Alice" />
        <div class="error">{{ (form.errors())['name'] ?? '' }}</div>
      </label>

      <label>
        Email
        <input type="email" [hfField]="form" path="email" placeholder="alice@example.com" />
        <div class="error">{{ (form.errors())['email'] ?? '' }}</div>
      </label>

      <label>
        Message
        <input [hfField]="form" path="message" placeholder="Hello…" />
        <div class="error">{{ (form.errors())['message'] ?? '' }}</div>
      </label>

      <label style="display:flex;align-items:center;gap:.5rem;margin-top:.5rem">
        <input type="checkbox" [hfField]="form" path="agree" />
        I agree to the terms
      </label>
      <div class="error">{{ (form.errors())['agree'] ?? '' }}</div>

      <div style="display:flex;gap:.5rem;margin-top:1rem">
        <button type="submit" [disabled]="form.submitting()">
          {{ form.submitting() ? 'Submitting…' : 'Submit' }}
        </button>
        <button type="button" (click)="form.reset()" style="background:#718096">Reset</button>
      </div>
    </form>

    <pre style="margin-top:1rem">{{ debugJson() }}</pre>
  `,
})
export class ContactFormComponent {
  form = injectForm<Values, Values, string>({
    initialValues: { name: '', email: '', message: '', agree: false },
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Valid email required'),
      message: hasLength({ min: 10 }, 'At least 10 characters'),
      agree: (v) => (!v ? 'You must agree' : null),
    },
    validateInputOnChange: true,
  });

  submit(event: Event): void {
    const handler = this.form.onSubmit(
      (values) => alert(`Valid!\n${JSON.stringify(values, null, 2)}`),
      () => {},
    );
    handler(event);
  }

  debugJson(): string {
    return JSON.stringify({
      values: this.form.getValues(),
      errors: this.form.errors(),
      dirty: this.form.isDirty(),
    }, null, 2);
  }
}
