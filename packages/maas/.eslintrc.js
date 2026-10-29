module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: [
      // Include dotfile directories that contain markdown
      '!.github',
      // Ignore non-JS/TS files in api (OpenAPI specs)
      'api/**/*',
      // Ignore Go backend files but allow markdown
      'bff/**/*',
      '!bff/**/*.md',
      // Ignore frontend (has its own eslint config) but allow markdown
      'frontend/**/*',
      '!frontend/**/*.md',
    ],
    overrides: [
      {
        files: ['types/ModelAccessPage.d.ts', 'types/ModelAccessSubscriptionPage.d.ts'],
        rules: {
          // Hand-written declaration shim; no blank line is needed after the single import.
          'import/newline-after-import': 'off',
        },
      },
    ],
  })
  .recommendedReactTypescript(__dirname);
