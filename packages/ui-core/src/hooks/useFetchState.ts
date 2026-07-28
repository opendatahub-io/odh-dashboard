import React from 'react';
import useFetch, {
  AdHocUpdate,
  FetchOptions,
  FetchStateCallbackPromise,
  FetchStateRefreshPromise,
} from './useFetch';

// This file is a deprecated wrapper and needs to export everything the useFetchState file used to.
// See deprecation comments on useFetchState below.
export {
  NotReadyError,
  isCommonStateError,
  FetchStateRefreshPromise,
  AdHocUpdate,
  FetchStateCallbackPromise,
  FetchStateCallbackPromiseAdHoc,
  FetchOptions,
} from './useFetch';

/**
 * @deprecated Use FetchStateObject from useFetch instead.
 */
export type FetchState<Type> = [
  data: Type,
  loaded: boolean,
  loadError: Error | undefined,
  /** This promise should never throw to the .catch */
  refresh: FetchStateRefreshPromise<Type>,
];

/**
 * @deprecated Use useFetch instead.
 * useFetchState has been renamed to useFetch and changed to return an object instead of an array.
 * This useFetchState is a new deprecated wrapper that matches the old type signature.
 */
const useFetchState = <Type>(
  /** React.useCallback result. */
  fetchCallbackPromise: FetchStateCallbackPromise<Type | AdHocUpdate<Type>>,
  /**
   * A preferred default states - this is ignored after the first render
   * Note: This is only read as initial value; changes do nothing.
   */
  initialDefaultState: Type,
  /** Configurable features */
  { refreshRate = 0, initialPromisePurity = false }: Partial<FetchOptions> = {},
): FetchState<Type> => {
  const { data, loaded, error, refresh } = useFetch(fetchCallbackPromise, initialDefaultState, {
    refreshRate,
    initialPromisePurity,
  });
  return React.useMemo(() => [data, loaded, error, refresh], [data, loaded, error, refresh]);
};

export default useFetchState;
