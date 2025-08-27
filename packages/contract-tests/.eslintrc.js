module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    rules: {
      // Keep console in setup & helpers
      'no-console': 'off',
      // Keep other rules enabled; only relax inside matcher impl as needed
    },
    overrides: [
      {
        files: ['src/matchers/**/*.ts'],
        rules: {
          // Allow focused typing flexibility inside matcher implementation only
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/consistent-type-assertions': 'off',
        },
      },
    ],
  })
  .recommendedTypescript(__dirname);