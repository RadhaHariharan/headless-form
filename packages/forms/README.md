# @headlesskit/forms

Framework-agnostic form state engine — zero runtime dependencies.

## Install

```bash
npm install @headlesskit/forms
# or
pnpm add @headlesskit/forms
# or
yarn add @headlesskit/forms
```

## Why this exists

`@headlesskit/forms` is the core engine behind the `headlesskit` form packages. It implements
form state, validation, and input-binding logic with **no framework and no dependencies at
all** — you can use it in a vanilla DOM app, on the server, or as the foundation for a
framework wrapper (which is exactly what `@headlesskit/forms-react` and
`@headlesskit/forms-react-native` do).

Key features:

- **Zero dependencies** — pure TypeScript, ships its own types.
- **Controlled and uncontrolled modes** — uncontrolled mode causes zero re-renders on typing,
  which matters a lot in large forms.
- **Deep path typing** — `form.getInputProps('user.address.city')` is fully typed, including
  through arrays (`'fruits.1.name'`).
- **Built-in validators** — `isNotEmpty`, `isEmail`, `matches`, `matchesField`, `isInRange`,
  `hasLength`, `isJSONString`, `isNotEmptyHTML`.
- **Field-validator toolkit** — `createStringValidator`, `createNumberValidator`,
  `createArrayValidator`, `createCheckboxValidator`, `createDateValidator`: configurable,
  standalone factories that return human-readable messages and work with or without a form
  store, bridged into the `validate` object via `toValidationRule`.
- **Standard Schema resolver** (`schemaResolver`) — validate with Zod v4, Valibot, Arktype, or
  any Standard Schema-compliant library.
- **Async-first validation** — generation-guarded, abortable with `AbortSignal`, debounced.
- **List helpers** — `insertListItem`, `removeListItem`, `replaceListItem`, `reorderListItem`
  for dynamic array fields.
- **Named forms** — a global registry plus `createFormActions` for controlling form state from
  outside the component/closure that created it.

## Quick start

```typescript
import { createFormStore, isEmail, isNotEmpty } from '@headlesskit/forms';

const form = createFormStore({
  mode: 'uncontrolled',
  initialValues: { name: '', email: '' },
  validate: {
    name: isNotEmpty('Name is required'),
    email: isEmail('Invalid email'),
  },
});

// Subscribe to state changes (errors, touched, dirty, etc.)
const unsubscribe = form.subscribe(() => {
  renderUI(form.getSnapshot());
});

// Wire up inputs manually
const nameInput = document.querySelector('#name') as HTMLInputElement;
Object.assign(nameInput, form.getInputProps('name'));

// Submit
document.querySelector('form')!.addEventListener(
  'submit',
  form.onSubmit((values) => console.log(values)),
);
```

For React or React Native, use `@headlesskit/forms-react` or
`@headlesskit/forms-react-native` instead — they re-export everything in this package plus
hooks (`useForm`, `useField`) built on top of `createFormStore`.

## Documentation

In-depth docs live in [`docs/forms`](../../docs/forms/01-getting-started.mdx):

- [Getting Started](../../docs/forms/01-getting-started.mdx)
- [Uncontrolled Mode](../../docs/forms/02-uncontrolled-mode.mdx)
- [Form Values](../../docs/forms/03-form-values.mdx)
- [getInputProps](../../docs/forms/04-get-input-props.mdx)
- [Form Errors](../../docs/forms/05-form-errors.mdx)
- [Form Validation](../../docs/forms/06-form-validation.mdx)
- [Schema Validation](../../docs/forms/07-schema-validation.mdx)
- [Validators](../../docs/forms/08-validators.mdx)
- [Nested Fields](../../docs/forms/09-nested-fields.mdx)
- [Form Status](../../docs/forms/10-form-status.mdx)
- [Form Actions](../../docs/forms/11-form-actions.mdx)
- [Recipes](../../docs/forms/12-recipes.mdx)
- [All Inputs](../../docs/forms/13-all-inputs.mdx)
- [Field Validators (build your own)](../../docs/forms/14-field-validators.mdx)
- [Large Forms](../../docs/forms/15-large-forms.mdx)
- [Advanced Nested Validation](../../docs/forms/16-advanced-nested-validation.mdx)
- Reference: [store/](../../docs/forms/store/), [types/](../../docs/forms/types/),
  [validators/](../../docs/forms/validators/), [field-validators/](../../docs/forms/field-validators/),
  [resolvers/](../../docs/forms/resolvers/), [utils/](../../docs/forms/utils/)

## License

MIT — see [LICENSE](../../LICENSE) for details.
