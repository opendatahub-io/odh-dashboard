import React from 'react';
import { getConfigMap, isK8sStatus } from '~/api';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import { useIsAreaAvailable } from '~/concepts/areas';
import { SupportedArea } from '~/concepts/areas/types';
import useFetchState, { NotReadyError, FetchState } from '~/utilities/useFetchState';
import { ModelCatalogSource } from './types';
import { MODEL_CATALOG_SOURCE_CONFIGMAP } from './const';

type State = ModelCatalogSource[];

const REDHAT_CONFIGMAP = MODEL_CATALOG_SOURCE_CONFIGMAP;
const THIRD_PARTY_CONFIGMAP = 'model-catalog-source-thirdparty';

const isK8sNotFoundError = (e: unknown): boolean =>
  typeof e === 'object' &&
  e != null &&
  'statusObject' in e &&
  isK8sStatus(e.statusObject) &&
  e.statusObject.code === 404;

const fetchConfigMap = async (
  namespace: string,
  name: string,
): Promise<ModelCatalogSource | null> => {
  try {
    const configMap = await getConfigMap(namespace, name);
    if (!configMap.data?.modelCatalogSource) {
      return null;
    }
    return JSON.parse(configMap.data.modelCatalogSource);
  } catch (e: unknown) {
    if (isK8sNotFoundError(e)) {
      return null;
    }
    throw e;
  }
};

export const useModelCatalogSources = (): FetchState<State> => {
  const { dashboardNamespace } = useNamespaces();
  const isModelCatalogAvailable = useIsAreaAvailable(SupportedArea.MODEL_CATALOG).status;

  const callback = React.useCallback(async () => {
    if (!isModelCatalogAvailable) {
      throw new NotReadyError('Model catalog feature is not enabled');
    }

    const [redhatSource, thirdPartySource] = await Promise.all([
      fetchConfigMap(dashboardNamespace, REDHAT_CONFIGMAP),
      fetchConfigMap(dashboardNamespace, THIRD_PARTY_CONFIGMAP),
    ]);

    return [redhatSource, thirdPartySource].filter(
      (source): source is ModelCatalogSource => source !== null,
    );
  }, [dashboardNamespace, isModelCatalogAvailable]);

  return useFetchState<State>(callback, []);
};

export default useModelCatalogSources;
