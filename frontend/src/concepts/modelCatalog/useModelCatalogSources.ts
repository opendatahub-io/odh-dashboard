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

const isK8sNotFoundError = (e: unknown): boolean =>
  typeof e === 'object' &&
  e != null &&
  'statusObject' in e &&
  isK8sStatus(e.statusObject) &&
  e.statusObject.code === 404;

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

      const parsed: ModelCatalogSource | undefined = JSON.parse(configMap.data.modelCatalogSource);
      return parsed ? [parsed] : [];
    } catch (e: unknown) {
      if (isK8sNotFoundError(e)) {
        return [];
      }
      throw e;
    }
  }, [dashboardNamespace, isModelCatalogAvailable]);

  return useFetchState<State>(callback, []);
};

export default useModelCatalogSources;
