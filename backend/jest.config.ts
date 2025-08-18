export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'jest-coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
