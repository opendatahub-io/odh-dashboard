// Jest type extensions for contract testing
// This file is automatically included when importing @odh-dashboard/contract-tests

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchContract: (schema: Record<string, unknown>, options?: Record<string, unknown>) => R;
    }
  }
}

export {};
