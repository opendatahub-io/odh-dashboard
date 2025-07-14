import config from '@odh-dashboard/jest-config';

const ignorePatterns = ['<rootDir>/__tests__/cypress/'];

export default {
  ...config,
  testPathIgnorePatterns: ignorePatterns,
  modulePathIgnorePatterns: ignorePatterns,
  clearMocks: true,
};
