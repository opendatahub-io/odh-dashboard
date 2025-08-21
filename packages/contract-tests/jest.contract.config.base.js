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

  // Module resolution - extending from parent config and adding our paths
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@odh-dashboard/contract-testing$': require('path').resolve(__dirname, 'src/index.ts'),
    '^@odh-dashboard/contract-testing/(.*)$': require('path').resolve(__dirname, 'src/$1'),
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],

  // HTML Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: process.env.PACT_TEST_RESULTS_DIR || './contract-test-results/latest',
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
        useCSSFile: true,
        styleOverridePath: require('path').resolve(__dirname, 'report-style.css'),
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
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: process.env.PACT_TEST_RESULTS_DIR || './contract-test-results/latest',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
};