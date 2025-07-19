module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['upstream'],
  })
  .reactTypescript(__dirname);
