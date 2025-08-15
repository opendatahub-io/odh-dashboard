module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    rules: {
      'no-barrel-files/no-barrel-files': 'off',

      // TODO enable once the dependency cycle with @odh-dashboard/internal is resolved
      'import/no-extraneous-dependencies': 'off',
    },
  })
  .recommendedReactTypescript(__dirname);
