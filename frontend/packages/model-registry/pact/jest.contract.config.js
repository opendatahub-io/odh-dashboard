const baseConfig = require('../../../../packages/pact-testing/jest.contract.config.base.js');

module.exports = {
  ...baseConfig,

  // Module resolution - extending from parent config
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/upstream/frontend/src/$1',
    '^@odh-dashboard/pact-testing$': '<rootDir>/../../../../packages/pact-testing/src/index.ts',
    '^@odh-dashboard/pact-testing/(.*)$': '<rootDir>/../../../../packages/pact-testing/src/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
