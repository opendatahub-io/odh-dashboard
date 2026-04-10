# @odh-dashboard/eslint-config

Shared ESLint rules and configurations for all ODH Dashboard packages.

## Purpose

Centralises linting rules so every package in the monorepo enforces the same code-quality standards. Provides base, markdown, node, and package-restriction configs.

## Usage

In your package `eslint.config.js`:

```js
import base from '@odh-dashboard/eslint-config';

export default [...base];
```

## Configs

| File | Scope |
|------|-------|
| `base.js` | TypeScript + React rules (primary) |
| `markdown.js` | Rules for `.md` code fences |
| `node.js` | Node.js / CommonJS scripts |
| `package-restrictions.js` | Import restriction rules |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
