import * as React from 'react';
import { getPodsForKserve, getPodsForModelMesh } from '#~/api';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';
import { ModelStatus } from '#~/pages/modelServing/screens/types';
import { checkModelStatus } from '#~/concepts/modelServingKServe/kserveStatusUtils';

export const useModelStatus = (
  namespace: string,
  name: string,
  isKserve: boolean,
): FetchState<ModelStatus | null> => {
  const fetchSecret = React.useCallback<() => Promise<ModelStatus | null>>(() => {
    const fetchFunction = isKserve ? getPodsForKserve : getPodsForModelMesh;
    return fetchFunction(namespace, name)
      .then((model) => checkModelStatus(model[0]))
      .catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error(`Pod ${name} not found`);
        }
        throw e;
      });
  }, [namespace, name, isKserve]);
  return useFetchState<ModelStatus | null>(fetchSecret, null);
};
