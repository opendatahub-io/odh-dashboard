module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['upstream'],
  })
  .recommendedReactTypescript(__dirname);
