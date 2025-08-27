const baseConfig = require('../../../../packages/contract-tests/jest.contract.config.base.js');

module.exports = {
  ...baseConfig,

  // Module resolution - extending from parent config
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/../../../../frontend/src/$1',
    '^@odh-dashboard/contract-testing$':
      '<rootDir>/../../../../packages/contract-tests/src/index.ts',
    '^@odh-dashboard/contract-testing/(.*)$':
      '<rootDir>/../../../../packages/contract-tests/src/$1',
  },

  // Ensure ts-jest uses the contract-tests tsconfig for path mapping
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },

  // Setup files - use shared setup via local setup wrapper
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
