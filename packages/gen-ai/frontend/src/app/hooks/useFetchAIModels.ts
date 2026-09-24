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

const hasStr = (obj: object, key: string): boolean =>
  key in obj && typeof Reflect.get(obj, key) === 'string';

const REQUIRED_STRING_FIELDS = [
  'model_name',
  'model_id',
  'serving_runtime',
  'api_protocol',
  'version',
  'usecase',
  'description',
  'status',
  'display_name',
  'model_source_type',
];

const VALID_SOURCE_TYPES: ReadonlySet<string> = new Set(['namespace', 'custom_endpoint', 'maas']);

const EMPTY_CLUSTER_DOMAINS: string[] = [];
const EMPTY_QUERY_PARAMS: Record<string, string> = {};
const MAAS_QUERY_PARAMS: Record<string, string> = {
  sources: 'namespace,custom_endpoint,maas',
};

export const isValidAAModel = (item: unknown): item is AAModelResponse =>
  item != null &&
  typeof item === 'object' &&
  REQUIRED_STRING_FIELDS.every((f) => hasStr(item, f)) &&
  VALID_SOURCE_TYPES.has(Reflect.get(item, 'model_source_type')) &&
  'endpoints' in item &&
  Array.isArray(item.endpoints) &&
  item.endpoints.every((e: unknown) => typeof e === 'string');

const useFetchAIModels = (): FetchStateObject<AIModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();
  const maaSEnabled = !!useAiAssetModelAsServiceEnabled();
  const genAiConfig = useGenAiDashboardConfig();
  const clusterDomains = React.useMemo(
    () => genAiConfig?.aiAssetCustomEndpoints?.clusterDomains ?? EMPTY_CLUSTER_DOMAINS,
    [genAiConfig],
  );

  const queryParams = maaSEnabled ? MAAS_QUERY_PARAMS : EMPTY_QUERY_PARAMS;

  const fetchAIModels = React.useCallback<FetchStateCallbackPromise<AIModel[]>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }

      const rawData = await api.getAAModels(queryParams, opts);
      if (!Array.isArray(rawData)) {
        throw new Error('Invalid response from getAAModels: expected an array');
      }
      const models = rawData.filter(isValidAAModel);

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
