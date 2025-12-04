module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    rules: {
      camelcase: 'off',
    },
  })
  .recommendedReactTypescript(__dirname);
