import React from 'react';
import { getConfigMap, isK8sStatus } from '~/api';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import { useIsAreaAvailable } from '~/concepts/areas';
import { SupportedArea } from '~/concepts/areas/types';
import useFetchState, { NotReadyError, FetchState } from '~/utilities/useFetchState';
import { ModelCatalogSource, ModelCatalogSourcesObject } from './types';
import { MODEL_CATALOG_SOURCES_CONFIGMAP } from './const';

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
      const configMap = await getConfigMap(dashboardNamespace, MODEL_CATALOG_SOURCES_CONFIGMAP);
      if (!configMap.data || !configMap.data.modelCatalogSources) {
        return [];
      }

      const parsed: ModelCatalogSourcesObject | undefined = JSON.parse(
        configMap.data.modelCatalogSources,
      );
      return parsed ? parsed.sources : [];
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
