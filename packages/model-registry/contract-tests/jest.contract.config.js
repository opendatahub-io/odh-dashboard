const path = require('path');

const baseConfig = require(path.resolve(
  __dirname,
  '../../../packages/contract-tests/jest.contract.config.base.js',
));

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: [
    ...((baseConfig && baseConfig.setupFilesAfterEnv) || []),
    '<rootDir>/jest.setup.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@odh-dashboard/contract-testing/setup.base$': '<rootDir>/../../contract-tests/setup.base.ts',
    '^@odh-dashboard/contract-testing$': '<rootDir>/../../contract-tests/src/index.ts',
    '^@odh-dashboard/contract-testing/(.*)$': '<rootDir>/../../contract-tests/src/$1',
  },
};
