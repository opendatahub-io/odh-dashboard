import React from 'react';
import { FetchState, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import { ServingRuntimeFilterOptionsList } from '~/odh/types/servingRuntimeCatalogTypes';
import { useServingRuntimeCatalogAPI } from './useServingRuntimeCatalogAPI';

export const useServingRuntimeFilterOptionList =
  (): FetchState<ServingRuntimeFilterOptionsList | null> => {
    const { api, apiAvailable } = useServingRuntimeCatalogAPI();
    const call = React.useCallback<
      FetchStateCallbackPromise<ServingRuntimeFilterOptionsList | null>
    >(
      (opts) => {
        if (!apiAvailable) {
          return Promise.reject(new NotReadyError('Serving runtime catalog API not yet available'));
        }
        return api.getServingRuntimeFilterOptionList(opts);
      },
      [api, apiAvailable],
    );
    return useFetchState(call, null, { initialPromisePurity: true });
  };
