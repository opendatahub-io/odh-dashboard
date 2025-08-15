module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/*.contract.test.{ts,js}'],
  testTimeout: 30000,
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Module resolution - extending from parent config
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/upstream/frontend/src/$1',
    '^@odh-dashboard/pact-testing$': '<rootDir>/../pact-testing/src/index',
    '^@odh-dashboard/pact-testing/(.*)$': '<rootDir>/../pact-testing/src/$1',
  },

  // TypeScript configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],

  // Jest globals and types
  globals: {
    'ts-jest': {
      tsconfig: {
        types: ['jest', 'node'],
      },
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],

  // Coverage settings
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.d.ts', '!**/*.contract.test.{ts,tsx}'],

  // Clear mocks between tests
  clearMocks: true,

  // Enhanced test output
  verbose: true,
  silent: false,

  // HTML Reporter configuration (similar to Cypress mochawesome)
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: process.env.PACT_TEST_RESULTS_DIR || './pact/pact-test-results/latest',
        filename: 'contract-test-report.html',
        expand: true,
        pageTitle: 'Model Registry Contract Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        // Custom styling similar to Cypress reports
        customInfos: [
          { title: 'Project', value: 'ODH Dashboard - Model Registry' },
          { title: 'Test Type', value: 'API Contract Tests' },
          { title: 'Backend', value: 'Mock BFF Server' },
          { title: 'Schema Validation', value: 'OpenAPI + JSON Schema' },
        ],
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: process.env.PACT_TEST_RESULTS_DIR || './pact/pact-test-results/latest',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles for debugging
  detectOpenHandles: true,
};
