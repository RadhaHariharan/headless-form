# @headlesskit/forms-react

React wrapper for headlesskit — `useSyncExternalStore`-based hooks for the
`@headlesskit/forms` engine.

## Install

```bash
npm install @headlesskit/forms-react
# or
pnpm add @headlesskit/forms-react
# or
yarn add @headlesskit/forms-react
```

Requires `react` `>=18` as a peer dependency.

## Why this exists

`@headlesskit/forms-react` bridges the framework-agnostic `@headlesskit/forms` store to
React's rendering model. It adds no form logic of its own — it wraps `createFormStore` with
`useSyncExternalStore`, so the entire state engine (validation, dirty/touched tracking, list
helpers, async validation) is identical to core; only the binding to React's render cycle is
new.

Key features:

- **`useForm`** — the primary hook, accepts the exact same options as `createFormStore`. It
  defaults `mode` to `'uncontrolled'` (zero re-renders on typing) and types errors as
  `ReactNode` by default, so you can return JSX directly from a validator.
- **`useField`** — a standalone single-field hook (internally a one-field form) for composable,
  independently-testable input components that don't need a full surrounding form.
- **`createFormContext`** — a typed React Context factory that returns a matched
  `FormProvider` / `useFormContext` / `useForm` triple, for sharing one form instance across a
  component tree without prop-drilling (e.g. multi-step forms).
- **Single import surface** — every validator, field-validator factory, type, and utility from
  `@headlesskit/forms` is re-exported here, so you only ever import from this package in a
  React app.
- **SSR-safe** — `useForm`/`useField` pass a `getServerSnapshot` to `useSyncExternalStore`, so
  they render safely during SSR/RSC.

## Quick start

```tsx
import { useForm, isEmail, isNotEmpty } from '@headlesskit/forms-react';

function ContactForm() {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { name: '', email: '' },
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Invalid email'),
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    console.log(values);
  });

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name</label>
        <input
          key={form.key('name')}
          {...form.getInputProps('name')}
          placeholder="Your name"
        />
        {form.errors.name && <span style={{ color: 'red' }}>{form.errors.name}</span>}
      </div>

      <div>
        <label>Email</label>
        <input
          key={form.key('email')}
          {...form.getInputProps('email')}
          type="email"
          placeholder="your@email.com"
        />
        {form.errors.email && <span style={{ color: 'red' }}>{form.errors.email}</span>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

Because `useForm` defaults to `mode: 'uncontrolled'`, always pair an input with
`key={form.key(path)}` so that programmatic updates (`setFieldValue`, `reset`, `initialize`)
correctly remount and re-apply `defaultValue`.

## Documentation

In-depth docs live in [`docs/forms-react`](../../docs/forms-react/01-use-form.mdx):

- [useForm](../../docs/forms-react/01-use-form.mdx) — signature, defaults, return type, common pitfalls
- [useField](../../docs/forms-react/02-use-field.mdx) — standalone field hook
- [Form Context](../../docs/forms-react/03-form-context.mdx) — `createFormContext` for shared/multi-step forms

Since this package re-exports the full core API, the underlying engine concepts — uncontrolled
mode, nested fields, validators, field-validators, schema validation, list helpers — are
documented in [`docs/forms`](../../docs/forms/01-getting-started.mdx):

- [Uncontrolled Mode](../../docs/forms/02-uncontrolled-mode.mdx)
- [Nested Fields](../../docs/forms/09-nested-fields.mdx)
- [Validators](../../docs/forms/08-validators.mdx)
- [Field Validators (build your own)](../../docs/forms/14-field-validators.mdx)
- [Schema Validation](../../docs/forms/07-schema-validation.mdx)
- [Recipes](../../docs/forms/12-recipes.mdx)

## License

MIT — see [LICENSE](../../LICENSE) for details.
