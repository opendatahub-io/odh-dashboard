import React from 'react';
import { getConfigMap, isK8sStatus } from '~/api';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import { useIsAreaAvailable } from '~/concepts/areas';
import { SupportedArea } from '~/concepts/areas/types';
import useFetchState, { NotReadyError, FetchState } from '~/utilities/useFetchState';
import { ModelCatalogSource } from './types';
import { MODEL_CATALOG_SOURCE_CONFIGMAP } from './const';

type State = ModelCatalogSource[];

// Temporary implementation for MVP - will be replaced with API for remote model catalog sources
// See: https://issues.redhat.com/browse/RHOAISTRAT-455

const isModelCatalogSource = (obj: unknown): obj is ModelCatalogSource =>
  typeof obj === 'object' && obj !== null; // Add more specific checks based on ModelCatalogSource type

export const useModelCatalogSources = (): FetchState<State> => {
  const { dashboardNamespace } = useNamespaces();
  const isModelCatalogAvailable = useIsAreaAvailable(SupportedArea.MODEL_CATALOG).status;

  const callback = React.useCallback(async () => {
    if (!isModelCatalogAvailable) {
      throw new NotReadyError('Model catalog feature is not enabled');
    }

    try {
      const configMap = await getConfigMap(dashboardNamespace, MODEL_CATALOG_SOURCE_CONFIGMAP);
      if (!configMap.data || !configMap.data.modelCatalogSource) {
        return [];
      }

      try {
        const parsed = JSON.parse(configMap.data.modelCatalogSource);
        if (isModelCatalogSource(parsed)) {
          return [parsed];
        }
        return [];
      } catch (e) {
        // Swallow JSON parse errors and return empty array
        return [];
      }
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e != null &&
        'statusObject' in e &&
        isK8sStatus(e.statusObject)
      ) {
        return [];
      }
      throw e;
    }
  }, [dashboardNamespace, isModelCatalogAvailable]);

  return useFetchState<State>(callback, []);
};

export default useModelCatalogSources;
