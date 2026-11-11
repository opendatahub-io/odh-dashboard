const { recommendedReactTypescript, featureAnalytics } = require('@odh-dashboard/eslint-config');

const config = recommendedReactTypescript(__dirname);
module.exports = {
  ...config,
  overrides: [...(config.overrides || []), { files: ['src/**/*.{ts,tsx}'], ...featureAnalytics }],
};
