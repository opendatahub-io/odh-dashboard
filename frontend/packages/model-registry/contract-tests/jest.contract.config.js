const baseConfig = require('../../../../packages/contract-tests/jest.contract.config.base.js');

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          baseUrl: '<rootDir>/../../../../',
          paths: {
            '@odh-dashboard/contract-testing': ['packages/contract-tests/src/index.ts'],
            '@odh-dashboard/contract-testing/*': ['packages/contract-tests/src/*'],
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@odh-dashboard/contract-testing$':
      '<rootDir>/../../../../packages/contract-tests/src/index.ts',
    '^@odh-dashboard/contract-testing/(.*)$':
      '<rootDir>/../../../../packages/contract-tests/src/$1',
  },
};
