# Contributing to headlesskit

Thank you for your interest in contributing! Please read this guide before opening a PR.

## Prerequisites

- Node >= 18
- pnpm >= 9

## Setup

```bash
pnpm install
pnpm build
```

## Development

```bash
pnpm test        # run all tests
pnpm lint        # lint all packages
pnpm typecheck   # type-check all packages
pnpm build       # build all packages
```

## Rules

- No `any`, no `@ts-ignore` without a TODO issue.
- JSDoc on every exported symbol and every key of every exported interface.
- Tests alongside every module; coverage thresholds must pass.
- Named exports only.
- Keep `@headlesskit/forms` dependency-free.
