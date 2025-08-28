const base = require('@odh-dashboard/eslint-config');

const extended = base.extend({
  rules: {
    // Allow console in setup/helpers only via targeted inline disables when necessary
  },
  overrides: [
    {
      files: ['**/*.md'],
      rules: {
        'import/newline-after-import': 'off',
      },
    },
  ],
});

module.exports = extended.recommendedTypescript(__dirname);
