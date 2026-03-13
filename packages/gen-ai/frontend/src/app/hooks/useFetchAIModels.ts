import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import { AAModelResponse, AIModel } from '~/app/types';
import { parseEndpointByPrefix } from '~/app/utilities/utils';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchAIModels = (): FetchStateObject<AIModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }

      const rawData = await api.getAAModels(opts);
      const models = Array.isArray(rawData) ? rawData : [];

      return models.map((item: AAModelResponse) => ({
        ...item,
        internalEndpoint: parseEndpointByPrefix(item.endpoints, 'internal'),
        externalEndpoint: parseEndpointByPrefix(item.endpoints, 'external'),
        modelSource: item.model_source_type || 'namespace',
      }));
    },
    [api, apiAvailable],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchAIModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchAIModels;
