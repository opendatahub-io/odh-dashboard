import baseConfig from '@odh-dashboard/jest-config';

export default {
  ...baseConfig,
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    'shared/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/*.spec.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
