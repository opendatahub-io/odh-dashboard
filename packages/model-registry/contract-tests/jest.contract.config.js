const path = require('path');

const baseConfig = require(path.resolve(
  __dirname,
  '../../../packages/contract-tests/jest.contract.config.base.js',
));

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../tsconfig.json',
      },
    ],
  },
};
