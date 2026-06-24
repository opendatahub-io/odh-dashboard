import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import { AAModelResponse } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';
import useAiAssetModelAsServiceEnabled from './useAiAssetModelAsServiceEnabled';

const useFetchMaaSModels = (): FetchStateObject<AAModelResponse[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const maaSEnabled = useAiAssetModelAsServiceEnabled();

  const fetchMaaSModels = React.useCallback<FetchStateCallbackPromise<AAModelResponse[]>>(
    async (opts: APIOptions) => {
      if (!maaSEnabled) {
        return [];
      }
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }

      const rawData = await api.getAAModels({ sources: 'maas' }, opts);
      return Array.isArray(rawData) ? rawData : [];
    },
    [api, apiAvailable, maaSEnabled],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchMaaSModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchMaaSModels;
