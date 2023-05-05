import * as React from 'react';
import { getInferenceServiceContext } from '~/api';
import { InferenceServiceKind } from '~/k8sTypes';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

const useInferenceServices = (namespace?: string): FetchState<InferenceServiceKind[]> => {
  const modelServingEnabled = useModelServingEnabled();

  const getServingInferences = React.useCallback(() => {
    if (!modelServingEnabled) {
      return Promise.reject(new NotReadyError('Model serving is not enabled'));
    }

    return getInferenceServiceContext(namespace, LABEL_SELECTOR_DASHBOARD_RESOURCE);
  }, [namespace, modelServingEnabled]);

  return useFetchState<InferenceServiceKind[]>(getServingInferences, []);
};

export default useInferenceServices;
