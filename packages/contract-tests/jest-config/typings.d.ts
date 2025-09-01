// Consolidated Jest typings for shared config consumers
// Provide legacy custom matcher typings used across frontend unit tests

declare global {
  namespace jest {
    interface Matchers<R> {
      hookToBeStable: (expected?: unknown) => R;
      hookToHaveUpdateCount: (expected: number) => R;
      hookToStrictEqual: (expected: unknown) => R;
    }
  }
}

export {};
