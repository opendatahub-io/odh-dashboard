# @odh-dashboard/eslint-plugin

Custom ESLint plugin providing project-specific lint rules for the ODH Dashboard monorepo.

## Purpose

Encapsulates rules that cannot be expressed through config alone — e.g., enforcing import patterns unique to this codebase, preventing anti-patterns detected through code review, and flagging usage of deprecated internal APIs.

## Usage

```js
import plugin from '@odh-dashboard/eslint-plugin';

export default [
  { plugins: { odh: plugin } },
  { rules: { 'odh/no-deprecated-api': 'error' } },
];
```

## Rules

| Rule | Description |
|------|-------------|
| See `rules/` | Custom rules defined in the `rules/` directory |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
