import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectForm } from '@headless-form/angular';
import { HfFieldDirective } from '@headless-form/angular';
import { isEmail, isNotEmpty } from '@headless-form/core';

type Values = { name: string; email: string };

@Component({
  standalone: true,
  selector: 'app-uncontrolled-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HfFieldDirective],
  template: `
    <h2>Uncontrolled Mode</h2>
    <p style="font-size:.875rem;color:#718096">
      Typing does not trigger change detection. Only validation errors and submit cause updates.
    </p>

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

      <div style="display:flex;gap:.5rem;margin-top:1rem">
        <button type="submit">Submit</button>
        <button type="button" (click)="form.reset()" style="background:#718096">Reset</button>
        <button type="button" (click)="form.setFieldValue('name', 'Alice')" style="background:#38a169">
          Set name = Alice
        </button>
      </div>
    </form>
  `,
})
export class UncontrolledFormComponent {
  form = injectForm<Values, Values, string>({
    mode: 'uncontrolled',
    initialValues: { name: '', email: '' },
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Valid email required'),
    },
  });

  submit(event: Event): void {
    const handler = this.form.onSubmit(
      (values) => alert(`Valid!\n${JSON.stringify(values, null, 2)}`),
      () => {},
    );
    handler(event);
  }
}
