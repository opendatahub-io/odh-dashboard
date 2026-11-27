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

| File                      | Scope                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `base.js`                 | TypeScript + React rules (primary)                                     |
| `markdown.js`             | Rules for `.md` code fences                                            |
| `node.js`                 | Node.js / CommonJS scripts                                             |
| `package-restrictions.js` | Import restriction rules                                               |
| `feature-analytics.js`    | Feature analytics boundary preset for shared and custom ESLint configs |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).

## Feature Analytics Guards

The `recommendedCore`, `recommendedTypescript`, and `recommendedReactTypescript` profiles
enable `@odh-dashboard/no-direct-analytics` at error severity for source and unit-test
files by default; no additional override is needed when using these profiles. Custom ESLint
configs that do not use these profiles should extend the preset in their existing `overrides`
array, as shown below. Keep exceptions file-scoped for analytics implementation, composition
roots, host adapters, and Cypress observation.

```js
module.exports = {
  overrides: [
    {
      files: ['src/**/*.{js,jsx,ts,tsx}'],
      excludedFiles: ['src/__tests__/cypress/**'],
      extends: ['@odh-dashboard/eslint-config/feature-analytics'],
    },
  ],
};
```

The custom rule preserves existing built-in restrictions. It blocks legacy host adapters,
analytics implementation/SDK imports, and direct analytics globals. The exact `@odh-dashboard/analytics/types`
entry point is allowed for SDK-free contracts and `TrackingOutcome`, and
`@odh-dashboard/analytics/react` for SDK-free providers/hooks. The exact
`@odh-dashboard/analytics/standalone` entry point is blocked by default; disable the rule
only for standalone bootstrap files through a file-specific override.
Dynamic `import()`, `require()`, indirect aliases, and nonliteral computed access are outside
its scope.
