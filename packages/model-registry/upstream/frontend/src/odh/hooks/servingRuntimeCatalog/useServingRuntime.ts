import React from 'react';
import { FetchState, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
import { useServingRuntimeCatalogAPI } from './useServingRuntimeCatalogAPI';

export const useServingRuntime = (runtimeId: string): FetchState<ServingRuntime | null> => {
  const { api, apiAvailable } = useServingRuntimeCatalogAPI();
  const call = React.useCallback<FetchStateCallbackPromise<ServingRuntime | null>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('Serving runtime catalog API not yet available'));
      }
      if (!runtimeId) {
        return Promise.reject(new NotReadyError('No serving runtime id'));
      }
      return api.getServingRuntime(opts, runtimeId);
    },
    [api, apiAvailable, runtimeId],
  );
  return useFetchState(call, null, { initialPromisePurity: true });
};
