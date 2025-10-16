import { TextEncoder, TextDecoder } from 'util';
import { JestAssertionError } from 'expect';
import 'core-js/actual/array/to-sorted';
import { BooleanValues, RenderHookResultExt, createComparativeValue } from './testUtils/hooks';
import '@testing-library/jest-dom';

global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

const tryExpect = (expectFn: () => void) => {
  try {
    expectFn();
  } catch (e) {
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

// Mocks for internal analytics used by gen-ai specs
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  __esModule: true,
  fireFormTrackingEvent: jest.fn(),
  fireLinkTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
  fireSimpleTrackingEvent: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties', () => ({
  __esModule: true,
  TrackingOutcome: {
    submit: 'submit',
    cancel: 'cancel',
  },
}));
