export default {
  transform: {
    node_modules: 'ts-jest',
  },
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'jest-coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
