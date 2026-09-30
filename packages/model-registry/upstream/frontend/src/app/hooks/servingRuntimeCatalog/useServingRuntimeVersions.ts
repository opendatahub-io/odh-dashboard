import React from 'react';
import {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
  useFetchState,
  useDeepCompareMemoize,
} from 'mod-arch-core';
import {
  ServingRuntimeVersionList,
  ServingRuntimeVersionListParams,
} from '~/app/servingRuntimeCatalogTypes';
import { useServingRuntimeCatalogAPI } from './useServingRuntimeCatalogAPI';

export const useServingRuntimeVersions = (
  runtimeId: string,
  params: ServingRuntimeVersionListParams = {},
): FetchState<ServingRuntimeVersionList> => {
  const { api, apiAvailable } = useServingRuntimeCatalogAPI();
  const stableParams = useDeepCompareMemoize(params);
  const call = React.useCallback<FetchStateCallbackPromise<ServingRuntimeVersionList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('Serving runtime catalog API not yet available'));
      }
      if (!runtimeId) {
        return Promise.reject(new NotReadyError('No serving runtime id'));
      }
      return api.getServingRuntimeVersions(opts, runtimeId, stableParams);
    },
    [api, apiAvailable, runtimeId, stableParams],
  );
  return useFetchState(
    call,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};
