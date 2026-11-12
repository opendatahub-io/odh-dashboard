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
analytics implementation/SDK imports, and direct analytics globals. The exact `@odh-dashboard/analytics/types`
entry point is allowed for SDK-free contracts and `TrackingOutcome`, and
`@odh-dashboard/analytics/react` for SDK-free providers/hooks. The exact
`@odh-dashboard/analytics/standalone` entry point is allowed for standalone bootstrap compatibility
wiring. Implementation imports, deeper
subpaths, and similarly prefixed analytics paths remain blocked.
Dynamic `import()`, `require()`, indirect aliases, and nonliteral computed access are outside
its scope.
