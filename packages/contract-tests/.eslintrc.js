const base = require('@odh-dashboard/eslint-config');

const extended = base.extend({
  ignorePatterns: ['README.md', 'setup.base.ts'],
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
    {
      files: ['src/utils/api-client.ts'],
      rules: {
        '@typescript-eslint/no-unnecessary-condition': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
      },
    },
  ],
});

module.exports = extended.recommendedTypescript(__dirname);
