module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    rules: {
      'no-barrel-files/no-barrel-files': 'off',
    },
    overrides: [
      {
        // Analytics package owns the concrete Segment implementation and host adapters.
        files: ['src/**/*.{ts,tsx}'],
        excludedFiles: ['src/types.ts', 'src/react/**/*.{ts,tsx}', 'src/__tests__/**/*.{ts,tsx}'],
        rules: { '@odh-dashboard/no-direct-analytics': 'off' },
      },
      {
        // Implementation tests exercise the concrete adapter and SDK stub.
        files: ['src/__tests__/**/*.{ts,tsx}'],
        rules: { '@odh-dashboard/no-direct-analytics': 'off' },
      },
      {
        // Documentation examples illustrate the concrete API.
        files: ['**/*.md', '**/*.md/*.js', '**/*.md/*.jsx', '**/*.md/*.ts', '**/*.md/*.tsx'],
        rules: { '@odh-dashboard/no-direct-analytics': 'off' },
      },
    ],
  })
  .recommendedTypescript(__dirname);
