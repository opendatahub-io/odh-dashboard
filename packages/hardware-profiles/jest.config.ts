import config from '@odh-dashboard/jest-config';

export default {
  ...config,
  clearMocks: true,
  collectCoverageFrom: ['shared/**/*.{ts,tsx}', ...config.collectCoverageFrom],
};
