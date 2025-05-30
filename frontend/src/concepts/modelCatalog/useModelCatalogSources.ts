import React from 'react';
import { getConfigMap, isK8sStatus } from '#~/api';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { useIsAreaAvailable } from '#~/concepts/areas';
import { SupportedArea } from '#~/concepts/areas/types';
import { allSettledPromises } from '#~/utilities/allSettledPromises';
import useFetchState, { NotReadyError, FetchState } from '#~/utilities/useFetchState';
import { ModelCatalogSource, ModelCatalogSourcesObject } from './types';
import {
  MODEL_CATALOG_SOURCES_CONFIGMAP,
  MODEL_CATALOG_UNMANAGED_SOURCES_CONFIGMAP,
} from './const';

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

    const [successes, fails] = await allSettledPromises([
      getConfigMap(dashboardNamespace, MODEL_CATALOG_SOURCES_CONFIGMAP),
      getConfigMap(dashboardNamespace, MODEL_CATALOG_UNMANAGED_SOURCES_CONFIGMAP),
    ]);

    for (const fail of fails) {
      if (!isK8sNotFoundError(fail.reason)) {
        throw fail.reason;
      }
    }

    const sources: ModelCatalogSource[] = successes.flatMap((success) => {
      const { data } = success.value;
      if (!data || typeof data.modelCatalogSources !== 'string') {
        return [];
      }

      const parsed: ModelCatalogSourcesObject | undefined = JSON.parse(data.modelCatalogSources);
      return parsed ? parsed.sources : [];
    });

    return sources;
  }, [dashboardNamespace, isModelCatalogAvailable]);

  return useFetchState<State>(callback, []);
};

export default useModelCatalogSources;
