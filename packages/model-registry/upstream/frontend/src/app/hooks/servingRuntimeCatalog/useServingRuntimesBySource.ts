import React from 'react';
import {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
  useFetchState,
  useDeepCompareMemoize,
} from 'mod-arch-core';
import { ServingRuntimeList, ServingRuntimeListParams } from '~/app/servingRuntimeCatalogTypes';
import { useServingRuntimeCatalogAPI } from './useServingRuntimeCatalogAPI';

export const useServingRuntimesBySource = (
  params: ServingRuntimeListParams = {},
): FetchState<ServingRuntimeList> => {
  const { api, apiAvailable } = useServingRuntimeCatalogAPI();
  const stableParams = useDeepCompareMemoize(params);
  const call = React.useCallback<FetchStateCallbackPromise<ServingRuntimeList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('Serving runtime catalog API not yet available'));
      }
      return api.getServingRuntimeList(opts, stableParams);
    },
    [api, apiAvailable, stableParams],
  );
  return useFetchState(
    call,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};
