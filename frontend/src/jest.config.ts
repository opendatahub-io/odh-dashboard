import config from '@odh-dashboard/jest-config';

export default {
  ...config,
  clearMocks: true,
  collectCoverageFrom: [...config.collectCoverageFrom, '**/*.{ts,tsx}'],
};
