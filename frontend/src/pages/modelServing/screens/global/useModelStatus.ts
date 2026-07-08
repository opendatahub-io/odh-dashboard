import * as React from 'react';
import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getPodsForKserve } from '#~/api';
import { ModelStatus } from '#~/pages/modelServing/screens/types';
import { checkModelPodStatus } from '#~/concepts/modelServingKServe/kserveStatusUtils';

export const useModelStatus = (namespace: string, name: string): FetchState<ModelStatus | null> => {
  const fetchSecret = React.useCallback<() => Promise<ModelStatus | null>>(() => {
    return getPodsForKserve(namespace, name)
      .then((model) => checkModelPodStatus(model[0]))
      .catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error(`Pod ${name} not found`);
        }
        throw e;
      });
  }, [namespace, name]);
  return useFetchState<ModelStatus | null>(fetchSecret, null);
};
