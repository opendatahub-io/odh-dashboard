export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'jest-coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { isolatedModules: true } }],
  },
};
