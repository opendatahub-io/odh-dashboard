# @odh-dashboard/jest-config

Shared Jest configurations for all ODH Dashboard packages.

## Purpose

Provides a consistent test runner setup across the monorepo — JSDOM environment, TypeScript transforms, module name mappings, and coverage thresholds. Packages extend the shared config rather than duplicating boilerplate.

## Usage

In your package `jest.config.ts`:

```ts
import base from '@odh-dashboard/jest-config';

export default { ...base, displayName: 'my-package' };
```

## Contents

| Path | Description |
|------|-------------|
| `config/` | Named preset configs (dom, node) |
| `src/` | Config construction helpers |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
