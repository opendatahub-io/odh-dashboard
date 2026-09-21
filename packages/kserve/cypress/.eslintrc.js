module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    extends: ['plugin:cypress/recommended'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@patternfly/**'],
              message:
                'Cypress tests should only import mocks and types from outside the Cypress test directory.',
            },
          ],
        },
      ],
    },
    overrides: [
      {
        files: ['**/*.ts'],
        rules: {
          '@typescript-eslint/consistent-type-assertions': 'off',
          '@typescript-eslint/consistent-type-imports': 'error',
        },
      },
    ],
  })
  .recommendedTypescript(__dirname);
