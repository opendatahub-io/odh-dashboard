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
      '@odh-dashboard/no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '!@odh-dashboard/app-config',
                '!@odh-dashboard/app-config/**',
                '!@odh-dashboard/plugin-core',
                '!@odh-dashboard/plugin-core/**',
                '!@odh-dashboard/jest-config',
                '!@odh-dashboard/jest-config/**',
                '!@odh-dashboard/tsconfig',
                '!@odh-dashboard/tsconfig/**',
                '!@odh-dashboard/eslint-config',
                '!@odh-dashboard/eslint-config/**',
                '!@odh-dashboard/*/extension-points',
                '@odh-dashboard/**',
              ],
              message: 'Feature imports are restricted. Use extensions instead.',
            },
          ],
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
        files: ['./__mocks__/**'],
        rules: {
          '@odh-dashboard/no-restricted-imports': 'off',
          'no-restricted-imports': 'off',
        },
      },
    ],
  })
  .recommendedTypescript(__dirname);
