import '@testing-library/jest-dom';
import { TextEncoder } from 'util';
import { JestAssertionError } from 'expect';
import 'core-js/actual/array/to-sorted';

import { createComparativeValue } from '../src/hooks';
import type { BooleanValues, RenderHookResultExt } from '../types';

// duplicates removed above

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.TextEncoder = TextEncoder;

// Mock webpack-injected global variables
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/naming-convention
  var __COMMIT_HASH__: string;
}
globalThis.__COMMIT_HASH__ = 'test-commit-hash';

const tryExpect = (expectFn: () => void) => {
  try {
    expectFn();
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const { matcherResult } = e as JestAssertionError;
    if (matcherResult) {
      return { ...matcherResult, message: () => matcherResult.message };
    }
    throw e;
  }
  return {
    pass: true,
    message: () => '',
  };
};

expect.extend({
  // custom asymmetric matchers

  /**
   * Checks that a value is what you expect.
   * It uses Object.is to check strict equality.
   *
   * Usage:
   * expect.isIdentifyEqual(...)
   */
  isIdentityEqual: (actual, expected) => ({
    pass: Object.is(actual, expected),
    message: () => `expected ${actual} to be identity equal to ${expected}`,
  }),

  // hook related custom matchers
  hookToBe: (actual: RenderHookResultExt<unknown, unknown>, expected) =>
    tryExpect(() => expect(actual.result.current).toBe(expected)),

  hookToStrictEqual: (actual: RenderHookResultExt<unknown, unknown>, expected) =>
    tryExpect(() => expect(actual.result.current).toStrictEqual(expected)),

  hookToHaveUpdateCount: (actual: RenderHookResultExt<unknown, unknown>, expected: number) =>
    tryExpect(() => expect(actual.getUpdateCount()).toBe(expected)),

  hookToBeStable: <R>(actual: RenderHookResultExt<R, unknown>, expected?: BooleanValues<R>) => {
    if (actual.getUpdateCount() <= 1) {
      throw new Error('Cannot assert stability as the hook has not run at least 2 times.');
    }
    if (typeof expected === 'undefined') {
      return tryExpect(() => expect(actual.result.current).toBe(actual.getPreviousResult()));
    }
    return tryExpect(() =>
      expect(actual.result.current).toStrictEqual(
        createComparativeValue(actual.getPreviousResult(), expected),
      ),
    );
  },
});
