module.exports = require('@odh-dashboard/eslint-config')
  .extend({ ignorePatterns: ['cypress/'] })
  .recommendedReactTypescript(__dirname);
