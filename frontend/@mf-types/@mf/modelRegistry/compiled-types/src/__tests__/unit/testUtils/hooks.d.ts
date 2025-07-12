import { RenderHookOptions, RenderHookResult, waitForOptions } from '@testing-library/react';
import { queries, Queries } from '@testing-library/dom';
export type BooleanValues<T> = T extends boolean | number | null | undefined | Function ? boolean | undefined : boolean | undefined | {
    [K in keyof T]?: BooleanValues<T[K]>;
};
/**
 * Extension of RTL RenderHookResult providing functions used query the current state of the result.
 */
export type RenderHookResultExt<Result, Props> = RenderHookResult<Result, Props> & {
    /**
     * Returns the previous result.
     */
    getPreviousResult: () => Result;
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
 * Wrapper on top of RTL `renderHook` returning a result that implements the `RenderHookResultExt` interface.
 *
 * `renderHook` provides full control over the rendering of your hook including the ability to wrap the test component.
 * This is usually used to add context providers from `React.createContext` for the hook to access with `useContext`.
 * `initialProps` and props subsequently set by `rerender` will be provided to the wrapper.
 *
 * ```
 * const renderResult = renderHook(({ who }: { who: string }) => useSayHello(who), { initialProps: { who: 'world' }});
 * expect(renderResult).hookToBe('Hello world!');
 * renderResult.rerender({ who: 'there' });
 * expect(renderResult).hookToBe('Hello there!');
 * ```
 */
export declare const renderHook: <Result, Props, Q extends Queries = typeof queries, Container extends Element | DocumentFragment = HTMLElement, BaseElement extends Element | DocumentFragment = Container>(render: (initialProps: Props) => Result, options?: RenderHookOptions<Props, Q, Container, BaseElement>) => RenderHookResultExt<Result, Props>;
/**
 * Lightweight API for testing a single hook.
 *
 * Prefer this method of testing over `renderHook` for simplicity.
 *
 * ```
 * const renderResult = testHook(useSayHello)('world');
 * expectHook(renderResult).toBe('Hello world!');
 * renderResult.rerender('there');
 * expectHook(renderResult).toBe('Hello there!');
 * ```
 */
export declare const testHook: <Result, P extends unknown[]>(hook: (...params: P) => Result) => (...initialParams: P) => Omit<RenderHookResultExt<Result, {
    $params: typeof initialParams;
}>, "rerender"> & {
    rerender: (...params: typeof initialParams) => void;
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
export declare const standardUseFetchState: <D>(data: D, loaded?: boolean, error?: Error) => [data: D, loaded: boolean, loadError: Error | undefined, refresh: () => Promise<D | undefined>];
/**
 * Extracts a subset of values from the source that can be used to compare equality.
 *
 * Recursively traverses the `booleanTarget`. For every property or array index equal to `true`,
 * adds the value of the source to the result wrapped in custom matcher `expect.isIdentityEqual`.
 * If the entry is `false` or `undefined`, add an everything matcher to the result.
 */
export declare const createComparativeValue: <T>(source: T, booleanTarget: BooleanValues<T>) => unknown;
