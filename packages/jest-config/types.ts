import type { RenderHookResult, waitForOptions } from '@testing-library/react';

type SafeFn = (...args: unknown[]) => unknown;

export type BooleanValues<T> = T extends boolean | number | string | null | undefined | SafeFn
  ? boolean | undefined
  : boolean | undefined | { [K in keyof T]?: BooleanValues<T[K]> };

export type RenderHookResultExt<Result, Props> = RenderHookResult<Result, Props> & {
  getPreviousResult: () => Result;
  getUpdateCount: () => number;
  waitForNextUpdate: (options?: Pick<waitForOptions, 'interval' | 'timeout'>) => Promise<void>;
};
