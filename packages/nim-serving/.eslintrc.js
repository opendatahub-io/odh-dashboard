const eslintConfig = require('@odh-dashboard/eslint-config');

const config = eslintConfig.recommendedReactTypescript(__dirname);

module.exports = {
  ...config,
  overrides: [
    ...config.overrides,
    { files: ['src/**/*.{ts,tsx}'], ...eslintConfig.featureAnalytics },
  ],
};
