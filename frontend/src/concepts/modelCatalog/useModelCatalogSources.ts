import React from 'react';
import { getConfigMap } from '~/api';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import { useIsAreaAvailable } from '~/concepts/areas';
import { SupportedArea } from '~/concepts/areas/types';
import useFetchState, { NotReadyError, FetchState } from '~/utilities/useFetchState';
import { ModelCatalogSource } from './types';
import { MODEL_CATALOG_SOURCE_CONFIGMAP } from './const';

type State = ModelCatalogSource[];

// Temporary implementation for MVP - will be replaced with API for remote model catalog sources
// See: https://issues.redhat.com/browse/RHOAISTRAT-455
export const useModelCatalogSources = (): FetchState<State> => {
  const { dashboardNamespace } = useNamespaces();
  const isModelCatalogAvailable = useIsAreaAvailable(SupportedArea.MODEL_CATALOG).status;

  const callback = React.useCallback(async () => {
    if (!isModelCatalogAvailable) {
      throw new NotReadyError('Model catalog feature is not enabled');
    }

    const configMap = await getConfigMap(dashboardNamespace, MODEL_CATALOG_SOURCE_CONFIGMAP);

    if (!configMap.data?.modelCatalogSource) {
      return [];
    }

    try {
      const source: ModelCatalogSource = JSON.parse(configMap.data.modelCatalogSource);
      return [source];
    } catch (e) {
      // Swallow JSON parse errors and return empty array for temporary summit implementation
      return [];
    }
  }, [dashboardNamespace, isModelCatalogAvailable]);

  return useFetchState<State>(callback, []);
};

export default useModelCatalogSources;
