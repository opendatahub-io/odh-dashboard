// Jest type extensions for contract tests in model-registry
declare namespace jest {
  interface Matchers<R> {
    toMatchContract: (schema: Record<string, unknown>, options?: Record<string, unknown>) => R;
  }
}
