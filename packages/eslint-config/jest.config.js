// The shared jest-config depends on eslint-config; keep this tooling suite
// independent to avoid a workspace dependency cycle.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).?([mc])[cjt]s?(x)'],
  transform: {},
  collectCoverageFrom: [
    '**/*.{js,cjs}',
    '!**/__tests__/**',
    '!**/*.{spec,test}.{js,cjs}',
    '!**/__fixtures__/**',
    '!**/__mocks__/**',
    '!**/*.config.{js,cjs}',
    '!**/.eslintrc.{js,cjs}',
    '!**/node_modules/**',
    '!jest-coverage/**',
  ],
  coverageDirectory: 'jest-coverage',
  coverageReporters: ['json', 'lcov'],
};
