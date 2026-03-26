import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { type APIKeyListResponse, type APIKeySearchRequest } from '../types/api-key';
import { searchApiKeys } from '../api/api-keys';

export const useFetchApiKeys = (
  searchRequest: APIKeySearchRequest,
): FetchState<APIKeyListResponse> => {
  const callback = React.useCallback<FetchStateCallbackPromise<APIKeyListResponse>>(
    (opts: APIOptions) => searchApiKeys()(opts, searchRequest),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(searchRequest)],
  );

  return useFetchState<APIKeyListResponse>(
    callback,
    { object: 'list', data: [], has_more: false }, // eslint-disable-line camelcase
    { refreshRate: POLL_INTERVAL },
  );
};
