module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['frontend'],
    overrides: [
      {
        files: ['types/MaaSModelsPageProvider.d.ts'],
        rules: {
          // TypeScript's declaration emitter does not insert this blank line.
          'import/newline-after-import': 'off',
        },
      },
    ],
  })
  .recommendedReactTypescript(__dirname);
