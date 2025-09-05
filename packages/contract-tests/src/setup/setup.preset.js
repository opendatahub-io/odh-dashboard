/* eslint-env jest */
// Minimal setup for contract tests
process.env.NODE_ENV = 'test';
jest.setTimeout(30000);
afterEach(() => {
  jest.clearAllMocks();
});
