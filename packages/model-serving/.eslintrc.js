const eslintConfig = require('@odh-dashboard/eslint-config');

module.exports = eslintConfig
  .extend({
    ignorePatterns: ['cypress/'],
    overrides: [
      {
        files: ['{src,modelRegistry}/**/*.{ts,tsx}'],
        ...eslintConfig.featureAnalytics,
      },
      {
        files: ['src/shared/index.ts', 'src/shared/components/index.ts'],
        rules: {
          'no-barrel-files/no-barrel-files': 'off',
        },
      },
    ],
  })
  .recommendedReactTypescript(__dirname);
