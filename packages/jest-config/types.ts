import type { RenderHookResult, waitForOptions } from '@testing-library/react';

export type BooleanValues<T> = T extends
  | boolean
  | number
  | string
  | null
  | undefined
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Function
  ? boolean | undefined
  : boolean | undefined | { [K in keyof T]?: BooleanValues<T[K]> };

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
