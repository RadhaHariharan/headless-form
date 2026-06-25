# @headlesskit/forms-react-native

React Native bindings for headlesskit — prop adapters that bridge `@headlesskit/forms-react`'s
hooks to React Native's component conventions.

## Install

```bash
npm install @headlesskit/forms-react-native
# or
pnpm add @headlesskit/forms-react-native
# or
yarn add @headlesskit/forms-react-native
```

Only `react` (`>=18`) is a peer dependency — **not** `react-native`. This package depends on
`@headlesskit/forms-react` (a regular dependency, not a peer), and never imports anything from
`react-native` itself: the prop adapters just return plain object literals shaped to match
`TextInputProps`/`SwitchProps`, so there's nothing react-native-specific to install beyond
React.

## Why this exists

`useForm` and `useField` already run unchanged in React Native, because `useSyncExternalStore`
lives in `react` itself, not `react-dom`. What doesn't carry over is `getInputProps()`'s shape:
it's modeled on HTML `<input>` (`onChange` reading `event.target.value`, a `data-path`
attribute, `checked`/`defaultChecked`). React Native has no `event.target`, and `<Switch>` has
no uncontrolled mode at all. This package is a thin set of adapter functions that bridge that
one gap — nothing about the form engine itself changes.

Key features:

- **`getTextInputProps(form, path, options?)`** — spread directly onto a `<TextInput>`;
  exposes `onChangeText` with the typed string, no `event` parameter.
- **`getFieldTextInputProps(field)`** — same adapter, for a `useField()` result.
- **`getSwitchProps(form, path)`** / **`getFieldSwitchProps(field)`** — spread onto a
  `<Switch>`, which is always controlled (`onValueChange`, `value`).
- **`getSubmitHandler(form, onValid, onInvalid?)`** — wires a form to `<Button onPress>` /
  `<Pressable onPress>`; the returned handler takes zero arguments, unlike the web's
  `form.onSubmit(...)`, which expects a DOM `FormEvent`.
- **Re-exports everything from `@headlesskit/forms-react`** — `useForm`, `useField`,
  `createFormContext`, every validator and type — so a React Native project only needs this
  one import.

## Quick start

```tsx
import { useForm, getTextInputProps, getSubmitHandler } from '@headlesskit/forms-react-native';
import { isEmail, isNotEmpty } from '@headlesskit/forms-react-native';
import { View, Text, TextInput, Button } from 'react-native';

function ContactForm() {
  const form = useForm({
    mode: 'uncontrolled', // the default
    initialValues: { name: '', email: '' },
    validate: {
      name: isNotEmpty('Name is required'),
      email: isEmail('Invalid email'),
    },
  });

  const { error: nameError, ...nameProps } = getTextInputProps(form, 'name');
  const { error: emailError, ...emailProps } = getTextInputProps(form, 'email');

  return (
    <View>
      <Text>Name</Text>
      <TextInput key={form.key('name')} {...nameProps} />
      {nameError && <Text style={{ color: 'red' }}>{nameError}</Text>}

      <Text>Email</Text>
      <TextInput key={form.key('email')} {...emailProps} />
      {emailError && <Text style={{ color: 'red' }}>{emailError}</Text>}

      <Button
        title="Submit"
        onPress={getSubmitHandler(form, (values) => console.log(values))}
      />
    </View>
  );
}
```

As in the web package, keep `key={form.key(path)}` on each input — in `'uncontrolled'` mode,
React only reads `defaultValue` once on mount, so programmatic changes (`setFieldValue`,
`reset()`) need the key bump to force a remount and pick up the new value. This is a React
mounting rule, not a web-specific one, so it applies identically to `<TextInput>`.

## Documentation

In-depth docs live in
[`docs/forms-react-native`](../../docs/forms-react-native/01-getting-started.mdx):

- [Getting Started](../../docs/forms-react-native/01-getting-started.mdx) — why this package exists, what it adds on top of `forms-react`
- [getTextInputProps](../../docs/forms-react-native/02-get-text-input-props.mdx)
- [getFieldTextInputProps](../../docs/forms-react-native/03-get-field-text-input-props.mdx)
- [getSwitchProps](../../docs/forms-react-native/04-get-switch-props.mdx)
- [getFieldSwitchProps](../../docs/forms-react-native/05-get-field-switch-props.mdx)
- [getSubmitHandler](../../docs/forms-react-native/06-get-submit-handler.mdx)
- [Full Example](../../docs/forms-react-native/07-full-example.mdx) — a complete registration form using every adapter

Since this package re-exports the full `forms-react` and `forms` APIs, see also
[`docs/forms-react`](../../docs/forms-react/01-use-form.mdx) (`useForm`, `useField`,
`createFormContext`) and [`docs/forms`](../../docs/forms/01-getting-started.mdx) (validators,
uncontrolled mode, nested fields, schema validation).

## License

MIT — see [LICENSE](../../LICENSE) for details.
