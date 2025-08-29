// Basic setup for contract tests
export const setupContractTests = (): void => {
  // This can be extended with any global setup needed
  console.log('Contract tests setup complete');
};

// Export utilities that teams might need
export * from './api-client';
export * from './schema-validator';
export * from './bff-health';
export * from './logging';
export * from './matchers';
