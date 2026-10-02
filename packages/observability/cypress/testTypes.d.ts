type ObservabilityTestOptions = {
  tags?: string[];
  [key: string]: unknown;
};

declare global {
  interface Window {
    it: Mocha.TestFunction & {
      (
        name: string,
        options: ObservabilityTestOptions,
        fn?: Mocha.AsyncFunc | Mocha.Func,
      ): Mocha.Test;
    };
  }
}

export {};
