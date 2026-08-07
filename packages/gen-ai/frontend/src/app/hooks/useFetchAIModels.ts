import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import { AAModelResponse, AIModel } from '~/app/types';
import {
  parseEndpointByPrefix,
  isClusterLocalURL,
  convertMaaSModelToAIModel,
} from '~/app/utilities/utils';
import { useGenAiAPI } from './useGenAiAPI';
import useGenAiDashboardConfig from './useGenAiDashboardConfig';
import useAiAssetModelAsServiceEnabled from './useAiAssetModelAsServiceEnabled';

const isValidAAModel = (item: unknown): item is AAModelResponse =>
  item != null &&
  typeof item === 'object' &&
  'model_source_type' in item &&
  typeof item.model_source_type === 'string' &&
  'endpoints' in item &&
  Array.isArray(item.endpoints);

const useFetchAIModels = (): FetchStateObject<AIModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const maaSEnabled = useAiAssetModelAsServiceEnabled();
  const genAiConfig = useGenAiDashboardConfig();
  const clusterDomains = React.useMemo(
    () => genAiConfig?.aiAssetCustomEndpoints?.clusterDomains ?? [],
    [genAiConfig],
  );

  const queryParams = React.useMemo(
    () => (maaSEnabled ? { sources: 'namespace,custom_endpoint,maas' } : {}),
    [maaSEnabled],
  );

  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }

      const rawData = await api.getAAModels(queryParams, opts);
      const models = (Array.isArray(rawData) ? rawData : []).filter(isValidAAModel);

      return models.map((item) => {
        if (item.model_source_type === 'maas') {
          return convertMaaSModelToAIModel(item);
        }

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
    [api, apiAvailable, clusterDomains, queryParams],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchAIModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchAIModels;
