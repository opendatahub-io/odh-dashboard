import {
  renderHook as renderHookRTL,
  RenderHookOptions,
  RenderHookResult,
  waitFor,
  waitForOptions,
} from '@testing-library/react';
import { queries, Queries } from '@testing-library/dom';

/**
 * Set of helper functions used to perform assertions on the hook result.
 */
export type RenderHookResultExpect<Result, Props> = {
  /**
   * Check that a value is what you expect. It uses `Object.is` to check strict equality.
   * Don't use `toBe` with floating-point numbers.
   */
  toBe: (expected: Result) => RenderHookResultExpect<Result, Props>;

  /**
   * Check that the result has the same types as well as structure.
   */
  toStrictEqual: (expected: Result) => RenderHookResultExpect<Result, Props>;

  /**
   * Check the stability of the result.
   * If the expected value is a boolean array, uses `isStableArray` for comparison, otherwise uses `isStable`.
   *
   * Stability is checked against the previous update.
   */
  toBeStable: (expected?: boolean | boolean[]) => RenderHookResultExpect<Result, Props>;

  /**
   * Check the update count is the expected number.
   * Update count increases every time the hook is called.
   */
  toHaveUpdateCount: (expected: number) => RenderHookResultExpect<Result, Props>;
};

/**
 * Extension of RTL RenderHookResult providing functions used query the current state of the result.
 */
export type RenderHookResultExt<Result, Props> = RenderHookResult<Result, Props> & {
  /**
   * Returns `true` if the previous result is equal to the current result. Uses `Object.is` for comparison.
   */
  isStable: () => boolean;

  /**
   * Returns `true` if the previous result array items are equal to the current result array items. Uses `Object.is` for comparison.
   * The equality of the array instances is not checked.
   */
  isStableArray: () => boolean[];

  /**
   * Get the update count for how many times the hook has been rendered.
   * An update occurs initially on render, subsequently when re-rendered, and also whenever the hook itself triggers a re-render.
   * eg. An `useEffect` triggering a state update.
   */
  getUpdateCount: () => number;

  /**
   * Returns a Promise that resolves the next time the hook renders, commonly when state is updated as the result of an asynchronous update.
   *
   * Since `waitForNextUpdate` works using interval checks (backed by `waitFor`), it's possible that multiple updates may occur while waiting.
   */
  waitForNextUpdate: (options?: Pick<waitForOptions, 'interval' | 'timeout'>) => Promise<void>;
};

/**
 * Helper function that wraps a render result and provides a small set of jest Matcher equivalent functions that act directly on the result.
 *
 * ```
 * expectHook(renderResult).toBeStable().toHaveUpdateCount(2);
 * ```
 * Equivalent to:
 * ```
 * expect(renderResult.isStable()).toBe(true);
 * expect(renderResult.getUpdateCount()).toBe(2);
 * ```
 *
 * See `RenderHookResultExpect`
 */
export const expectHook = <Result, Props>(
  renderResult: Pick<
    RenderHookResultExt<Result, Props>,
    'result' | 'getUpdateCount' | 'isStableArray' | 'isStable'
  >,
): RenderHookResultExpect<Result, Props> => {
  const expectUtil: RenderHookResultExpect<Result, Props> = {
    toBe: (expected) => {
      expect(renderResult.result.current).toBe(expected);
      return expectUtil;
    },

    toStrictEqual: (expected) => {
      expect(renderResult.result.current).toStrictEqual(expected);
      return expectUtil;
    },

    toBeStable: (expected = true) => {
      if (renderResult.getUpdateCount() > 1) {
        if (Array.isArray(expected)) {
          expect(renderResult.isStableArray()).toStrictEqual(expected);
        } else {
          expect(renderResult.isStable()).toBe(expected);
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          'expectHook#toBeStable cannot assert stability as the hook has not run at least 2 times.',
        );
      }
      return expectUtil;
    },

    toHaveUpdateCount: (expected) => {
      expect(renderResult.getUpdateCount()).toBe(expected);
      return expectUtil;
    },
  };
  return expectUtil;
};

/**
 * Wrapper on top of RTL `renderHook` returning a result that implements the `RenderHookResultExt` interface.
 *
 * `renderHook` provides full control over the rendering of your hook including the ability to wrap the test component.
 * This is usually used to add context providers from `React.createContext` for the hook to access with `useContext`.
 * `initialProps` and props subsequently set by `rerender` will be provided to the wrapper.
 *
 * ```
 * const renderResult = renderHook(({ who }: { who: string }) => useSayHello(who), { initialProps: { who: 'world' }});
 * expectHook(renderResult).toBe('Hello world!');
 * renderResult.rerender({ who: 'there' });
 * expectHook(renderResult).toBe('Hello there!');
 * ```
 */
export const renderHook = <
  Result,
  Props,
  Q extends Queries = typeof queries,
  Container extends Element | DocumentFragment = HTMLElement,
  BaseElement extends Element | DocumentFragment = Container,
>(
  render: (initialProps: Props) => Result,
  options?: RenderHookOptions<Props, Q, Container, BaseElement>,
): RenderHookResultExt<Result, Props> => {
  let updateCount = 0;
  let prevResult: Result | undefined;
  let currentResult: Result | undefined;

  const renderResult = renderHookRTL((props) => {
    updateCount++;
    prevResult = currentResult;
    currentResult = render(props);
    return currentResult;
  }, options);

  const renderResultExt: RenderHookResultExt<Result, Props> = {
    ...renderResult,

    isStable: () => (updateCount > 1 ? Object.is(renderResult.result.current, prevResult) : false),

    isStableArray: () => {
      // prefill return array with `false`
      const stable: boolean[] = Array(
        Math.max(
          Array.isArray(prevResult) ? prevResult?.length : 0,
          Array.isArray(renderResult.result.current) ? renderResult.result.current.length : 0,
        ),
      ).fill(false);

      if (
        updateCount > 1 &&
        Array.isArray(prevResult) &&
        Array.isArray(renderResult.result.current)
      ) {
        renderResult.result.current.forEach((v, i) => {
          stable[i] = Object.is(v, (prevResult as unknown[])[i]);
        });
      }
      return stable;
    },

    getUpdateCount: () => updateCount,

    waitForNextUpdate: async (options) => {
      const expected = updateCount;
      try {
        await waitFor(() => expect(updateCount).toBeGreaterThan(expected), options);
      } catch {
        throw new Error('waitForNextUpdate timed out');
      }
    },
  };

  return renderResultExt;
};

/**
 * Lightweight API for testing a single hook.
 *
 * Prefer this method of testing over `renderHook` for simplicity.
 *
 * ```
 * const renderResult = testHook(useSayHello, 'world');
 * expectHook(renderResult).toBe('Hello world!');
 * renderResult.rerender('there');
 * expectHook(renderResult).toBe('Hello there!');
 * ```
 */

export const testHook = <Result, Hook extends (...params: P) => Result, P extends unknown[]>(
  hook: (...params: P) => Result,
  ...initialParams: Parameters<Hook>
) => {
  type Params = Parameters<Hook>;
  const renderResult = renderHook(({ $params }: { $params: Params }) => hook(...$params), {
    initialProps: {
      $params: initialParams,
    },
  });

  return {
    ...renderResult,

    rerender: (...params: Params) => renderResult.rerender({ $params: params }),
  };
};

/**
 * A helper function for asserting the return value of hooks based on `useFetchState`.
 *
 * eg.
 * ```
 * expectHook(renderResult).isStrictEqual(standardUseFetchState('test value', true))
 * ```
 * is equivalent to:
 * ```
 * expectHook(renderResult).isStrictEqual(['test value', true, undefined, expect.any(Function)])
 * ```
 */
export const standardUseFetchState = <D>(
  data: D,
  loaded = false,
  error?: Error,
): [
  data: D,
  loaded: boolean,
  loadError: Error | undefined,
  refresh: () => Promise<D | undefined>,
] => [data, loaded, error, expect.any(Function)];
