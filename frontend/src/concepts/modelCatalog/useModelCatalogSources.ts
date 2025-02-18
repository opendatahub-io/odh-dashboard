import React from 'react';
import { getConfigMap } from '~/api';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import { useIsAreaAvailable } from '~/concepts/areas';
import { SupportedArea } from '~/concepts/areas/types';
import useFetchState, { NotReadyError, FetchState } from '~/utilities/useFetchState';
import { ModelCatalogSource } from './types';
import { MODEL_CATALOG_SOURCE_CONFIGMAP } from './const';

type State = ModelCatalogSource[];

interface ApiResponse {
  status: number;
}

interface ApiError {
  response: ApiResponse;
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/consistent-type-assertions */
function isObject<T>(value: unknown): value is Record<string, T> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (!isObject<unknown>(value)) {
    return false;
  }
  const obj = value;
  return 'status' in obj && typeof obj.status === 'number';
}

function isApiError(error: unknown): error is ApiError {
  if (!isObject<unknown>(error)) {
    return false;
  }
  const obj = error;
  return 'response' in obj && isApiResponse(obj.response);
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/consistent-type-assertions */

// Temporary implementation for MVP - will be replaced with API for remote model catalog sources
// See: https://issues.redhat.com/browse/RHOAISTRAT-455
export const useModelCatalogSources = (): FetchState<State> => {
  const { dashboardNamespace } = useNamespaces();
  const isModelCatalogAvailable = useIsAreaAvailable(SupportedArea.MODEL_CATALOG).status;

  const callback = React.useCallback(async () => {
    if (!isModelCatalogAvailable) {
      throw new NotReadyError('Model catalog feature is not enabled');
    }

    try {
      const configMap = await getConfigMap(dashboardNamespace, MODEL_CATALOG_SOURCE_CONFIGMAP);
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */

      if (!configMap.data || !configMap.data.modelCatalogSource) {
        return [];
      }

      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const source = JSON.parse(configMap.data.modelCatalogSource) as ModelCatalogSource;
        return [source];
      } catch (e) {
        // Swallow JSON parse errors and return empty array
        return [];
      }
    } catch (e: unknown) {
      // Check if error is a 404
      if (isApiError(e) && e.response.status === 404) {
        return [];
      }
      // Re-throw other errors
      throw e;
    }
  }, [dashboardNamespace, isModelCatalogAvailable]);

  return useFetchState<State>(callback, []);
};

export default useModelCatalogSources;
