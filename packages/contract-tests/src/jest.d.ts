// Jest type extensions for contract tests
declare namespace jest {
  interface Matchers<R> {
    toMatchContract: (schema: Record<string, unknown>, options?: Record<string, unknown>) => R;
  }
}
