// Compose shared contract-tests Jest config and add package-specific setup (hook matchers)
// eslint-disable-next-line import/no-extraneous-dependencies
import base from '@odh-dashboard/contract-tests/jest-config';

const config = {
  ...base,
  setupFilesAfterEnv: [...base.setupFilesAfterEnv, require.resolve('./config/jest.setup.ts')],
  moduleNameMapper: {
    ...base.moduleNameMapper,
  },
};

export default config;
