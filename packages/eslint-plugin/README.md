# @odh-dashboard/eslint-plugin

Custom ESLint plugin providing project-specific lint rules for the ODH Dashboard monorepo.

## Purpose

Encapsulates rules that cannot be expressed through config alone — e.g., enforcing import patterns unique to this codebase, preventing anti-patterns detected through code review, and flagging usage of deprecated internal APIs.

## Usage

The shared recommended ESLint profiles enable the analytics rule by default; no additional
override is needed:

```js
module.exports = require('@odh-dashboard/eslint-config').recommendedReactTypescript(__dirname);
```

Custom configs that do not use these profiles should add the scoped preset to their existing
overrides. See [Feature Analytics Guards](../eslint-config/README.md#feature-analytics-guards)
for the JavaScript/TypeScript override and Cypress exclusion.

## Rules

| Rule                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-direct-analytics` | Reject direct feature analytics implementation imports and globals; allow SDK-free contracts from `@odh-dashboard/analytics/types` and providers/hooks from `@odh-dashboard/analytics/react`. Shared recommended profiles enable it by default; custom configs can use the [feature analytics preset](../eslint-config/README.md#feature-analytics-guards). Standalone composition roots can disable it through a file-specific override. |
| See `rules/`          | Custom rules defined in the `rules/` directory                                                                                                                                                                                                                                                                                                                                                                                            |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
