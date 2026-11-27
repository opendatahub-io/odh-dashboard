const eslintConfig = require('@odh-dashboard/eslint-config');

module.exports = eslintConfig
  .extend({
    ignorePatterns: ['upstream/**/*', 'upstream'],
  })
  .recommendedReactTypescript(__dirname);
