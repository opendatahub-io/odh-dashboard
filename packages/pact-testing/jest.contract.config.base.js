const baseConfig = require('./jest.config.base.ts').default;

module.exports = {
  ...baseConfig,
  
  // Module resolution - extending from parent config
  moduleNameMapper: {
    '^@odh-dashboard/pact-testing$': '<rootDir>/../../pact-testing/src/index.ts',
    '^@odh-dashboard/pact-testing/(.*)$': '<rootDir>/../../pact-testing/src/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],

  // HTML Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: process.env.PACT_TEST_RESULTS_DIR || './pact-test-results/latest',
        filename: 'contract-test-report.html',
        expand: true,
        pageTitle: 'Contract Test Report',
        hideIcon: false,
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        customInfos: [
          { title: 'Project', value: 'ODH Dashboard' },
          { title: 'Test Type', value: 'API Contract Tests' },
          { title: 'Backend', value: 'Mock BFF Server' },
          { title: 'Schema Validation', value: 'OpenAPI + JSON Schema' },
        ],
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: process.env.PACT_TEST_RESULTS_DIR || './pact-test-results/latest',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
};
