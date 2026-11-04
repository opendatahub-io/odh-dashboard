import sharedConfig from '@odh-dashboard/jest-config';

export default {
  ...sharedConfig,
  // The upstream/ subtree keeps its own ts-jest suites (with `~/` path mapping)
  // and contract-tests/ runs under the @odh-dashboard/contract-tests preset —
  // neither must run under this package's babel config. Keep the default
  // node_modules exclusion while ignoring both.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/upstream/', '<rootDir>/contract-tests/'],
};
