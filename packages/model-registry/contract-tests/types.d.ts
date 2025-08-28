/* Global Jest matcher augmentation for contract tests */
declare namespace jest {
  interface Matchers<R> {
    toMatchContract: (
      schema: Record<string, unknown>,
      options?: {
        ref?: string;
        expectedStatus?: number;
        expectedHeaders?: Record<string, string | RegExp>;
      },
    ) => R;
  }
}
