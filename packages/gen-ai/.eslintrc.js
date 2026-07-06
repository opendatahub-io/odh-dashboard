module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['frontend'],
  })
  .recommendedReactTypescript(__dirname);
