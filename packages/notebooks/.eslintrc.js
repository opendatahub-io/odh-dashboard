module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['upstream/**/*', 'upstream'],
  })
  .recommendedReactTypescript(__dirname);
