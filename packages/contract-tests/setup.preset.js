// Global setup for contract tests
require('@odh-dashboard/contract-tests/setup');

// Set up test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  // Clean up any global state
  jest.clearAllMocks();
});

// Global teardown
afterAll(() => {
  // Clean up any remaining resources
});
