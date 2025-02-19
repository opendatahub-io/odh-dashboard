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
      if (
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        'statusObject' in (e as object) &&
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        isK8sStatus((e as { statusObject: unknown }).statusObject)
      ) {
        return [];
      }
      // Re-throw other errors
      throw e;
    }
  }, [dashboardNamespace, isModelCatalogAvailable]);

  return useFetchState<State>(callback, []);
};

export default useModelCatalogSources;
