module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: ['third_party/mlmd', 'packages', '__tests__/cypress'],
    rules: {
      'no-relative-import-paths/no-relative-import-paths': [
        'warn',
        {
          allowSameFolder: true,
          rootDir: '.',
          prefix: '#~',
        },
      ],
    },
    overrides: [
      {
        files: ['./api/**'],
        rules: {
          'no-restricted-imports': [
            'off',
            {
              patterns: ['#~/api/**'],
            },
          ],
        },
      },
      {
        files: ['./__mocks__/mlmd/**'],
        rules: {
          'no-restricted-imports': 'off',
        },
      },
    ],
  })
  .recommendedTypescript(__dirname);
