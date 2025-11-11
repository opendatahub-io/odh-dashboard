import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import { AAModelResponse, AIModel } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchAIModels = (): FetchStateObject<AIModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }

      const rawData = await api.getAAModels(opts);

      return rawData.map((item: AAModelResponse) => {
        // Parse endpoints into usable format
        const internalEndpoint = item.endpoints
          .find((endpoint) => endpoint.startsWith('internal:'))
          ?.replace('internal:', '')
          .trim();
        const externalEndpoint = item.endpoints
          .find((endpoint) => endpoint.startsWith('external:'))
          ?.replace('external:', '')
          .trim();

        return {
          ...item,
          internalEndpoint,
          externalEndpoint,
        };
      });
    },
    [api, apiAvailable],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchAIModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchAIModels;
