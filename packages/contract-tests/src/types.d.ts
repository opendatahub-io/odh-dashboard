// Type declarations for external modules
declare module 'openapi-response-validator';
declare module '@apidevtools/json-schema-ref-parser';

// Type declarations for Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchContract: (schema: Record<string, unknown>, options?: Record<string, unknown>) => R;
    }
  }
}
