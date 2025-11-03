import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import { MaaSModel } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchMaaSModels = (): FetchStateObject<MaaSModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const fetchMaaSModels = React.useCallback<FetchStateCallbackPromise<MaaSModel[]>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return api.getMaaSModels(opts).then((r) => r);
    },
    [api, apiAvailable],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchMaaSModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchMaaSModels;
