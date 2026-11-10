# @odh-dashboard/eslint-config

Shared ESLint rules and configurations for all ODH Dashboard packages.

## Purpose

Centralises linting rules so every package in the monorepo enforces the same code-quality standards. Provides base, markdown, node, and package-restriction configs.

## Usage

In your package’s `.eslintrc.js`:

```js
module.exports = require('@odh-dashboard/eslint-config').recommendedReactTypescript(__dirname);
```

## Configs

| File                      | Scope                                  |
| ------------------------- | -------------------------------------- |
| `base.js`                 | TypeScript + React rules (primary)     |
| `markdown.js`             | Rules for `.md` code fences            |
| `node.js`                 | Node.js / CommonJS scripts             |
| `package-restrictions.js` | Import restriction rules               |
| `feature-analytics.js`    | Opt-in feature analytics boundary rule |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).

## Feature Analytics Guards

Enable `@odh-dashboard/no-direct-analytics` for migrated source and unit tests; leave
infrastructure, host adapters, and Cypress observation outside the selected files.

```js
const eslintConfig = require('@odh-dashboard/eslint-config');

const config = eslintConfig.recommendedReactTypescript(__dirname);

module.exports = {
  ...config,
  overrides: [
    ...config.overrides,
    {
      files: ['src/migrated/**/*.{ts,tsx}'],
      ...eslintConfig.featureAnalytics,
    },
  ],
};
```

The custom rule preserves existing built-in restrictions. It blocks legacy host adapters,
all `@odh-dashboard/analytics` imports and subpaths, Segment SDK imports, and direct analytics globals.
Shared property types and `TrackingOutcome` from `@odh-dashboard/ui-core` or
`@odh-dashboard/ui-core/types/analytics` remain allowed.
Dynamic `import()`, `require()`, indirect aliases, and nonliteral computed access are outside
its scope.
