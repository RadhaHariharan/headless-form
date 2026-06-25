# Contributing to headlesskit

Thanks for taking the time to contribute! This document covers everything you need to go
from "I found a bug" or "I have an idea" to an opened, mergeable pull request.

## Code of Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you're
expected to uphold it.

## Before you start

- **Bug report?** Search [existing issues](https://github.com/RadhaHariharan/headlesskit/issues)
  first — someone may have already reported it.
- **Feature idea?** Open an issue to discuss it before writing code, especially for anything
  that changes a public API. This avoids spending time on a PR that doesn't fit the project's
  direction.
- **Security issue?** Do not open a public issue — see [SECURITY.md](./SECURITY.md) instead.
- **Small fix (typo, docs, obvious bug)?** Feel free to skip the issue and go straight to a PR.

## Prerequisites

- Node >= 18
- pnpm >= 9

## Setup

```bash
git clone https://github.com/RadhaHariharan/headlesskit.git
cd headlesskit
pnpm install
pnpm build
```

## Development workflow

```bash
pnpm test        # run all tests with coverage
pnpm lint         # lint all packages
pnpm typecheck    # type-check all packages
pnpm build        # build all packages
pnpm size         # check bundle-size budgets (.size-limit.json)
```

Scope any of these to a single package while iterating:

```bash
pnpm --filter @headlesskit/forms test
pnpm --filter @headlesskit/forms-react typecheck
```

## Making changes

1. **Fork** the repo and create a branch off `main`:
   ```bash
   git checkout -b fix/short-description
   ```
2. **Write the change**, plus tests that cover it. This repo enforces coverage thresholds per
   package (see each package's `vitest.config.ts`) — a PR that drops coverage below the
   threshold will fail CI.
3. **Bump the version** of any package whose public API or behavior you changed (in its
   `package.json`), following [semver](https://semver.org/): patch for fixes, minor for
   backwards-compatible features, major for breaking changes. Skip this for docs-only or
   internal tooling changes.
4. **Run the full check suite** before opening a PR:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```

## Code style

- No `any`, no `@ts-ignore` without a linked TODO issue explaining why.
- JSDoc on every exported symbol and every key of every exported interface.
- Tests alongside every module; coverage thresholds must pass.
- Named exports only — no default exports.
- Keep `@headlesskit/forms` and `@headlesskit/query-core` dependency-free; framework bindings
  (`forms-react`, `forms-react-native`) should only depend on their respective framework as a
  peer dependency, never a hard dependency.
- Formatting and linting are enforced by Prettier/ESLint — run `pnpm lint` before pushing.

## Commit messages

Use clear, descriptive commit messages. [Conventional Commits](https://www.conventionalcommits.org/)
(`fix:`, `feat:`, `docs:`, `refactor:`, `test:`, `chore:`) are encouraged but not required —
clarity matters more than the prefix.

## Opening the pull request

- Fill in the PR template — it asks what changed, why, and how it was tested.
- Link any related issue (`Fixes #123`).
- Keep PRs focused: one logical change per PR is easier to review and revert if needed.
- CI must pass (lint, typecheck, test, build) before a maintainer will review.
- Be responsive to review feedback — if a PR goes stale with no activity, it may be closed and
  can be reopened once you're ready to continue.

## Adding documentation

In-depth docs live under [`docs/<package>/`](./docs) as numbered `.mdx` files, rendered by the
docs site ([`examples/docs-site`](./examples/docs-site)). If you add or change public API,
update the matching doc (or add a new numbered file) in the same PR — see any existing file in
that package's `docs/` folder for the expected structure (signature, options, basic example,
advanced example, common pitfalls).

## Releasing (maintainers)

Pushing a `v*` tag to `main` triggers the `release` GitHub workflow, which builds the
packages and publishes them to npm, then creates a GitHub Release with auto-generated notes.

## Questions?

Open a [discussion or issue](https://github.com/RadhaHariharan/headlesskit/issues) — there's
no such thing as a silly question.
