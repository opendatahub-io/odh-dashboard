const { recommendedReactTypescript } = require('@odh-dashboard/eslint-config');

const config = recommendedReactTypescript(__dirname);

module.exports = {
  ...config,
  overrides: [
    ...(config.overrides || []),
    {
      files: ['src/**/*.{ts,tsx}'],
      extends: ['@odh-dashboard/eslint-config/feature-analytics'],
    },
  ],
};
