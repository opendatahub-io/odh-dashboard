module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['src', '@mf-types'],
  })
  .recommendedTypescript(__dirname);
