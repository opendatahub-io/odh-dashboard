// Try to load compiled JS config first
let baseConfig;
try {
  baseConfig = require('./jest.config.base.js');
} catch (e) {
  // If JS config not found, try TS config
  try {
    require('ts-node/register');
    baseConfig = require('./jest.config.base.ts').default;
  } catch (tsError) {
    throw new Error(
      'Could not load Jest base config. Ensure either jest.config.base.js exists ' +
      'or ts-node is available to load jest.config.base.ts.\n' +
      'Original error: ' + (tsError.message || e.message)
    );
  }
}

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
        includeObsoleteSnapshots: false,
        includeCoverageReport: true,
        inlineSource: true,
        darkTheme: false,
        openReport: !process.env.CI,
        useCSSFile: false,
        // Save test results as JSON for CI processing
        json: true,

        // Enhanced metadata
        customInfos: [
          { title: 'Project', value: 'ODH Dashboard' },
          { title: 'Package', value: process.env.PACKAGE_NAME || 'Unknown' },
          { title: 'Test Type', value: 'API Contract Tests' },
          { title: 'Backend', value: 'Mock BFF Server' },
          { title: 'Schema Validation', value: 'OpenAPI + JSON Schema' },
          { title: 'Test Environment', value: process.env.CI ? 'CI' : 'Local' },
          { title: 'Test Time', value: new Date().toISOString() },
          { title: 'Node Version', value: process.version },
          { title: 'Test Runner', value: 'Jest' },
          { title: 'Test Framework', value: 'Contract Tests with Mock BFF' },
        ],

        // Enhanced styling
        styleOverrides: {
          'html, body': {
            'font-family': '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
          },
          '.suite-info': {
            'margin-bottom': '1rem',
            padding: '1rem',
            'background-color': '#f6f8fa',
            'border-radius': '6px',
          },
          '.test-case': {
            'margin-bottom': '0.5rem',
            padding: '0.5rem',
            'border-left': '4px solid #2da44e',
          },
          '.test-case.failed': {
            'border-left-color': '#cf222e',
          },
          '.console-message': {
            'font-family': 'ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace',
            'font-size': '85%',
            padding: '0.5rem',
            'background-color': '#f6f8fa',
            'border-radius': '6px',
            margin: '0.5rem 0',
          },
        },
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