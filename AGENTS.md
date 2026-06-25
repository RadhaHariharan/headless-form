# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, GitHub Copilot, OpenAI Codex, and
similar tools) working in this repository. Human contributors should read
[CONTRIBUTING.md](./CONTRIBUTING.md) instead — this file is optimized for an agent that needs
to know exactly what command to run and exactly which rule it must not break, not for prose.

If your tool only reads a tool-specific filename (`CLAUDE.md`, `.github/copilot-instructions.md`,
`.cursor/rules`, etc.), those files in this repo are thin pointers back to this one — this is
the single source of truth. Keep it that way: if you update standards, update this file, not
the pointers.

## What this repo is

`headlesskit` is a pnpm/Turborepo monorepo of independent, publishable TypeScript packages
under `packages/*`:

| Package | Tier |
|---------|------|
| `forms`, `forms-react`, `forms-react-native` | **Native** — original code, full lint/test/typecheck rigor |
| `query-core`, `query-persist-client-core`, `query-async-storage-persister`, `query-sync-storage-persister` | **Vendored** — ported from TanStack Query, kept close to upstream structure |
| `state-management`, `state-management-toolkit` | **Vendored** — ported from Redux / Redux Toolkit, kept close to upstream structure |

This tiering matters — see [Vendored vs. native packages](#vendored-vs-native-packages) before
you touch a vendored package.

`docs/<package>/*.mdx` holds deep, per-file, per-export documentation rendered by the docs
site (`examples/docs-site`). `examples/*` are runnable example apps. `scripts/*` are
repo-maintenance scripts.

## Setup

```bash
pnpm install
pnpm build
```

Requires Node >= 18, pnpm >= 9 (see `engines` in root `package.json`).

Some packages' tests depend on a sibling workspace package — check that package's
`vitest.config.ts` before assuming you need to rebuild the dependency first. Some
(`forms-react`) alias the workspace dependency straight to the sibling's `src/index.ts`, so
testing them against unbuilt source just works. Others have no such alias, so they resolve the
dependency through its `package.json` `exports` field into `dist/` — for those, rebuild the
dependency after changing it, before re-running the dependent package's tests.

## Commands — run these, don't guess

Always scope to the package(s) you touched with `--filter` rather than running the full
monorepo command, unless you changed something shared (e.g. `tsconfig.base.json`, root
ESLint config) or you're doing a final pre-PR check.

```bash
# Whole repo (Turborepo — slow, use sparingly)
pnpm build && pnpm test && pnpm typecheck && pnpm lint

# Scoped to one package (fast — do this while iterating)
pnpm --filter @headlesskit/forms test
pnpm --filter @headlesskit/forms-react typecheck
pnpm --filter @headlesskit/query-core build
```

**Before declaring a task done**, run, for every package you edited:
1. `pnpm --filter <pkg> typecheck`
2. `pnpm --filter <pkg> test` (coverage thresholds are enforced for native packages — see below)
3. `pnpm --filter <pkg> lint` — **only if the package has a `lint` script** (vendored packages
   don't; check `packages/<pkg>/package.json` `scripts` before assuming)
4. `pnpm --filter <pkg> build` if you touched anything other than tests

Not every package has every script. Check `packages/<pkg>/package.json` `scripts` before
running a command — `state-management` and `state-management-toolkit` currently only define
`build` and `dev` (no `test`/`lint`/`typecheck` script is wired up; see
[Known gaps](#known-gaps-dont-silently-paper-over-these) before assuming they're fully covered).

## Vendored vs. native packages

This is the single most important distinction in this repo. Get it wrong and you'll produce a
diff that's painful for a human to review against upstream.

**Native** (`forms`, `forms-react`, `forms-react-native`):
- kebab-case filenames (`is-not-empty.ts`, `create-form-store.ts`) — enforced by
  `unicorn/filename-case` in the root ESLint config.
- Full strict-TypeScript + ESLint rigor (see [Code style](#code-style-native-packages) below).
- Write code the way you'd write any other TypeScript in this repo — there's no upstream to
  stay close to.

**Vendored** (`query-*`, `state-management`, `state-management-toolkit`):
- camelCase filenames (`queryClient.ts`, `createStore.ts`) — this **intentionally** mirrors the
  upstream TanStack Query / Redux source tree, to keep diffs against upstream small and make it
  easy to port upstream fixes. **Do not rename these files to kebab-case** or otherwise
  "normalize" them to match the native packages' conventions.
- Not linted by the root ESLint config (no `lint` script in these packages' `package.json`).
  Match the *existing* style in the file you're editing, not the native-package rules above.
- When fixing a bug here, check whether upstream (TanStack Query / Redux / Redux Toolkit) has
  already fixed it — porting their fix verbatim (with attribution in the commit/PR) is usually
  better than writing a divergent one.
- Still subject to the strict `tsconfig.base.json` compiler options (see below) and to whatever
  `test`/`typecheck` scripts the package *does* define.

## Code style (native packages)

Enforced by `tsconfig.base.json` + `.eslintrc.cjs` + `.prettierrc` — running `lint`/`typecheck`
catches almost all of this, but know it going in rather than discovering it via CI failures:

- **No `any`.** `@typescript-eslint/no-explicit-any` is an error. Use `unknown` + narrowing,
  or a generic.
- **No non-null assertions (`!`).** Narrow the type properly instead.
- **Named exports only.** `import/no-default-export` is an error.
- **Explicit return types on every function.** `@typescript-eslint/explicit-function-return-type`.
- **`import type` for type-only imports** — `@typescript-eslint/consistent-type-imports`.
- **No `console.*` in source** (`no-console`) — fine in `*.test.ts` and `*.config.ts`.
- **JSDoc on every exported symbol** (functions, classes, interfaces, type aliases, enums, and
  every interface property) — `jsdoc/require-jsdoc` + related rules. Include `@param` and
  `@returns` with real descriptions, not restatements of the name. Look at any existing file in
  the same folder for the expected shape before adding a new export.
- **kebab-case filenames.**
- TypeScript compiler is strict beyond the default `strict: true` — also
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`. `exactOptionalPropertyTypes` in particular means you cannot pass
  `{ foo: undefined }` to satisfy an optional `foo?: T` property — omit the key entirely
  (`...(cond ? { foo: value } : {})` is the pattern used throughout this codebase when a key is
  conditionally present).
- Formatting is Prettier-owned (`singleQuote`, `semi`, `trailingComma: all`, `printWidth: 100`)
  — don't hand-format against it; run `lint`/your editor's Prettier integration.

## Testing

- Tests are colocated with source as `<name>.test.ts` (or `.test.tsx`), not in a separate
  `__tests__/` or `test/` directory. Look at `packages/forms/src/store/create-form-store.test.ts`
  for the pattern.
- Native packages enforce coverage thresholds in `vitest.config.ts` (typically `lines: 95,
  functions: 95, branches: 90, statements: 95`) — a PR that drops below threshold fails CI.
  Barrel files (`index.ts`) and pure type-declaration files are excluded from coverage, not
  exempt from testing logic elsewhere.
- When you change behavior, update or add tests in the same PR — don't leave it for a
  follow-up.
- Vitest is configured with `globals: true` — no need to import `describe`/`it`/`expect`.

## Documentation conventions

`docs/<package>/NN-slug.mdx` (root-level) or `docs/<package>/<folder>/NN-slug.mdx` (mirroring a
`src/` subfolder, e.g. `docs/forms/utils/03-get-path.mdx` for `packages/forms/src/utils/get-path.ts`).
If you add or change public API, add or update the matching doc in the same PR. Follow the
structure of any neighboring file in that folder:

1. `# Title` + one-line description, `**File:** \`src/path/to/file.ts\`` if it's a per-file doc.
2. `## Signature` — the real type signature, plus an options table if it takes a config object.
3. A **basic** usage example.
4. At least one **advanced** / real-world example.
5. `## Common pitfalls` — grounded in what you actually read in the source (exact throw
   conditions, exact edge cases), never generic filler advice.

Internal markdown links are **relative to the linking file's own location** — a file at
`docs/forms/16-foo.mdx` linking to `docs/forms/types/04-validation-types.mdx` uses
`./types/04-validation-types`, not `../forms/types/...`. Get this wrong and the docs-site
sidebar link silently 404s into the landing page instead of erroring loudly — always verify a
new internal link actually resolves (check the target file exists at that relative path) rather
than assuming.

## Git / PR conventions

Don't duplicate [CONTRIBUTING.md](./CONTRIBUTING.md) here — read it. The short version an agent
needs:

- One logical change per PR/commit. Don't bundle an unrelated refactor into a bug fix.
- Bump the version in `package.json` for any published package whose public API or behavior
  you changed (semver: patch/minor/major).
- Never use `git commit --no-verify`, `--no-gpg-sign`, or force-push to `main` unless a human
  explicitly asks for it in this exact conversation.
- Never run `rm -rf`, `git reset --hard`, or delete branches without the human's explicit
  go-ahead — these are exactly the kind of irreversible actions that need a human in the loop.

## Things not to do

- Don't add a runtime dependency to `@headlesskit/forms` or `@headlesskit/query-core` — both
  are advertised as zero-dependency. `forms`'s bundle-size budget is enforced via `pnpm size` /
  `.size-limit.json` (currently the only package tracked there); `query-core` has no
  `dependencies` field in its `package.json` today — keep it that way.
- Don't add `react` (or `react-native`) as anything but a `peerDependency` in `forms-react` /
  `forms-react-native` — these packages must work with whatever React version the consumer has,
  not a pinned copy.
- Don't "fix" camelCase filenames in vendored packages, or add native-package-style JSDoc/lint
  rigor there wholesale — see [Vendored vs. native packages](#vendored-vs-native-packages).
- Don't introduce a default export anywhere in `packages/*/src`.
- Don't fabricate documentation content (example output, error messages, behavior) — read the
  actual source first. Every behavioral claim in `docs/` should be traceable to a line of real
  code, not general knowledge about what a similarly-named function "usually" does.
- Don't claim a check passed without having actually run it in this session.

## Known gaps — don't silently paper over these

If your task touches one of these areas, flag it explicitly rather than assuming it's fine:

- `state-management` and `state-management-toolkit` have **no test suite and no `lint`/`typecheck`
  script** wired into their `package.json` at all. If you're asked to add tests or wire up
  these scripts, that's a real, valuable change — don't skip it thinking it's already covered
  elsewhere.
- `.github/workflows/release.yml` only builds/publishes `@headlesskit/forms` and
  `@headlesskit/forms-react` on a release tag — the other 7 packages are never published by CI
  as of this writing. If you're asked to cut a release for any other package, this needs fixing
  first, not worked around manually.
- `vitest.workspace.ts` at the repo root references `packages/core`, `packages/react`,
  `packages/angular` — paths that no longer exist (the repo was restructured to
  `packages/forms`, `packages/forms-react`, etc. without updating this file). Each package's own
  `vitest.config.ts` is what actually runs; this root file is currently dead weight, not a
  routing table to trust.
