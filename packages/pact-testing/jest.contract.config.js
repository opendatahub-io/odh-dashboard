const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  testMatch: ['**/*.contract.test.ts'],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: process.env.JEST_HTML_REPORTERS_PUBLIC_PATH || './pact-test-results/latest',
        filename: process.env.JEST_HTML_REPORTERS_FILE_NAME || 'contract-test-report.html',
        expand: process.env.JEST_HTML_REPORTERS_EXPAND === 'true',
        pageTitle: process.env.JEST_HTML_REPORTERS_PAGE_TITLE || 'Contract Test Report',
        hideIcon: process.env.JEST_HTML_REPORTERS_HIDE_ICON === 'true',
        includeFailureMsg: process.env.JEST_HTML_REPORTERS_INCLUDE_FAILURE_MSG === 'true',
        includeConsoleLog: process.env.JEST_HTML_REPORTERS_INCLUDE_CONSOLE_LOG === 'true',
        includeCoverageReport: process.env.JEST_HTML_REPORTERS_INCLUDE_COVERAGE_REPORT === 'true',
        inlineSource: process.env.JEST_HTML_REPORTERS_INLINE_SOURCE === 'true',
        darkTheme: process.env.JEST_HTML_REPORTERS_DARK_THEME === 'true',
        useCSSFile: process.env.JEST_HTML_REPORTERS_USE_CSS_FILE === 'true',
        json: process.env.JEST_HTML_REPORTERS_JSON === 'true',
        customInfos: [
          { title: 'Project', value: 'ODH Dashboard' },
          { title: 'Test Type', value: 'API Contract Tests' },
          { title: 'Backend', value: 'Mock BFF Server' },
          { title: 'Schema Validation', value: 'OpenAPI + JSON Schema' },
          { title: 'Test Environment', value: process.env.CI ? 'CI' : 'Local' },
          { title: 'Node Version', value: process.version },
          { title: 'Package Name', value: process.env.PACKAGE_NAME || 'Unknown' },
          { title: 'Test Time', value: new Date().toLocaleString() },
        ],
      },
    ],
  ],
};
