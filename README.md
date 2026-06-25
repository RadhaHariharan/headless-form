# headlesskit

[![CI](https://github.com/RadhaHariharan/headlesskit/actions/workflows/ci.yml/badge.svg)](https://github.com/RadhaHariharan/headlesskit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A monorepo of headless, framework-agnostic TypeScript libraries: a zero-dependency form
state engine, an async query/cache engine, and a Redux-compatible state management layer —
each with thin, idiomatic framework bindings on top.

This file covers **install, setup, and running the project**. For everything else — full API
reference, options, advanced examples, internals — see each package's own README and the
[docs site](#documentation).

## Packages

| Package | Description |
|---------|-------------|
| [`@headlesskit/forms`](./packages/forms) | Framework-agnostic form state engine — zero runtime dependencies |
| [`@headlesskit/forms-react`](./packages/forms-react) | React 18 bindings via `useSyncExternalStore` |
| [`@headlesskit/forms-react-native`](./packages/forms-react-native) | React Native prop adapters built on top of `forms-react` |
| [`@headlesskit/query-core`](./packages/query-core) | Framework-agnostic async state and cache engine (API-compatible with TanStack Query Core) |
| [`@headlesskit/query-persist-client-core`](./packages/query-persist-client-core) | Persist a query cache to storage and restore it on reload |
| [`@headlesskit/query-async-storage-persister`](./packages/query-async-storage-persister) | A persister backed by an async key-value store (e.g. `AsyncStorage`) |
| [`@headlesskit/query-sync-storage-persister`](./packages/query-sync-storage-persister) | A persister backed by a synchronous key-value store (e.g. `localStorage`) |
| [`@headlesskit/state-management`](./packages/state-management) | Predictable state container, API-compatible with Redux v5 |
| [`@headlesskit/state-management-toolkit`](./packages/state-management-toolkit) | Slices, async thunks, entities, listener middleware, and an RTK-Query-style data layer |

Click into any package above for its full README — install instructions, quick start,
complete API surface, and links to its in-depth docs.

## Documentation

The full docs site (every public export, every option, basic + advanced examples, internals,
and common pitfalls — per package, per file) lives under [`docs/`](./docs) and is rendered by
the docs-site example:

```bash
pnpm install
pnpm --filter @headlesskit/docs-site dev
```

## Examples

| Example | What it shows |
|---------|----------------|
| [`examples/docs-site`](./examples/docs-site) | The documentation site itself (Vite + vanilla TS) |
| [`examples/nextjs`](./examples/nextjs) | `@headlesskit/forms-react` inside a Next.js app |

## Development

Requires Node >= 18 and pnpm >= 9 (see [CONTRIBUTING.md](./CONTRIBUTING.md) for the full
contributor workflow).

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests (with coverage)
pnpm test

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Check bundle size budgets
pnpm size
```

Each package can also be run individually, e.g.:

```bash
pnpm --filter @headlesskit/forms test
pnpm --filter @headlesskit/forms-react build
```

## Repository layout

```
headlesskit/
├── packages/   # publishable packages (see table above)
├── docs/       # per-package, per-file documentation (.mdx), source for the docs site
├── examples/   # runnable example apps, including the docs site itself
└── scripts/    # repo-maintenance scripts (e.g. build-all.ts)
```

## Contributing

Contributions are welcome — bug reports, feature requests, and pull requests alike. Please
read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR, and note that this project
follows a [Code of Conduct](./CODE_OF_CONDUCT.md).

Using an AI coding agent (Claude Code, Cursor, Copilot, Codex, etc.)? See
[AGENTS.md](./AGENTS.md) for this repo's machine-readable conventions.

## Security

Found a security issue? Please see [SECURITY.md](./SECURITY.md) for how to report it
responsibly instead of opening a public issue.

## License

[MIT](./LICENSE) © headlesskit contributors
