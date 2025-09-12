const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/contract-tests/**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/upstream/'],
  transform: {
    '^.+\\.ts$': ['ts-jest'],
  },
  testTimeout: 5000,
  verbose: true,
  // Ensure Jest runs from the consumer package directory
  rootDir: process.cwd(),
  // HTML report via jest-html-reporters (as per PR #4723)
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath:
          process.env.JEST_HTML_REPORTERS_PUBLIC_PATH ||
          process.env.CONTRACT_TEST_RESULTS_DIR ||
          './contract-test-results',
        filename: process.env.JEST_HTML_REPORTERS_FILE_NAME || 'contract-test-report.html',
        expand: String(process.env.JEST_HTML_REPORTERS_EXPAND) === 'true',
        pageTitle: process.env.JEST_HTML_REPORTERS_PAGE_TITLE || 'Contract Test Report',
        hideIcon: String(process.env.JEST_HTML_REPORTERS_HIDE_ICON) === 'true',
        includeFailureMsg: String(process.env.JEST_HTML_REPORTERS_INCLUDE_FAILURE_MSG) === 'true',
        includeConsoleLog: String(process.env.JEST_HTML_REPORTERS_INCLUDE_CONSOLE_LOG) === 'true',
        includeCoverageReport:
          String(process.env.JEST_HTML_REPORTERS_INCLUDE_COVERAGE_REPORT) === 'true',
        inlineSource: String(process.env.JEST_HTML_REPORTERS_INLINE_SOURCE) === 'true',
        darkTheme: String(process.env.JEST_HTML_REPORTERS_DARK_THEME) === 'true',
        useCSSFile: true,
        styleOverridePath: path.resolve(__dirname, 'src/reporting/report-style.css'),
        json: String(process.env.JEST_HTML_REPORTERS_JSON) === 'true',
        openReport: false, // Never auto-open reports - use test:contract:with-report script instead
      },
    ],
  ],
};
