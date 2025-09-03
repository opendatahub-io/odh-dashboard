// Jest type extensions for contract testing
declare namespace jest {
  interface Matchers<R> {
    toMatchContract: (schema: Record<string, unknown>, options?: Record<string, unknown>) => R;
  }
}
