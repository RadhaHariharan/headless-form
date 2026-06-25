# headlesskit

A framework-agnostic form state engine with zero runtime dependencies, and 100% feature-parity React and Angular wrappers.

## Packages

| Package | Description | Size |
|---------|-------------|------|
| [`@headlesskit/forms`](./packages/forms) | Pure TypeScript form engine — zero deps | ≤ 12 KB |
| [`@headlesskit/forms-react`](./packages/forms-react) | React 18 bindings via `useSyncExternalStore` | ≤ 5 KB |
| [`@headlesskit/angular`](./packages/angular) | Angular 17+ signals-based bindings | ≤ 10 KB |

## Quick Start

### React

```bash
npm install @headlesskit/forms-react
```

```tsx
import { useForm } from '@headlesskit/forms-react';
import { isEmail, isNotEmpty } from '@headlesskit/forms';

function ContactForm() {
  const form = useForm({
    initialValues: { name: '', email: '' },
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Invalid email'),
    },
  });

  return (
    <form onSubmit={form.onSubmit((values) => console.log(values))}>
      <input {...form.getInputProps('name')} placeholder="Name" />
      {form.errors.name && <span>{form.errors.name}</span>}

      <input {...form.getInputProps('email')} type="email" placeholder="Email" />
      {form.errors.email && <span>{form.errors.email}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Angular

```bash
npm install @headlesskit/angular
```

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { injectForm, HfFieldDirective } from '@headlesskit/angular';
import { isEmail, isNotEmpty } from '@headlesskit/forms';

@Component({
  standalone: true,
  imports: [HfFieldDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="submit($event)">
      <input [hfField]="form" path="email" type="email" />
      <div>{{ form.errors()['email'] }}</div>
      <button type="submit">Submit</button>
    </form>
  `,
})
export class MyFormComponent {
  form = injectForm({
    initialValues: { email: '' },
    validate: { email: isEmail('Invalid email') },
  });

  submit(event: Event) {
    this.form.onSubmit((values) => console.log(values))(event);
  }
}
```

### Vanilla / Core

```bash
npm install @headlesskit/forms
```

```typescript
import { createFormStore, isEmail } from '@headlesskit/forms';

const form = createFormStore({
  initialValues: { email: '' },
  validate: { email: isEmail('Invalid email') },
});

form.subscribe(() => {
  // re-render your UI
});
```

## Features

- **Zero dependencies** in `@headlesskit/forms`
- **Controlled and uncontrolled** modes — uncontrolled causes **zero re-renders on typing**
- **Deep path inference** — `form.getInputProps('user.address.city')` is fully typed
- **8 built-in validators** — `isNotEmpty`, `isEmail`, `matches`, `matchesField`, `isInRange`, `hasLength`, `isJSONString`, `isNotEmptyHTML`
- **Field-validator toolkit** — `createStringValidator`, `createNumberValidator`, `createDateValidator`, `createCheckboxValidator`, `createArrayValidator` for configurable, reusable, multi-rule validators; the 8 built-in validators above are themselves implemented on top of this toolkit, so both layers share one validation engine
- **Standard Schema resolver** — Zod v4, Valibot, Arktype
- **Async-first validation** — generation-guarded, abortable, debounced
- **List helpers** — `insertListItem`, `removeListItem`, `replaceListItem`, `reorderListItem`
- **Named forms** — global registry + `createFormActions`
- **`useField` / `injectField`** — standalone single-field hooks

### Built-in validators vs. the field-validator toolkit

`isNotEmpty`, `isEmail`, `matches`, `isInRange`, `hasLength`, `isJSONString`, and `isNotEmptyHTML`
are small, ready-to-use `ValidationRule`s for the most common single-field checks. Internally,
each one delegates its pass/fail logic to the matching `create*Validator` factory from the
field-validator toolkit (e.g. `isEmail` is `createStringValidator({ allowedCharacters: 'custom',
customPattern: EMAIL_REGEX })` under the hood) — they just keep the simpler
`(value, error?) => ValidationRule` shape instead of a config object, and always return the
single `error` value you pass in regardless of which internal check failed.

Reach for the toolkit directly — via `createStringValidator`, `createNumberValidator`,
`createDateValidator`, `createCheckboxValidator`, `createArrayValidator`, and
`toValidationRule` to adapt the result into a `validate` rule — when you need more than one
rule on a field (e.g. `minLength` + `allowedCharacters` + `forbiddenWords` together), custom
per-check error messages, or a validator you intend to reuse across many fields/forms:

```typescript
import { useForm, createStringValidator, toValidationRule } from '@headlesskit/forms-react';

const usernameValidator = createStringValidator({
  minLength: 3,
  maxLength: 20,
  allowedCharacters: 'alphanumeric',
  messages: { minLength: '{fieldName} must be at least 3 characters' },
});

const form = useForm({
  initialValues: { username: '' },
  validate: { username: toValidationRule(usernameValidator, 'Username') },
});
```

`matchesField` is the one built-in validator left as-is — it compares two fields against each
other, which needs the whole form's `values`, outside what a single-field `create*Validator`
can see.

## Development

```bash
# Install dependencies
pnpm install

# Run all tests with coverage
pnpm test

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run the React example
pnpm --filter @headlesskit/example-react dev
```

## Coverage Thresholds

| Package | Lines | Functions | Branches | Statements |
|---------|-------|-----------|----------|------------|
| core | 95% | 95% | 90% | 95% |
| react | 95% | 95% | 90% | 95% |
| angular | 90% | 90% | 85% | 90% |

## License

MIT
