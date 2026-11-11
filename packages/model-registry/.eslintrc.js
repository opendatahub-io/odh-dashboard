const eslintConfig = require('@odh-dashboard/eslint-config');

module.exports = eslintConfig
  .extend({
    ignorePatterns: ['upstream/**/*', 'upstream'],
    overrides: [
      {
        files: ['src/**/*.{ts,tsx}'],
        ...eslintConfig.featureAnalytics,
      },
    ],
  })
  .recommendedReactTypescript(__dirname);
