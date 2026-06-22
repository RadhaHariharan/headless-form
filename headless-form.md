# CLAUDE.md — headless-form Implementation Guide

> **Read this entire file before writing a single line of code.**
> This file is the canonical specification for `headless-form`. Every architectural
> decision, naming convention, type signature, JSDoc requirement, example, and test
> requirement is defined here. Deviate from it only with an explicit comment explaining why.
>
> **Parity bar:** `headless-form` must be a **100% feature match** of `@mantine/form` v9 —
> every option, every return member, every validator, and every documented behaviour. The
> API surface in §4 is taken verbatim from Mantine's current source
> (`packages/@mantine/form/src/use-form.ts` and `types.ts`). Treat any divergence as a bug.

---

## 1. Project Identity

**Package name:** `headless-form`
**Scope:** `@headless-form/core` + `@headless-form/react` + `@headless-form/angular`
**Mission:** A framework-agnostic form state engine (core) written in **plain TypeScript**,
with two first-class framework wrappers — **React** and **Angular** — each feature-complete
with `@mantine/form` v9, at the same code-quality level. Core has zero runtime dependencies;
each wrapper has only its framework as a peer dependency.

The three packages expose the **same conceptual API and the same feature set**. Where a
framework forces an idiomatic difference (hooks in React, signals + a directive in Angular),
the *behaviour* must remain identical and the *naming* must stay as close as the framework
allows. A feature that works in one wrapper but not the other is **not done** (§3.6).

**Source of truth for features:** https://mantine.dev/form/package/ (all sub-pages)
**Source of truth for source structure:** https://github.com/mantinedev/mantine/tree/master/packages/@mantine/form/src

> ⚠️ Clean-room implementation. Study Mantine's *public behaviour and docs*, never copy its
> source. See §14.

---

## 2. Repository Layout

```
headless-form/                          ← monorepo root
├── CLAUDE.md                           ← THIS FILE — read before anything else
├── README.md                           ← User-facing root readme
├── LICENSE                             ← MIT
├── CONTRIBUTING.md                     ← contribution guide
├── CODE_OF_CONDUCT.md
├── package.json                        ← Root (workspaces + shared devDeps)
├── pnpm-workspace.yaml
├── turbo.json                          ← Turborepo pipeline
├── tsconfig.base.json                  ← Shared TS config
├── .eslintrc.cjs                       ← Shared ESLint config (incl. eslint-plugin-jsdoc)
├── .prettierrc
├── .size-limit.json                    ← bundle-size budgets (see §9.4)
├── vitest.workspace.ts                 ← Shared Vitest workspace
├── scripts/
│   └── build-all.ts                   ← build orchestration (tsup for core/react, ng-packagr for angular)
├── .github/
│   └── workflows/
│       ├── ci.yml                      ← lint + type-check + test + build + size + examples
│       └── release.yml                 ← changesets release flow
├── docs/
│   ├── 01-getting-started.md
│   ├── 02-use-form.md
│   ├── 03-use-field.md
│   ├── 04-uncontrolled-mode.md
│   ├── 05-form-values.md
│   ├── 06-get-input-props.md
│   ├── 07-form-errors.md
│   ├── 08-form-validation.md
│   ├── 09-schema-validation.md
│   ├── 10-form-validators.md
│   ├── 11-nested-fields.md
│   ├── 12-form-status.md
│   ├── 13-form-context.md
│   ├── 14-form-actions.md
│   ├── 15-watch-and-side-effects.md
│   ├── 16-recipes.md
│   ├── 17-migration-from-mantine.md
│   ├── 18-angular-guide.md             ← Angular usage (signals + [hfField] directive)
│   ├── 19-vanilla-core-guide.md        ← Using @headless-form/core with no framework
│   └── 20-ssr.md                       ← SSR / hydration (Next.js, Angular Universal)
├── examples/                           ← RUNNABLE example apps (see §17 — MANDATORY)
│   ├── vanilla/                        ← plain JS/TS, no framework, uses @headless-form/core directly
│   ├── react/                          ← exhaustive React samples (controlled, uncontrolled, re-render demos)
│   └── angular/                        ← exhaustive Angular samples (mirror of react)
└── packages/
    ├── core/                           ← @headless-form/core
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsup.config.ts
    │   └── src/
    │       ├── index.ts                ← barrel — all public exports
    │       ├── types/
    │       │   ├── index.ts
    │       │   ├── form.types.ts       ← UseFormOptions, FormState, FormMode, TransformedValues
    │       │   ├── path.types.ts       ← DeepKeys, DeepValue, PathValue generics
    │       │   ├── input-props.types.ts← GetInputPropsOptions, GetInputPropsResult, GetInputProps
    │       │   ├── validation.types.ts ← ValidationRule, FormRulesRecord, FormValidateInput, FormErrors, FormError
    │       │   ├── watch.types.ts       ← WatchPayload, WatchHandler
    │       │   └── store.types.ts      ← FormStoreApi, FormStoreState, Subscriber
    │       ├── store/
    │       │   ├── index.ts
    │       │   ├── create-form-store.ts     ← THE core engine (no framework)
    │       │   ├── field-keys.ts            ← per-path key counter (the uncontrolled remount trick)
    │       │   ├── watch-registry.ts        ← per-path watch subscribers + cascadeUpdates
    │       │   └── form-store-registry.ts   ← named form registry (for actions)
    │       ├── utils/
    │       │   ├── index.ts
    │       │   ├── get-path.ts         ← getPath(obj, 'user.0.name')
    │       │   ├── set-path.ts         ← setPath(obj, 'user.0.name', val)
    │       │   ├── get-data-path.ts    ← data-path attribute builder (name + path)
    │       │   ├── clone.ts            ← structuredClone polyfill wrapper
    │       │   ├── deep-equal.ts       ← deep equality for dirty checking
    │       │   ├── get-input-on-change.ts ← normalize event | checked | raw value → value
    │       │   ├── should-validate-on-change.ts ← boolean | path[] matcher
    │       │   ├── list-handlers.ts    ← insert/remove/replace/reorder helpers
    │       │   └── path-to-array.ts    ← 'a.0.b' → ['a','0','b']
    │       ├── validators/
    │       │   ├── index.ts
    │       │   ├── is-not-empty.ts
    │       │   ├── is-email.ts
    │       │   ├── matches.ts
    │       │   ├── matches-field.ts
    │       │   ├── is-in-range.ts
    │       │   ├── has-length.ts
    │       │   ├── is-json-string.ts
    │       │   └── is-not-empty-html.ts
    │       └── resolvers/
    │           ├── index.ts
    │           ├── schema-resolver.ts  ← Standard Schema adapter (Zod/Valibot/Arktype/…)
    │           └── legacy/             ← optional drop-in resolver shims (zod/yup/valibot/joi/superstruct)
    ├── react/                          ← @headless-form/react
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsup.config.ts
    │   └── src/
    │       ├── index.ts                ← barrel
    │       ├── hooks/
    │       │   ├── use-form.ts         ← main React hook (3 typed overloads)
    │       │   └── use-field.ts        ← scoped single-field hook
    │       └── context/
    │           └── create-form-context.ts  ← createFormContext factory
    └── angular/                        ← @headless-form/angular
        ├── package.json
        ├── tsconfig.json
        ├── tsconfig.lib.json
        ├── ng-package.json             ← ng-packagr (Angular Package Format)
        └── src/
            ├── public-api.ts           ← barrel (Angular convention)
            ├── inject-form.ts          ← injectForm(options) → signals-based FormApi
            ├── inject-field.ts         ← injectField(options) → standalone single field
            ├── form-field.directive.ts ← [hfField] directive — Angular equivalent of getInputProps
            ├── form-context.ts         ← provideForm() / injectFormContext()
            └── form-context.token.ts   ← InjectionToken<FormApi> for context wiring
```

---

## 3. Core Design Principles

### 3.1 Zero Dependencies in Core
`@headless-form/core` must have **zero** `dependencies` and **zero** `peerDependencies`.
Pure TypeScript that compiles to ESM + CJS.

### 3.2 Framework Isolation
The core exports a `createFormStore(options)` factory: a plain object with methods and a
subscriber pattern. **No** React (`useState`/`useRef`/hooks), **no** Angular
(`signal`/`inject`/decorators), **no** `document`/`window` access at module top level —
nothing framework- or environment-specific inside core.

- **React** wrapper is the ONLY place importing from `react`.
- **Angular** wrapper is the ONLY place importing from `@angular/*`.

Both wrappers subscribe to the same core store and translate its notifications into their
reactivity model (React re-render / Angular change detection).

### 3.3 Mode parity (default = `'controlled'`)
To match Mantine exactly, the default is **`mode: 'controlled'`** (Mantine's literal default).
`mode: 'uncontrolled'` is the **recommended** mode for performance and the default used in all
example apps. Document both clearly; never silently diverge from Mantine's default behaviour.

- **controlled** — values live in framework-reactive state; the UI updates on every change.
- **uncontrolled** — values live in the store's internal ref; the UI updates only on
  errors / touched / dirty / validation changes, and on programmatic value changes via the
  field-key remount trick (§3.7). Typing into an input does **not** re-render the form.

The "when to update" logic lives **once in core**. Wrappers only decide *how* to react to a
"should update" signal — they must not re-implement the rules.

### 3.4 Type Safety at Every Layer
Strict generics everywhere. Path types infer deeply so an invalid path is a compile error.

```ts
form.setFieldValue('user.firstName', 'Jane'); // OK — typed as string
form.setFieldValue('user.nonExistent', 'x');  // COMPILE ERROR
```

`useForm` / `createFormStore` / `injectForm` are generic over `<Values, TransformedValues, Rules>`
exactly like Mantine, with the three overloads in §5.5.

### 3.5 Async-First, Abortable Validation
`validate()`, `validateField()`, and `isValid()` return `Promise<…>` or run synchronously
depending on whether the user's validator is async. The store tracks `validating: boolean`
and per-field `isValidating(path)`. Validation runs are **abortable** (an `AbortController`
per run/field) and **generation-guarded** so a stale async result never overwrites a newer
one — matching Mantine's behaviour. `validateDebounce` (ms) debounces field validation.

### 3.6 One Behaviour, Three Surfaces (Parity Principle)
For **every** feature in §4, the same behaviour must be reachable from plain JS
(`createFormStore`), React (`useForm`), and Angular (`injectForm`). Before marking a feature
done, confirm: a core test, a React example, and an Angular example all exist.

### 3.7 Subscription granularity & the field-key remount trick (CRITICAL)
This is how uncontrolled mode achieves ~0 re-renders; implement it precisely.

- **Values** are held in a single internal ref (`refValues`) in core.
- **Field keys:** core keeps a per-path counter. `form.key(path)` returns
  `` `${formKey}-${path}-${fieldKeys[path] ?? 0}` ``. `formKey` is bumped on `reset()`.
- **`getInputProps(...).onChange`** calls `setFieldValue(path, value, { forceUpdate: false })`.
  In uncontrolled mode `forceUpdate: false` means the field key is **not** bumped — the native
  input keeps its own DOM state (`defaultValue`), so typing causes **no remount and no form
  re-render**.
- **Programmatic** `setFieldValue` / `setValues` / `resetField` bump the affected field key(s)
  (unless `forceUpdate: false`), forcing the bound input to remount and pick up the new
  `defaultValue`/`defaultChecked`.
- **Errors / touched / dirty / validating / submitting** live in framework-observable state;
  changing them updates subscribers (re-render in React, signal write in Angular).
- **watch** notifies per-path subscribers on value change; `cascadeUpdates: true` also notifies
  ancestor paths (e.g. changing `a.b.c` notifies watchers on `a.b` and `a`).
- **React wrapper:** `useSyncExternalStore` for error/status slices; field keys surfaced via the
  store so `form.key(path)` is stable across renders.
- **Angular wrapper:** `computed`/`signal` for error/status slices; the `[hfField]` directive
  reads the value from the store and reconciles the control without forcing global CD.

### 3.8 Error type is generic (no React types in core)
Core defines `type FormError = unknown` by default and threads a `TError` generic through
`FormErrors<TError>`. The **React** wrapper defaults `TError = React.ReactNode`; the **Angular**
wrapper defaults `TError = unknown` (typically `string | TemplateRef<unknown>`). Core must never
reference `React.ReactNode`.

---

## 4. Feature Checklist (implement ALL — verbatim Mantine v9 parity)

> Sourced from `@mantine/form` `use-form.ts` / `types.ts` on `master`. Defaults shown in `()`.

### 4.1 `useForm` / `createFormStore` / `injectForm` Options (`UseFormOptions`)
Reference: https://mantine.dev/form/use-form/
- [ ] `name` — registers the form in the global registry for `createFormActions`
- [ ] `mode: 'controlled' | 'uncontrolled'` (default `'controlled'`)
- [ ] `initialValues`
- [ ] `initialErrors` (default `{}`)
- [ ] `initialDirty` (default `{}`)
- [ ] `initialTouched` (default `{}`)
- [ ] `clearInputErrorOnChange` (default `true`)
- [ ] `validateInputOnChange: boolean | Path[]` (default `false`) — all fields, or a path list
- [ ] `validateInputOnBlur: boolean | Path[]` (default `false`) — all fields, or a path list
- [ ] `onValuesChange(values, previous)` — called on every value change (replaces value-watching `useEffect`)
- [ ] `transformValues(values)` — transform before submit / on `getTransformedValues`
- [ ] `enhanceGetInputProps(payload)` — globally augment `getInputProps` output;
      payload = `{ inputProps, field, options, form }`
- [ ] `validate` — `FormRulesRecord<Values>` (per-field rules object) **or** `(values) => FormErrors`
- [ ] `onSubmitPreventDefault: 'always' | 'never' | 'validation-failed'` (default `'always'`)
- [ ] `touchTrigger: 'change' | 'focus'` (default `'change'`)
- [ ] `cascadeUpdates` (default `false`) — value change notifies ancestor watch subscribers
- [ ] `validateDebounce` (default `0`) — ms to debounce per-field validation
- [ ] `resolveValidationError(error) => FormError` (default: `Error.message` or `String(error)`)

### 4.2 Return Value (`FormStoreApi` / `UseFormReturnType` / `FormApi`)
Every member below must exist on all three surfaces. (React names match exactly; Angular
exposes read state as Signals — see §4.13.)

**Values**
- [ ] `values` — reactive in controlled mode; **snapshot/ref** in uncontrolled (read via `getValues`)
- [ ] `getValues()` — always returns the latest values (both modes)
- [ ] `getInitialValues()` — current initial-values snapshot
- [ ] `setInitialValues(values)` — update the initial-values reference (no value change)
- [ ] `initialize(values)` — set values **and** initial values once (idempotent); flips `initialized`
- [ ] `initialized` — `boolean`, true after `initialize` has run
- [ ] `setValues(values | (current) => values)` — shallow-merge payload into current values
- [ ] `setFieldValue(path, value | (current) => value, options?)` — `options.forceUpdate?: boolean`
- [ ] `resetField(path)` — reset one field to its initial value, clear its error/touched/dirty
- [ ] `reset()` — reset values to initial, clear errors/touched/dirty/validating; bump `formKey`

**Errors**
Reference: https://mantine.dev/form/errors/
- [ ] `errors` — `FormErrors<TError>` record keyed by path
- [ ] `setErrors(errors)`
- [ ] `setFieldError(path, error)`
- [ ] `clearErrors()`
- [ ] `clearFieldError(path)`

**Status (touched & dirty)**
Reference: https://mantine.dev/form/status/
- [ ] `isTouched(path?)`
- [ ] `isDirty(path?)`
- [ ] `setTouched(record)`
- [ ] `setDirty(record)`
- [ ] `getTouched()` — full touched record
- [ ] `getDirty()` — full dirty record
- [ ] `resetTouched()`
- [ ] `resetDirty(values?)` — clear dirty, optionally update the comparison snapshot

**Lists (nested arrays)**
Reference: https://mantine.dev/form/nested/
- [ ] `insertListItem(path, item, index?)`
- [ ] `removeListItem(path, index)`
- [ ] `replaceListItem(path, index, item)`
- [ ] `reorderListItem(path, { from, to })`
- [ ] Dot-notation paths: `'user.firstName'`, `'users.0.name'`, `'a.b.0.c'`

**Validation**
Reference: https://mantine.dev/form/validation/
- [ ] `validate()` → `{ hasErrors, errors }` (sync) or `Promise<{ hasErrors, errors }>` (async)
- [ ] `validateField(path)` → `{ hasError, error }` (sync) or `Promise<…>`
- [ ] `isValid(path?)` → `boolean` or `Promise<boolean>` — never mutates errors
- [ ] `validating` — `boolean`
- [ ] `isValidating(path)` — `boolean`

**Submit / reset handlers**
- [ ] `onSubmit(onValid, onInvalid?)` → submit handler `(event) => void`;
      `onValid(transformedValues, event)`, `onInvalid(errors, values, event)`
- [ ] `onReset(event)` — preventDefault + `reset()`
- [ ] `submitting` — `boolean`, auto-true while an async `onSubmit` handler is pending
- [ ] `setSubmitting(value)`

**Input props / DOM**
Reference: https://mantine.dev/form/get-input-props/
- [ ] `getInputProps(path, options?)` — see §4.6
- [ ] `getInputNode(path)` — returns the DOM node for a path via its `data-path` attribute
      (used for scroll-to-error); returns `null` on the server (SSR-safe)

**Transform**
Reference: https://mantine.dev/form/values/
- [ ] `getTransformedValues(values?)` — apply `transformValues`; uses current values if omitted
- [ ] `TransformedValues<typeof form>` type helper

**Watch / side effects**
- [ ] `watch(path, handler)` — subscribe to a field; handler receives
      `{ previousValue, value, touched, dirty }`; returns an unsubscribe function

**Meta**
- [ ] `key(path)` — stable string key for forcing remounts (§3.7)

### 4.6 getInputProps (exact behaviour)
Options: `{ type, withError, withFocus, ...rest }`
- [ ] `type: 'input' | 'checkbox' | 'radio'` (default `'input'`)
- [ ] `withError` (default `true`) — include `error` in the result
- [ ] `withFocus` (default `type !== 'radio'`) — include `onFocus`/`onBlur`
- [ ] For `'radio'`, pass `value` in options; result sets `checked`/`defaultChecked` by equality and echoes `value`
- [ ] Result always includes `onChange` and a `data-path` attribute
- [ ] **controlled** result uses `value` / `checked`; **uncontrolled** result uses `defaultValue` / `defaultChecked`
- [ ] `onFocus` marks the field touched
- [ ] `onBlur` triggers validation when `validateInputOnBlur` (or its path list) matches
- [ ] `onChange` normalizes event objects, checkbox `checked`, and raw values (`getInputOnChange`)
- [ ] `enhanceGetInputProps` output is merged onto the result
- [ ] Angular equivalent: the `[hfField]` directive (§4.13) — same semantics, no `getInputProps` spread

### 4.9 Form Context
Reference: https://mantine.dev/form/create-form-context/
- [ ] **React:** `createFormContext<Values>()` → `[FormProvider, useFormContext, useForm]`
- [ ] **React:** `useFormContext()` outside a provider throws a descriptive error
- [ ] **React:** nested providers work independently
- [ ] **Angular:** `provideForm(options)` provider fn + `injectFormContext<Values>()` via `InjectionToken`
- [ ] **Angular:** `injectFormContext()` with no provider throws a descriptive error

### 4.10 Form Actions (Named Forms)
Reference: https://mantine.dev/form/actions/
- [ ] `name` option registers the form in a global registry (lives in core)
- [ ] `createFormActions<Values>(name)` → object mirroring all mutating methods
      (`setFieldValue`, `setValues`, `setErrors`, `setFieldError`, `clearErrors`,
      `clearFieldError`, `reset`, `validate`, `validateField`, `setValues`, `insertListItem`,
      `removeListItem`, `reorderListItem`, `replaceListItem`, `setDirty`, `setTouched`,
      `resetDirty`, `resetTouched`, `setSubmitting`)
- [ ] Form name validation: only `[a-zA-Z0-9-]`; invalid names throw in dev
- [ ] Multiple forms with the same name all receive the action call

### 4.11 use-field / inject-field
Reference: https://mantine.dev/form/use-field/
- [ ] **React:** `useField(options)`; **Angular:** `injectField(options)`
- [ ] Options: `initialValue`, `validate`, `validateOnChange`, `validateOnBlur`,
      `resolveValidationError`, `type`, `mode`
- [ ] Returns: `{ key, getValue, setValue, reset, getInputProps, error, validate, isValidating,
      isDirty, isTouched, setError, clearError }`

### 4.12 Built-in Validators (the exact Mantine set)
Reference: https://mantine.dev/form/validators/
- [ ] `isNotEmpty(error?)` — empty string (trimmed), empty array, `false`, `null`, `undefined` are empty
- [ ] `isEmail(error?)` — Mantine's email regexp
- [ ] `matches(regexp, error?)`
- [ ] `matchesField(otherFieldPath, error?)` — equals another field's value (primitives only) — e.g. confirm password
- [ ] `isInRange({ min?, max? }, error?)` — numeric range; non-numbers fail
- [ ] `hasLength(lengthSpec, error?)` — `number` (exact) or `{ min?, max? }`; strings trimmed; works on arrays
- [ ] `isJSONString(error?)` — valid JSON string
- [ ] `isNotEmptyHTML(error?)` — non-empty HTML (tags/whitespace-only counts as empty)
- [ ] Every validator's last arg (error) is optional; if omitted → invalid state with no message
- [ ] **Note:** `isUrl` and `isOneOf` are NOT Mantine validators. Do not include them in the parity
      set. If desired, ship them under a clearly separated `extras` entry point, never implying parity.

### 4.13 Angular Wrapper API (parity surface)
Behaviour: all of §4.1–§4.12, expressed Angular-idiomatically.
- [ ] `injectForm<Values>(options)` — call in an injection context; returns `FormApi<Values>`
- [ ] Read state as **Signals**: `values`, `errors`, `touched`, `dirty`, `validating`,
      `submitting`, `initialized` are `Signal<…>` (or `computed`)
- [ ] Mutators are plain methods, identically named to core/React
- [ ] `watch(path, handler)` works (backed by an `effect` or the store's watch registry)
- [ ] `[hfField]` attribute directive = Angular equivalent of `getInputProps`:
      `<input [hfField]="form" path="user.firstName" />`
- [ ] `[hfField]` supports `type="checkbox"`/`type="radio"`/`type="number"` coercion, blur/focus
      touch tracking, error wiring, and writes a `data-path` attribute (so `getInputNode` works)
- [ ] `injectField(options)` — standalone single-field signals API
- [ ] `provideForm` / `injectFormContext` — DI-based context (parity with `createFormContext`)
- [ ] Works under `ChangeDetectionStrategy.OnPush` and in **zoneless** apps (no `zone.js` reliance)

---

## 5. TypeScript Requirements

### 5.1 tsconfig.base.json (MANDATORY)
```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "bundler",
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "skipLibCheck": false
  }
}
```
The Angular package's `tsconfig.lib.json` extends this and adds only what Angular requires;
keep `strict` and the safety flags intact. Prefer standalone, decorator-light APIs.

### 5.2 Path Type System
Recursive path inference in `core/src/types/path.types.ts`:
```ts
type DeepKeys<T> = ...                              // all dot-notation keys
type DeepValue<T, K extends DeepKeys<T>> = ...       // value at a deep key
setFieldValue<K extends DeepKeys<Values>>(path: K, value: DeepValue<Values, K> | ((cur: DeepValue<Values, K>) => DeepValue<Values, K>), options?: SetFieldValueOptions): void
```

### 5.3 No `any`
Zero `any`. Use `unknown` + guards for external data (schema output, thrown errors).
`@typescript-eslint/no-explicit-any: error` must pass.

### 5.4 Exported Type Completeness
Every public type is exported from the package barrel. Users never `import type` from a deep path.

### 5.5 Generic signature & overloads (match Mantine exactly)
`useForm` / `createFormStore` / `injectForm` are generic over
`<Values, TransformedValues = Values, Rules = …>` with three overloads:
1. `validate` is a function `(values) => R` → return type carries `R`.
2. `validate` is a `FormRulesRecord<Values>` → return type carries the rules type.
3. no `validate` → return type carries `undefined`.

Return type: `UseFormReturnType<Values, TransformedValues, Rules>` (React) /
`FormApi<Values, TransformedValues, Rules>` (Angular), both derived from the core
`FormStoreApi<Values, TransformedValues, Rules>` (§5.6). Export the `TransformedValues<Form>`
helper.

### 5.6 Shared generic core
React's `UseFormReturnType` and Angular's `FormApi` derive from the **same** core
`FormStoreApi`, so adding a member to core surfaces a compile gap in both wrappers.

---

## 6. JSDoc / API Documentation Standards (IN-DEPTH — NON-NEGOTIABLE)

> Documentation is part of the public API. A type without JSDoc is an incomplete type.
> Enforced by `eslint-plugin-jsdoc` (§7) and reviewed manually.

### 6.1 What must be documented
Every one of these gets its own JSDoc block:
1. Every exported function/method (including each overload).
2. Every exported type alias and interface.
3. **Every property/key** of every exported interface/object-type — *individually*. A 17-key
   options interface has 17 JSDoc blocks plus one on the interface.
4. Every generic type parameter (`@typeParam`).
5. Every function parameter (`@param`) and return value (`@returns`).
6. Every public class field, getter, setter, and Angular directive `@Input()`.
7. Every enum and each enum member.
8. Every exported constant/symbol (e.g. `formRootRule`).

### 6.2 Required tags (use whichever apply, in this order)
`@remarks`, `@typeParam`, `@param`, `@returns`, `@defaultValue`, `@throws`, `@example`
(must compile), `@see` (link the equivalent Mantine page), `@deprecated` (name the replacement).

### 6.3 Cross-framework docs
Core type carries the neutral description; each wrapper adds an `@example` in its own idiom
(a hook for React; `injectForm` + `[hfField]` for Angular). Descriptions must not contradict.

### 6.4 Gold-standard example (match this depth everywhere)
```ts
/**
 * Options accepted by {@link createFormStore}, {@link useForm} and {@link injectForm}.
 *
 * @typeParam Values - Shape of the form's values; drives every path-typed method via {@link DeepKeys}.
 * @typeParam TransformedValues - Output of {@link UseFormOptions.transformValues}; defaults to `Values`.
 *
 * @see https://mantine.dev/form/use-form/
 *
 * @example
 * ```ts
 * const form = useForm<{ email: string }>({
 *   mode: 'uncontrolled',
 *   initialValues: { email: '' },
 *   validate: { email: isEmail('Invalid email') },
 * });
 * ```
 */
export interface UseFormOptions<Values, TransformedValues = Values> {
  /**
   * Controls how value changes propagate to the UI.
   *
   * @remarks
   * - `'uncontrolled'` keeps values in an internal ref; the UI updates only when errors,
   *   touched, dirty or validation state change. Best performance; recommended.
   * - `'controlled'` keeps values in framework-reactive state; the UI updates on every change.
   * @defaultValue `'controlled'`
   */
  mode?: FormMode;

  /**
   * Called on every value change with the new and previous values. Use instead of a
   * value-watching effect (in uncontrolled mode `values` is a stable ref and won't trigger effects).
   *
   * @param values - Current values after the change.
   * @param previous - Values immediately before the change.
   * @see https://mantine.dev/form/values/
   */
  onValuesChange?: (values: Values, previous: Values) => void;

  /**
   * Debounce, in milliseconds, applied to per-field validation triggered by change/blur.
   * @defaultValue `0`
   */
  validateDebounce?: number;
}
```
"Self-explanatory" is not an exemption.

---

## 7. ESLint Configuration
`@typescript-eslint` + `eslint-plugin-import` + `eslint-plugin-unicorn` + **`eslint-plugin-jsdoc`**;
Angular package adds `@angular-eslint`.

```js
{
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/explicit-function-return-type': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  'import/no-cycle': 'error',
  'import/no-default-export': 'error',
  'unicorn/filename-case': ['error', { case: 'kebabCase' }],
  'no-console': 'error',

  // JSDoc enforcement (see §6)
  'jsdoc/require-jsdoc': ['error', {
    publicOnly: true,
    require: { FunctionDeclaration: true, MethodDefinition: true, ClassDeclaration: true },
    contexts: ['TSInterfaceDeclaration','TSPropertySignature','TSTypeAliasDeclaration','TSEnumDeclaration','TSEnumMember'],
  }],
  'jsdoc/require-param': 'error',
  'jsdoc/require-param-description': 'error',
  'jsdoc/require-returns': 'error',
  'jsdoc/require-returns-description': 'error',
  'jsdoc/check-param-names': 'error',
  'jsdoc/no-undefined-types': 'error',
}
```
ng-packagr is configured to **preserve JSDoc in emitted `.d.ts`**.

---

## 8. Testing Requirements

### 8.1 Frameworks
- **Vitest** (core, react). **@testing-library/react** + **user-event** + **jest-dom** for React.
- **Angular:** `@angular/core/testing` (`TestBed`) + **@testing-library/angular**; run via the
  Angular CLI test runner or Vitest (`@analogjs/vitest-angular`) — pick one and document it.

### 8.2 Coverage Thresholds (per package, enforced in CI)
`lines 95% / functions 95% / branches 90% / statements 95%`

### 8.3 Test File Location — co-located
`create-form-store.test.ts`, `is-email.test.ts`, `use-form.test.tsx`,
`create-form-context.test.tsx`, `inject-form.spec.ts`, `form-field.directive.spec.ts`, etc.

### 8.4 Required Test Scenarios (ALL)

**Core Store — options & values**
- [ ] initial values/errors/touched/dirty stored from `initialValues`/`initialErrors`/`initialTouched`/`initialDirty`
- [ ] `setFieldValue` nested path; functional updater `(cur) => next`; `{ forceUpdate }` behaviour
- [ ] `setValues` object merge and functional updater; `onValuesChange` fires with `(values, previous)`
- [ ] `getValues`/`getInitialValues` return latest/snapshot; uncontrolled `values` is the ref
- [ ] `initialize(values)` sets values+initials and flips `initialized`
- [ ] `setInitialValues` changes dirty baseline without changing values
- [ ] `reset()` restores initials, clears errors/touched/dirty/validating, bumps formKey
- [ ] `resetField(path)` resets only that field

**Core Store — errors / status / lists**
- [ ] `setErrors`/`setFieldError`/`clearErrors`/`clearFieldError`
- [ ] `isTouched()/isTouched(path)`; `touchTrigger: 'change'` vs `'focus'`
- [ ] `isDirty()/isDirty(path)`; `getTouched`/`getDirty`; `resetTouched`; `resetDirty(values?)` snapshot update
- [ ] `insertListItem` append + at index; `removeListItem`; `replaceListItem`; `reorderListItem`

**Core Store — validation**
- [ ] rules-object validate; single-function validate; nested `{ user: { name } }`; array `users.0.name`
- [ ] `formRootRule` validates parent alongside children
- [ ] `validateField(path)` validates only that field
- [ ] `isValid()`/`isValid(path)` never mutate errors
- [ ] async validation toggles `validating` / `isValidating(path)`; **stale async result is ignored** (generation guard)
- [ ] `validateDebounce` debounces field validation
- [ ] `validateInputOnChange`/`validateInputOnBlur` as `true` and as path arrays
- [ ] `clearInputErrorOnChange` clears the field error on next change
- [ ] `resolveValidationError` maps thrown errors to messages

**Core Store — submit / transform / watch / dom**
- [ ] `transformValues` applied by `onSubmit` and by `getTransformedValues(values?)`
- [ ] `onSubmit` calls validate first; calls `onValid(transformed)` or `onInvalid(errors, values, event)`
- [ ] `submitting` true while async submit pending, then false; `setSubmitting`
- [ ] `onSubmitPreventDefault: 'always' | 'never' | 'validation-failed'`
- [ ] `watch(path, cb)` fires with `{ previousValue, value, touched, dirty }`; unsubscribe stops it
- [ ] `cascadeUpdates` notifies ancestor watchers
- [ ] `key(path)` stable; bumps on programmatic change; not bumped by `forceUpdate:false` change
- [ ] `getInputNode(path)` finds the node by `data-path`; returns `null` on server

**Core Store — registry / actions / subscribers**
- [ ] named form registers; `createFormActions` dispatches mutations to it; multi-instance fan-out
- [ ] invalid form name throws in dev
- [ ] `subscribe(fn)` called on change; `unsubscribe` stops it

**Validators**
- [ ] `isNotEmpty` rejects '', '   ', null, undefined, false, []
- [ ] `isEmail` accept/reject
- [ ] `matches` regexp
- [ ] `matchesField` equal/unequal; primitive-only note
- [ ] `isInRange` min/max/both; non-number fails
- [ ] `hasLength` exact number and `{min,max}`; trims strings; arrays
- [ ] `isJSONString` valid/invalid
- [ ] `isNotEmptyHTML` empty tags/whitespace vs real content
- [ ] all: omit error → invalid with no message

**Schema Resolver**
- [ ] Zod sync resolves; nested object paths map correctly; Valibot variant
- [ ] async schema returns Promise; `validating` updates
- [ ] `{ sync: true }` makes validate synchronous

**React Hook (use-form)**
- [ ] returns every core member
- [ ] controlled: re-renders on every `setFieldValue`
- [ ] uncontrolled: typing via `getInputProps().onChange` does NOT re-render; `setFieldError` DOES
- [ ] uncontrolled: programmatic `setFieldValue` bumps `key(path)` → input remounts with new defaultValue
- [ ] `onSubmit` calls validate; `onReset` calls reset; `onSubmitPreventDefault:'never'` skips preventDefault
- [ ] `enhanceGetInputProps` merges
- [ ] **SSR:** renders with a server snapshot (no hydration mismatch); `getServerSnapshot` provided

**use-field** — validate on blur/change; `isDirty`; `reset`; error get/set

**createFormContext (React)** — provider supplies form to children; outside-provider throws; nested providers independent

**Angular Wrapper**
- [ ] `injectForm` exposes signals for values/errors/touched/dirty/validating/submitting/initialized
- [ ] controlled: values signal updates (CD) on `setFieldValue`; uncontrolled: it does NOT, but errors/touched signals DO
- [ ] `[hfField]` two-way binds text; `type="checkbox"` binds checked; `type="number"` coerces; `type="radio"` by value
- [ ] `[hfField]` marks touched on blur/focus per `touchTrigger`; reflects errors; writes `data-path`
- [ ] `injectField` validate on blur/change; `isDirty`; `reset`
- [ ] `provideForm`/`injectFormContext` resolves via DI; missing provider throws
- [ ] works under `OnPush`; works zoneless
- [ ] **SSR (Angular Universal):** `getInputNode` returns null on server; no `document` access during SSR

**Form Actions** — setFieldValue/validate/reset on named form; fan-out to same-named forms (React + Angular registered)

---

## 9. Build Configuration

### 9.1 tsup — core & react
```ts
// core
export default defineConfig({ entry: ['src/index.ts'], format: ['esm','cjs'], dts: true, sourcemap: true, clean: true, splitting: false, treeshake: true, external: [] });
// react
export default defineConfig({ entry: ['src/index.ts'], format: ['esm','cjs'], dts: true, sourcemap: true, clean: true, splitting: false, treeshake: true, external: ['react','react-dom','@headless-form/core'] });
```

### 9.2 ng-packagr — angular (Angular Package Format)
```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "./dist",
  "lib": { "entryFile": "src/public-api.ts" },
  "allowedNonPeerDependencies": ["@headless-form/core"]
}
```
`@angular/core` + `@angular/common` are **peerDependencies**; `@headless-form/core` is a normal
`dependency`. Preserve JSDoc in `.d.ts`.

### 9.3 package.json exports (dual CJS+ESM, core & react)
```json
{
  "exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" } },
  "main": "./dist/index.cjs", "module": "./dist/index.mjs", "types": "./dist/index.d.ts", "files": ["dist"]
}
```
Angular uses the fields ng-packagr generates.

### 9.4 Bundle-size budgets (`.size-limit.json`, enforced in CI)
- `@headless-form/core` (ESM, gzip): target keep small (Mantine form is ~ small KB) — set a hard cap and fail CI on regression.
- `@headless-form/react` (ESM, gzip, excluding peer React): hard cap.
- `@headless-form/angular` (fesm, gzip, excluding peer Angular): hard cap.
- Validators and `schemaResolver` must be independently tree-shakeable (verify via size-limit entries importing only one symbol).

### 9.5 Peer-dependency / supported-version matrix
- **React:** `>=18` (uses `useSyncExternalStore`; test on 18 and 19). Document RSC `"use client"` usage.
- **Angular:** `>=17` (signals stable; standalone APIs). Test the current LTS and latest. State the exact range in `peerDependencies`.
- **TypeScript:** `>=5.x` (deep path inference). State the minimum.
- **Node (dev/build):** state the supported range used in CI.

---

## 10. CI / GitHub Actions

### ci.yml (in order)
1. `pnpm install --frozen-lockfile`
2. `pnpm turbo run lint` (incl. jsdoc rules)
3. `pnpm turbo run typecheck` (`tsc --noEmit`) across all packages **and** all `examples/*`
4. `pnpm turbo run test` (per-package coverage thresholds)
5. `pnpm turbo run build` (tsup core/react + ng-packagr angular)
6. `pnpm turbo run build` for `examples/*` — every example must build
7. `pnpm size-limit` — bundle budgets (§9.4)
8. Coverage upload to Codecov

### release.yml
Trigger on push to `main`; `changesets/action` to version/publish; build all three packages first.

---

## 11. Implementation Order
1. Root scaffolding (configs, eslint+jsdoc, size-limit, turbo, tsconfig, LICENSE/CONTRIBUTING)
2. **core types** — path → input-props → validation → watch → form → store (fully JSDoc'd)
3. **core utils** — get/set-path, get-data-path, clone, deep-equal, get-input-on-change, should-validate-on-change, list-handlers, path-to-array
4. **core validators** — all 8 + tests
5. **core resolvers** — schema-resolver (Standard Schema) + optional legacy shims
6. **core store** — field-keys → watch-registry → create-form-store → form-store-registry
7. **core barrel**
8. **react** — use-form (3 overloads) → use-field → create-form-context → barrel (incl. `getServerSnapshot`)
9. **angular** — inject-form → form-field.directive → inject-field → form-context(+token) → public-api
10. **tests** alongside every module
11. **examples/vanilla**
12. **examples/react** (full suite, §17)
13. **examples/angular** (mirror)
14. **docs/** (incl. Angular, vanilla-core, SSR)
15. **README.md**

---

## 12. Code Style Rules
- Named exports only (config files + Angular `public-api.ts` re-exports exempt from the spirit, still no `default`)
- `import type` for type-only imports; no `*` re-exports in barrels
- In-depth JSDoc per §6 — every export **and every key**
- Errors prefixed with call site: `[headless-form/createFormStore] …`
- Pure utils (no side effects, no module state); module state only in `form-store-registry.ts` / `watch-registry.ts`
- Angular: standalone + signal-first; no `NgModule`; no `zone.js` reliance; examples default to `OnPush`

---

## 13. API Parity Reference Table

| Mantine API | core (vanilla) | React | Angular |
|---|---|---|---|
| `useForm(options)` | `createFormStore(options)` | `useForm(options)` | `injectForm(options)` |
| `UseFormReturnType<V,T,R>` | `FormStoreApi<V,T,R>` | `UseFormReturnType<V,T,R>` | `FormApi<V,T,R>` |
| `UseFormInput<V,T>` | `UseFormOptions<V,T>` | `UseFormOptions<V,T>` | `UseFormOptions<V,T>` |
| `TransformedValues<Form>` | `TransformedValues<Form>` | (re-exported) | (re-exported) |
| `createFormContext<V>()` | — | `createFormContext<V>()` | `provideForm()` + `injectFormContext<V>()` |
| `createFormActions<V>(name)` | `createFormActions<V>(name)` | (re-exported) | (re-exported) |
| `getInputProps(path)` | `store.getInputProps(path)` | `form.getInputProps(path)` | `[hfField]` directive |
| `getInputNode(path)` | `store.getInputNode(path)` | `form.getInputNode(path)` | via directive `data-path` |
| `form.watch(path, cb)` | `store.watch(path, cb)` | `form.watch(path, cb)` | `form.watch(path, cb)` |
| `useField(options)` | — | `useField(options)` | `injectField(options)` |
| `formRootRule` | `formRootRule` | (re-exported) | (re-exported) |
| `schemaResolver(schema)` | `schemaResolver(schema)` | (re-exported) | (re-exported) |
| `isNotEmpty`/`isEmail`/`matches`/`matchesField`/`isInRange`/`hasLength`/`isJSONString`/`isNotEmptyHTML` | core validators | (re-exported) | (re-exported) |

Validators, resolvers, `formRootRule`, `createFormActions`, and `TransformedValues` live in
**core** and are re-exported from both wrappers so users import everything from one package.

---

## 14. What NOT to do
- **Do NOT** copy Mantine source verbatim — clean-room only
- **Do NOT** import `@mantine/*` anywhere
- **Do NOT** use React (`useState`/`useRef`) or Angular (`signal`/`inject`/decorators) inside core
- **Do NOT** reference `React.ReactNode` in core — error type is generic (§3.8)
- **Do NOT** access `document`/`window` at core module top level (SSR)
- **Do NOT** re-implement "when to update" logic in the wrappers — it lives in core (§3.3, §3.7)
- **Do NOT** change Mantine's defaults (e.g. `mode` default is `'controlled'`)
- **Do NOT** add `isUrl`/`isOneOf` to the parity validator set (they aren't Mantine's)
- **Do NOT** use `any`; **Do NOT** use `@ts-ignore`/`@ts-expect-error` without a TODO issue
- **Do NOT** write tests after implementation; **Do NOT** skip JSDoc on any export or key
- **Do NOT** use default exports in source; **Do NOT** create circular deps; **Do NOT** rely on `zone.js`

---

## 15. Key Architectural Decisions & Rationale

**Subscriber pattern in core** — `subscribe(fn) → unsubscribe` lets any framework hook in. React
uses `useSyncExternalStore`; Angular bridges notifications into Signals; a future Vue/Solid
wrapper needs no core change.

**`useSyncExternalStore` (React)** — correct React 18 primitive for external state; avoids
tearing under concurrent rendering; requires a `getServerSnapshot` for SSR (§3.7, §9.5).

**Signals + `[hfField]` (Angular)** — Signals mirror `useSyncExternalStore`; the directive is the
idiomatic stand-in for `getInputProps`, keeping the wrapper zoneless-friendly and `OnPush`-correct.

**No framework state in core** — keeps the engine reusable and lets the uncontrolled field-key
trick (§3.7) be implemented once.

**`formRootRule` is a Symbol** — cannot collide with a user field named `__root__`.

**Standard Schema for validation** — one adapter covers Zod v4, Valibot, Arktype, Effect, etc.
Optional `resolvers/legacy/*` shims provide drop-in compatibility for codebases migrating from
Mantine's per-library resolver packages.

**Generation-guarded, abortable validation** — async validators can resolve out of order;
generation counters + `AbortController` ensure only the latest result is applied (§3.5).

**pnpm + Turborepo** — deterministic installs, correct peer-dep handling, cached per-package CI.

**ng-packagr for Angular only** — Angular libraries need the Angular Package Format (partial-Ivy
metadata, fesm bundles); tsup can't produce these. Core/React stay on tsup.

---

## 16. (reserved)

---

## 17. Examples Folder Requirements (MANDATORY — `examples/`)

Three runnable apps, type-checked and built in CI (§10). Each has its own `package.json` +
`README.md` and consumes workspace packages via `workspace:*`.

### 17.1 `examples/vanilla` — plain JS/TS, no framework
Vite + TS, uses `@headless-form/core` directly. Demonstrates: creating a store; `subscribe`;
`setFieldValue`; validation (rules object, single function, async, schema via `schemaResolver`);
list handlers; `transformValues` + `getTransformedValues`; `watch`; named forms +
`createFormActions`; manual DOM wiring with `getInputProps` (incl. checkbox/radio) and
`getInputNode` scroll-to-error. Each demo shows a **subscriber-notification counter** so the
developer sees exactly when/how often the store notifies.

### 17.2 `examples/react` — exhaustive React sample suite
Single Vite + React + TS app, one route per sample. Every sample renders a visible
**render-count badge** (a component that increments a ref each render and displays it).

**Basics:** minimal form; `getInputProps` variants (text, `checkbox`, `radio`, `withError:false`,
`withFocus:false`); `enhanceGetInputProps` (e.g. disable all inputs while `submitting`).

**Controlled vs Uncontrolled (re-render indicators — REQUIRED):**
- Controlled sample with per-field + per-form render badges — typing visibly increments counts.
- Uncontrolled sample with the same badges — typing must NOT increment counts; only
  validation/touched/dirty changes do.
- **Side-by-side comparison** route showing both with live counters, a "log renders to console"
  toggle, a React DevTools Profiler note, and prose explaining *why* counts differ (the field-key
  trick, §3.7).
- `key(path)` demo — programmatic `setFieldValue` remounts only the touched field.

**Validation:** rules object; single function; `validateInputOnChange`/`OnBlur` (boolean and path
arrays); `validateDebounce`; async ("username taken?") with `validating`/`isValidating` spinners;
schema via `schemaResolver` (Zod sync + async, Valibot); `formRootRule`; `initialErrors`;
`resolveValidationError`.

**Errors & status:** `setErrors`/`setFieldError`/`clearErrors`/`clearFieldError`; live
`isTouched`/`isDirty`/`getTouched`/`getDirty` dashboard; `touchTrigger:'focus'`;
`resetDirty`/`resetTouched`/`reset`/`resetField`; `initialDirty`/`initialTouched`.

**Nested & lists:** nested objects (`user.address.city`); dynamic list with
insert/remove/replace/reorder (editable table) with per-row render badges to show uncontrolled efficiency.

**Watch & side effects:** `watch(path, cb)` updating a derived UI; `cascadeUpdates`;
`onValuesChange` logging.

**Context & actions:** `createFormContext` (parent provides, deep child consumes); `useField`
standalone; named form + `createFormActions` mutating from an unrelated component.

**Advanced / real-world:** `transformValues` + `getTransformedValues` (split full name);
`initialize` (async load → populate); multi-step wizard sharing one form via context; large form
(50+ fields) demonstrating uncontrolled performance with a global render badge; scroll-to-first-error
on submit via `getInputNode`; **SSR note/route** (Next.js `"use client"` + `getServerSnapshot`).

Each sample file ends with a comment summarizing the takeaway (especially the render-count
expectation for controlled vs uncontrolled).

### 17.3 `examples/angular` — exhaustive Angular suite (mirror of React)
Angular CLI app (standalone, signals, `OnPush`, ideally zoneless) with the **same** samples,
expressed via `injectForm`, `[hfField]`, `injectField`, `provideForm`/`injectFormContext`.
- Every React sample has an Angular counterpart with matching behaviour and aligned route names.
- **Change-detection indicators (REQUIRED):** each sample shows a visible CD/update counter
  (e.g. an `effect()` incrementing a signal) proving that in uncontrolled mode typing does NOT
  update the value signal while errors/touched/dirty changes do.
- **Controlled vs uncontrolled side-by-side** route mirroring React, with a note on how Angular CD
  maps to React re-renders.
- **SSR note/route** (Angular Universal): `getInputNode` returns null server-side; no `document` access during SSR.

### 17.4 Cross-framework parity check
Vanilla, React, and Angular suites demonstrate the **same** features. A reviewer can open the
React "async validation" sample and the Angular one and see equivalent behaviour. Keep sample
names aligned across suites.

---

## 18. Docs Structure Requirements
Each `docs/` file contains: (1) feature overview; (2) API reference table sourced from JSDoc
(every option + return member with types and defaults); (3) basic example for **both** React and
Angular; (4) advanced examples (edge cases, nested, async); (5) TypeScript tips (generics);
(6) migration notes from `@mantine/form` (differences should be minimal — call out the `TError`
generic and the directive-vs-`getInputProps` difference); (7) common mistakes with fixes;
(8) links to the matching `examples/react` and `examples/angular` routes.

`docs/18-angular-guide.md`, `docs/19-vanilla-core-guide.md`, and `docs/20-ssr.md` cover the
framework-specific surfaces (signals + `[hfField]`; raw `subscribe`/`getInputProps` DOM wiring;
`getServerSnapshot` + Angular Universal guidance).

---

*End of CLAUDE.md — proceed to implementation only after reading this in full.*
