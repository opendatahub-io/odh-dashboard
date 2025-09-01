import { renderHook as renderHookRTL, RenderHookOptions, waitFor } from '@testing-library/react';
import { queries, Queries } from '@testing-library/dom';
import type { BooleanValues, RenderHookResultExt } from '../types';

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
  let prevResult: Result;
  let currentResult: Result;

  const renderResult = renderHookRTL((props) => {
    updateCount++;
    prevResult = currentResult;
    currentResult = render(props);
    return currentResult;
  }, options);

  const renderResultExt: RenderHookResultExt<Result, Props> = {
    ...renderResult,
    getPreviousResult: () => (updateCount > 1 ? prevResult : renderResult.result.current),
    getUpdateCount: () => updateCount,
    waitForNextUpdate: async (currentOptions) => {
      const expected = updateCount;
      try {
        await waitFor(() => expect(updateCount).toBeGreaterThan(expected), currentOptions);
      } catch {
        throw new Error('waitForNextUpdate timed out');
      }
    },
  };

  return renderResultExt;
};

export const testHook =
  <Result, P extends unknown[]>(hook: (...params: P) => Result) =>
  (
    ...initialParams: P
  ): Omit<RenderHookResultExt<Result, { $params: typeof initialParams }>, 'rerender'> & {
    rerender: (...params: typeof initialParams) => void;
  } => {
    const renderResult = renderHook<Result, { $params: typeof initialParams }>(
      ({ $params }) => hook(...$params),
      { initialProps: { $params: initialParams } },
    );

    return { ...renderResult, rerender: (...params) => renderResult.rerender({ $params: params }) };
  };

const everything = () => expect.anything();

const identityEqual = (value: unknown) => ({
  asymmetricMatch: (other: unknown) => Object.is(other, value),
});

export const createComparativeValue = <T>(source: T, booleanTarget: BooleanValues<T>): unknown =>
  createComparativeValueRecursive(source, booleanTarget);

type PrimitiveOrFn = boolean | string | number | ((...args: unknown[]) => unknown);

const createComparativeValueRecursive = <T>(
  source: unknown,
  booleanTarget: PrimitiveOrFn | BooleanValues<T>,
) => {
  if (typeof booleanTarget === 'boolean') {
    return booleanTarget ? identityEqual(source) : everything();
  }
  if (Array.isArray(booleanTarget)) {
    if (Array.isArray(source)) {
      const r = new Array(source.length).fill(everything());
      booleanTarget.forEach((b, i) => {
        if (b != null) {
          r[i] = createComparativeValueRecursive(source[i], b);
        }
      });
      return r;
    }
    return undefined;
  }
  if (
    source == null ||
    typeof source === 'string' ||
    typeof source === 'number' ||
    typeof source === 'function'
  ) {
    return source;
  }
  const obj: { [k: string]: unknown } = {};
  if (booleanTarget) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const btObj = booleanTarget as { [k: string]: unknown };
    Object.keys(btObj).forEach((key) => {
      obj[key] = createComparativeValueRecursive(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
        (source as any)[key] as unknown,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
        btObj[key] as any,
      );
    });
  }
  return expect.objectContaining(obj);
};

type LocalFetchRefresh<D> = (...args: unknown[]) => Promise<D | undefined>;
export type LocalFetchState<D> = [D, boolean, Error | undefined, LocalFetchRefresh<D>];
export type LocalFetchStateObject<D, E = Error> = {
  data: D;
  loaded: boolean;
  error?: E;
  refresh: LocalFetchRefresh<D>;
};

export const standardUseFetchState = <D>(
  data: D,
  loaded = false,
  error?: Error,
): LocalFetchState<D> => {
  const refresh: LocalFetchRefresh<D> = async () => undefined;
  return [data, loaded, error, refresh];
};

export const standardUseFetchStateObject = <D>(args: {
  data: D;
  loaded?: boolean;
  error?: Error;
}): LocalFetchStateObject<D> => {
  const refresh: LocalFetchRefresh<D> = async () => undefined;
  return {
    data: args.data,
    loaded: args.loaded ?? false,
    error: args.error,
    refresh,
  };
};
