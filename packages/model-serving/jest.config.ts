import baseConfig from '@odh-dashboard/jest-config';

export default {
  ...baseConfig,
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    'modelRegistry/**/*.{ts,tsx}',
    '!modelRegistry/**/__tests__/**',
  ],
};
