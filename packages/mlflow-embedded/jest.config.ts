import baseConfig from '@odh-dashboard/jest-config';

export default {
  ...baseConfig,
  collectCoverageFrom: [
    'extensions.ts',
    'mcp-registry/**/*.{ts,tsx}',
    'experiments/**/*.{ts,tsx}',
    'prompts/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/*.spec.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
