const baseConfig = require('../../../../packages/pact-testing/jest.contract.config.base.js');

module.exports = {
  ...baseConfig,

  // Module resolution - extending from parent config
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/upstream/frontend/src/$1',
    '^@odh-dashboard/pact-testing$': '<rootDir>/../../../../packages/pact-testing/src/index.ts',
    '^@odh-dashboard/pact-testing/(.*)$': '<rootDir>/../../../../packages/pact-testing/src/$1',
  },

  // Jest globals and types
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

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
};
