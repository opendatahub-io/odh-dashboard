import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { type APIKeyListResponse, type APIKeySearchRequest } from '~/app/types/api-key';
import { searchApiKeys, searchTenantApiKeys } from '~/app/api/api-keys';
import { useGridFeatureFlag } from '~/app/utilities/gridFeatureFlag';

export const useFetchApiKeys = (
  searchRequest: APIKeySearchRequest,
): FetchState<APIKeyListResponse> => {
  const isGridEnabled = useGridFeatureFlag();
  const callback = React.useCallback<FetchStateCallbackPromise<APIKeyListResponse>>(
    (opts: APIOptions) =>
      (isGridEnabled ? searchTenantApiKeys() : searchApiKeys())(opts, searchRequest),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(searchRequest), isGridEnabled],
  );

  return useFetchState<APIKeyListResponse>(
    callback,
    { object: 'list', data: [], has_more: false }, // eslint-disable-line camelcase
    { refreshRate: POLL_INTERVAL },
  );
};
