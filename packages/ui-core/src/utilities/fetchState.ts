import type { FetchStateObject } from '../hooks/useFetch';

export const DEFAULT_LIST_FETCH_STATE: FetchStateObject<never[]> = {
  data: [],
  loaded: false,
  refresh: () => Promise.resolve(undefined),
};
