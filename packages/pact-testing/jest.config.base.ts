// Base Jest configuration for pact-testing that can be extended by individual modules
export default {
  testMatch: ['**/*.contract.test.{ts,js}'],
  testTimeout: 30000,
  preset: 'ts-jest',
  testEnvironment: 'node',

  // TypeScript configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.json'
    }],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],

  // Coverage settings
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.d.ts', '!**/*.contract.test.{ts,tsx}'],

  // Clear mocks between tests
  clearMocks: true,

  // Enhanced test output
  verbose: true,
  silent: false,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles for debugging
  detectOpenHandles: true,
};
