# @odh-dashboard/eslint-plugin

Custom ESLint plugin providing project-specific lint rules for the ODH Dashboard monorepo.

## Purpose

Encapsulates rules that cannot be expressed through config alone — e.g., enforcing import patterns unique to this codebase, preventing anti-patterns detected through code review, and flagging usage of deprecated internal APIs.

## Usage

The shared recommended ESLint profiles enable the analytics rule by default. For a custom
or standalone config, apply the shared scoped preset to its source and unit-test files:

```js
const eslintConfig = require('@odh-dashboard/eslint-config');

module.exports = eslintConfig
  .extend({
    overrides: [
      {
        files: ['src/**/*.{ts,tsx}'],
        ...eslintConfig.featureAnalytics,
      },
    ],
  })
  .recommendedReactTypescript(__dirname);
```

## Rules

| Rule                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-direct-analytics` | Reject direct feature analytics implementation imports and globals; allow SDK-free contracts from `@odh-dashboard/analytics/types` and providers/hooks from `@odh-dashboard/analytics/react`. Shared recommended profiles enable it by default; custom configs can use the [feature analytics preset](../eslint-config/README.md#feature-analytics-guards). Standalone composition roots can disable it through a file-specific override. |
| See `rules/`          | Custom rules defined in the `rules/` directory                                                                                                                                                                                                                                                                                                                                                                                            |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
