module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['cypress/'],
    overrides: [
      {
        files: ['src/shared/index.ts', 'src/shared/components/index.ts'],
        rules: {
          'no-barrel-files/no-barrel-files': 'off',
        },
      },
    ],
  })
  .recommendedReactTypescript(__dirname);
