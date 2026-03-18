import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { type APIKey } from '../types/api-key';
import { searchApiKeys } from '../api/api-keys';

export const useFetchApiKeys = (): FetchState<APIKey[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<APIKey[]>>(
    (opts: APIOptions) => searchApiKeys()(opts).then((response) => response.data),
    [],
  );

  return useFetchState<APIKey[]>(callback, [], { refreshRate: POLL_INTERVAL });
};
