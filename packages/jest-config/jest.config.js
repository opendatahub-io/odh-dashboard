// Compose shared contract-tests Jest config and add package-specific setup (hook matchers)
// Using JS here to avoid TypeScript type-assertion lint issues
const base =
  require('@odh-dashboard/contract-tests/jest-config').default ||
  require('@odh-dashboard/contract-tests/jest-config');

module.exports = {
  ...base,
  setupFilesAfterEnv: [
    ...(base.setupFilesAfterEnv || []),
    require.resolve('./config/jest.setup.ts'),
  ],
  moduleNameMapper: { ...(base.moduleNameMapper || {}) },
};
