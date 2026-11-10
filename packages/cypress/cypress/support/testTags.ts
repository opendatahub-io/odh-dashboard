export type TestOptions = {
  tags?: string[];
  [key: string]: unknown;
};

type TestGlobals = {
  it: Mocha.TestFunction;
  describe: Mocha.SuiteFunction;
  context: Mocha.SuiteFunction;
};

export const mapTestTags = (tags: string[]): string[] =>
  tags.map((tag) => (tag.startsWith('@') ? tag : `@${tag}`));

export const createTestTagFilter = (
  grepTags: string[],
  skipTags: string[],
): { grepIncludedTags: string[]; shouldSkipTest: (tags: string[]) => boolean } => {
  const grepIncludedTags = mapTestTags(grepTags.filter((tag) => !tag.startsWith('--')));
  const excludedTags = mapTestTags([
    ...skipTags,
    ...grepTags.filter((tag) => tag.startsWith('--')).map((tag) => tag.slice(2)),
  ]);

  const shouldSkipTest = (tags: string[]): boolean => {
    const mappedTags = mapTestTags(tags);
    return (
      excludedTags.some((tag) => mappedTags.includes(tag)) ||
      (grepIncludedTags.length > 0 && !grepIncludedTags.some((tag) => mappedTags.includes(tag)))
    );
  };

  return { grepIncludedTags, shouldSkipTest };
};

// Omit static skips and filtered tests before registration so JUnit counts agree
// with the planner. Runtime this.skip() remains a reported pending testcase.
export const installTestTagFilter = (
  target: TestGlobals,
  shouldSkipTest: (tags: string[]) => boolean,
  recordTags: (test: Mocha.Test, tags: string[]) => void,
): void => {
  const suiteStack: { tags: string[]; skipped: boolean }[] = [];

  const wrapSuite = (
    originalSuite: Mocha.SuiteFunction | Mocha.ExclusiveSuiteFunction | Mocha.PendingSuiteFunction,
    skipped = false,
  ): Mocha.SuiteFunction => {
    const wrappedSuite = function suite(
      title: string,
      optionsOrFn: TestOptions | Mocha.Func | Mocha.AsyncFunc,
      fn?: Mocha.Func | Mocha.AsyncFunc,
    ): Mocha.Suite {
      const callSuite = originalSuite as unknown as typeof suite;
      const tags = typeof optionsOrFn === 'object' ? optionsOrFn.tags ?? [] : [];
      suiteStack.push({ tags, skipped });
      try {
        return typeof optionsOrFn === 'function'
          ? callSuite(title, optionsOrFn)
          : callSuite(title, optionsOrFn, fn);
      } finally {
        suiteStack.pop();
      }
    } as Mocha.SuiteFunction;
    Object.assign(wrappedSuite, originalSuite);
    return wrappedSuite;
  };

  const wrapTest = (
    originalIt: Mocha.TestFunction | Mocha.ExclusiveTestFunction,
  ): Mocha.TestFunction => {
    const wrappedIt = function test(
      title: string,
      optionsOrFn?: TestOptions | Mocha.Func | Mocha.AsyncFunc,
      fn?: Mocha.Func | Mocha.AsyncFunc,
    ): Mocha.Test {
      const ownTags = typeof optionsOrFn === 'object' ? optionsOrFn.tags ?? [] : [];
      const tags = [...suiteStack.flatMap((suite) => suite.tags), ...ownTags];
      if (suiteStack.some((suite) => suite.skipped) || shouldSkipTest(tags)) {
        return undefined as unknown as Mocha.Test;
      }
      const callTest = originalIt as unknown as typeof test;
      const registered =
        typeof optionsOrFn === 'function'
          ? callTest(title, optionsOrFn)
          : callTest(title, optionsOrFn, fn);
      recordTags(registered, tags);
      return registered;
    } as Mocha.TestFunction;
    Object.assign(wrappedIt, originalIt);
    return wrappedIt;
  };

  for (const name of ['describe', 'context'] as const) {
    const originalSuite = target[name];
    const wrappedSuite = wrapSuite(originalSuite);
    wrappedSuite.only = wrapSuite(originalSuite.only);
    wrappedSuite.skip = wrapSuite(originalSuite.skip, true);
    Object.assign(target, { [name]: wrappedSuite });
  }
  const originalIt = target.it;
  const wrappedIt = wrapTest(originalIt);
  wrappedIt.only = wrapTest(originalIt.only);
  wrappedIt.skip = (() => undefined) as unknown as typeof originalIt.skip;
  Object.assign(target, { it: wrappedIt });
};
