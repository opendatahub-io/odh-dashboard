module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    rules: {
      'no-barrel-files/no-barrel-files': 'off',
    },
  })
  .recommendedReactTypescript(__dirname);
