const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: path.join(__dirname, 'tsconfig.preset.json')
    }]
  },
  moduleNameMapper: {
    // Handle module resolution for contract-testing utilities
    '^@odh-dashboard/contract-tests(.*)$': path.join(__dirname, 'src$1'),
    // Handle relative imports within the contract-tests directory
    '^(\\.\\./)*src/(.*)$': path.join(__dirname, 'src/$2')
  },
  setupFilesAfterEnv: [
    path.join(__dirname, 'setup.preset.js')
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true
};
