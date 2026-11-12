# @odh-dashboard/eslint-plugin

Custom ESLint plugin providing project-specific lint rules for the ODH Dashboard monorepo.

## Purpose

Encapsulates rules that cannot be expressed through config alone — e.g., enforcing import patterns unique to this codebase, preventing anti-patterns detected through code review, and flagging usage of deprecated internal APIs.

## Usage

Enable the analytics rule through the shared scoped preset in your package's `.eslintrc.js`:

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

| Rule                  | Description                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-direct-analytics` | Reject direct feature analytics implementation imports and globals; allow SDK-free contracts from `@odh-dashboard/analytics/types`, providers/hooks from `@odh-dashboard/analytics/react`, and the compatibility factory from `@odh-dashboard/analytics/standalone` for standalone bootstrap wiring. Enable for migrated files with the [feature analytics preset](../eslint-config/README.md#feature-analytics-guards). |
| See `rules/`          | Custom rules defined in the `rules/` directory                                                                                                                                                                                                          |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
