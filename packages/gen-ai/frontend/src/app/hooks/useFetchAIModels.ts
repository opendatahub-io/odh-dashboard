import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import { AAModelResponse, AIModel } from '~/app/types';
import { parseEndpointByPrefix, isClusterLocalURL } from '~/app/utilities/utils';
import { useGenAiAPI } from './useGenAiAPI';
import useGenAiDashboardConfig from './useGenAiDashboardConfig';

const useFetchAIModels = (): FetchStateObject<AIModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const genAiConfig = useGenAiDashboardConfig();
  const clusterDomains = React.useMemo(
    () => genAiConfig?.aiAssetCustomEndpoints?.clusterDomains ?? [],
    [genAiConfig],
  );

  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }

      const rawData = await api.getAAModels(opts);
      const models = Array.isArray(rawData) ? rawData : [];

      return models.map((item: AAModelResponse) => {
        // For custom_endpoint models, compute internal/external based on URL
        if (item.model_source_type === 'custom_endpoint' && item.endpoints.length > 0) {
          const url = item.endpoints[0];
          const isInternal = isClusterLocalURL(url, clusterDomains);
          return {
            ...item,
            internalEndpoint: isInternal ? url : undefined,
            externalEndpoint: !isInternal ? url : undefined,
          };
        }

        // For namespace models, parse the prefixed endpoints
        return {
          ...item,
          internalEndpoint: parseEndpointByPrefix(item.endpoints, 'internal'),
          externalEndpoint: parseEndpointByPrefix(item.endpoints, 'external'),
        };
      });
    },
    [api, apiAvailable, clusterDomains],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchAIModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchAIModels;
