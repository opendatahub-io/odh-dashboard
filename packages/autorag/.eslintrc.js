module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: [
      // Include dotfile directories that contain markdown
      '!.github',
      // Ignore non-JS/TS files in api (OpenAPI specs)
      'api/**/*',
      // Ignore Go sources; do not ignore bff markdown (lint-staged runs ESLint
      // on *.md and fails if the file is reported as ignored).
      'bff/**/*.go',
      'bff/go.mod',
      'bff/go.sum',
      // Ignore frontend (has its own eslint config) but allow markdown
      'frontend/**/*',
      '!frontend/**/*.md',
    ],
  })
  .recommendedReactTypescript(__dirname);
